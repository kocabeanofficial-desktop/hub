
-- Zoho Customers
CREATE TABLE public.zoho_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zoho_customer_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  currency_code TEXT DEFAULT 'ZAR',
  outstanding_receivable NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zoho_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view zoho customers"
  ON public.zoho_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert zoho customers"
  ON public.zoho_customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update zoho customers"
  ON public.zoho_customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete zoho customers"
  ON public.zoho_customers FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_zoho_customers_email ON public.zoho_customers(email);

-- Zoho Invoices
CREATE TABLE public.zoho_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  zoho_customer_id TEXT,
  customer_name TEXT,
  invoice_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft',
  total NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'ZAR',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zoho_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view zoho invoices"
  ON public.zoho_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert zoho invoices"
  ON public.zoho_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update zoho invoices"
  ON public.zoho_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete zoho invoices"
  ON public.zoho_invoices FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_zoho_invoices_status ON public.zoho_invoices(status);
CREATE INDEX idx_zoho_invoices_due_date ON public.zoho_invoices(due_date);
CREATE INDEX idx_zoho_invoices_customer ON public.zoho_invoices(zoho_customer_id);

-- Updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zoho_customers_updated_at
  BEFORE UPDATE ON public.zoho_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_zoho_invoices_updated_at
  BEFORE UPDATE ON public.zoho_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
