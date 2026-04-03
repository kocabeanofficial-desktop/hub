
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anon can read invites by token" ON public.client_invites;
DROP POLICY IF EXISTS "Anon can update invite status" ON public.client_invites;
DROP POLICY IF EXISTS "Authenticated users can manage invites" ON public.client_invites;

-- Anon: read only via edge function (service role). No direct anon read.
-- We remove anon SELECT entirely; the accept-invite flow uses the edge function.

-- Authenticated: can only manage invites they created
CREATE POLICY "Authenticated users can read their own invites"
  ON public.client_invites
  FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Authenticated users can insert invites"
  ON public.client_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Authenticated users can update their own invites"
  ON public.client_invites
  FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Authenticated users can delete their own invites"
  ON public.client_invites
  FOR DELETE
  TO authenticated
  USING (invited_by = auth.uid());
