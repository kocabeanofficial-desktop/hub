-- Admin enquiry activation support.
-- Safe/idempotent only: no RLS disabling, no policy drops, no destructive data changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Admins can manage clients'
  ) THEN
    CREATE POLICY "Admins can manage clients"
      ON public.clients
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'Admins can manage projects'
  ) THEN
    CREATE POLICY "Admins can manage projects"
      ON public.projects
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_services'
      AND policyname = 'Admins can manage client services'
  ) THEN
    CREATE POLICY "Admins can manage client services"
      ON public.client_services
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

INSERT INTO public.services (code, name, category, description, is_active)
VALUES
  ('smart_website', 'Smart Website', 'Websites', 'Smart website package activated from intake.', true),
  ('smart_ecommerce', 'Smart Ecommerce', 'Websites', 'Smart ecommerce package activated from intake.', true),
  ('smart_system', 'Smart System / Advanced Web System', 'Web Systems', 'Smart system package activated from intake.', true),
  ('advanced_web_system', 'Advanced Web System', 'Web Systems', 'Advanced web system package activated from intake.', true),
  ('business_email', 'Business Email', 'Hosting & Email', 'Business email service activated from intake.', true),
  ('business_email_10', 'Business Email 10', 'Hosting & Email', 'Business email package with up to 10 mailboxes.', true),
  ('business_email_30', 'Business Email 30', 'Hosting & Email', 'Business email package with up to 30 mailboxes.', true),
  ('business_email_50', 'Business Email 50', 'Hosting & Email', 'Business email package with up to 50 mailboxes.', true),
  ('email_migration', 'Email Migration & Setup', 'Hosting & Email', 'Email migration and setup service.', true),
  ('email_migration_setup', 'Email Migration & Setup', 'Hosting & Email', 'Email migration and setup package activated from intake.', true),
  ('existing_client_support', 'Existing Client Support', 'Support', 'Support request from an existing client.', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
