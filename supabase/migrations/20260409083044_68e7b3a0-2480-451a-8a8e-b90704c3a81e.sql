
-- Table: support_tickets
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT,
  client_name TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT DEFAULT 'portal',
  description TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert support tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table: whm_quota_checks
CREATE TABLE public.whm_quota_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  usage_percent NUMERIC NOT NULL DEFAULT 0,
  is_over_80 BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  alert_type TEXT DEFAULT 'quota',
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whm_quota_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read whm alerts"
  ON public.whm_quota_checks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert whm alerts"
  ON public.whm_quota_checks FOR INSERT TO authenticated
  WITH CHECK (true);
