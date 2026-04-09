
DROP POLICY "Users can insert their own email requests" ON public.email_settings_requests;
CREATE POLICY "Users can insert their own email requests"
  ON public.email_settings_requests FOR INSERT TO authenticated
  WITH CHECK (requesting_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY "Users can insert their own staff authorizations" ON public.staff_authorizations;
CREATE POLICY "Users can insert their own staff authorizations"
  ON public.staff_authorizations FOR INSERT TO authenticated
  WITH CHECK (owner_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY "Users can insert their own upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Users can insert their own upgrade requests"
  ON public.upgrade_requests FOR INSERT TO authenticated
  WITH CHECK (submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
