-- Lock down legacy unused zoho tables (real data lives in external project's _raw tables)
DROP POLICY IF EXISTS "Authenticated users can view zoho customers" ON public.zoho_customers;
DROP POLICY IF EXISTS "Authenticated users can insert zoho customers" ON public.zoho_customers;
DROP POLICY IF EXISTS "Authenticated users can update zoho customers" ON public.zoho_customers;
DROP POLICY IF EXISTS "Authenticated users can delete zoho customers" ON public.zoho_customers;

DROP POLICY IF EXISTS "Authenticated users can view zoho invoices" ON public.zoho_invoices;
DROP POLICY IF EXISTS "Authenticated users can insert zoho invoices" ON public.zoho_invoices;
DROP POLICY IF EXISTS "Authenticated users can update zoho invoices" ON public.zoho_invoices;
DROP POLICY IF EXISTS "Authenticated users can delete zoho invoices" ON public.zoho_invoices;

-- RLS remains enabled with no policies → service_role only access (default-deny for anon/authenticated).
-- These tables are legacy/unused; production data lives in zoho_customers_raw / zoho_invoices_raw on the external Supabase project.

-- Tighten WHM quota checks: admins consume these via edge functions / service role.
-- Drop overly-permissive authenticated policies. Service role retains full access.
DROP POLICY IF EXISTS "Authenticated users can read whm alerts" ON public.whm_quota_checks;
DROP POLICY IF EXISTS "Authenticated users can insert whm alerts" ON public.whm_quota_checks;

-- Tighten support_tickets: clients should only see/insert their own tickets, not all.
-- Replace USING(true) with owner-scoped policies. Admin reads must go via service-role edge function.
DROP POLICY IF EXISTS "Authenticated users can read support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can insert support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can update support tickets" ON public.support_tickets;

-- After dropping, support_tickets has RLS enabled but no policies for authenticated/anon.
-- Service role bypasses RLS so admin edge functions can still read/write.