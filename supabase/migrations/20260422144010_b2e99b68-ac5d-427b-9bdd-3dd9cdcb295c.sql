-- Table for manually uploaded invoice PDFs
CREATE TABLE public.manual_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  amount_due numeric(12,2) NOT NULL,
  customer_name text,
  pdf_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert manual invoices"
ON public.manual_invoices
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can view manual invoices"
ON public.manual_invoices
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX idx_manual_invoices_invoice_number ON public.manual_invoices(invoice_number);
CREATE INDEX idx_manual_invoices_uploaded_by ON public.manual_invoices(uploaded_by);

-- Private storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users upload into a folder named after their auth uid
CREATE POLICY "Authenticated users can upload invoice PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can read invoice PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-pdfs');

CREATE POLICY "Users can delete their own invoice PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoice-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);