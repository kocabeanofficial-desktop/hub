-- Create reports table for client reporting
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT DEFAULT 'Website Management',
    status TEXT DEFAULT 'published',
    period_start DATE,
    period_end DATE,
    summary TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Clients can view their own reports
CREATE POLICY "Clients can view own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins (authenticated) can manage all reports
CREATE POLICY "Admins can manage reports"
  ON public.reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed demo report for Smartlook Pharmacy
INSERT INTO public.reports (client_id, title, report_type, summary)
VALUES (
    'b486d456-121b-40af-8cc2-016c74a7c26b',
    'Smartlook Website Demo Report',
    'Website Management',
    'Demo report showing how Koca Bean reports will appear in the client dashboard.'
  ) ON CONFLICT DO NOTHING;
