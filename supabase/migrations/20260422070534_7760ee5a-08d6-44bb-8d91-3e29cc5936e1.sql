-- Lock down support_tickets: no client-side access of any kind.
-- All admin reads/writes must be brokered by an edge function using the service role.

-- Drop any pre-existing permissive policies (none expected, but be defensive).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_tickets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_tickets', pol.policyname);
  END LOOP;
END$$;

-- Make sure RLS is on.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

-- Explicit deny for anon and authenticated roles. Service role bypasses RLS.
CREATE POLICY "Deny anon access to support_tickets"
  ON public.support_tickets
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
