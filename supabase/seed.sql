-- Local-only seed data for Koca Bean Hub development.
-- This file creates a local admin login and fake enquiries for UI testing.
-- Do not copy these credentials or records to production.

DO $$
DECLARE
  v_admin_email text := 'local.admin@kocabean.test';
  v_admin_password text := 'LocalAdmin123!';
  v_admin_user_id uuid := '10000000-0000-4000-8000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_admin_user_id
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_user_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      now(),
      now(),
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'Local Admin'),
      false,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      email = v_admin_email,
      encrypted_password = crypt(v_admin_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Local Admin'),
      updated_at = now()
    WHERE id = v_admin_user_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    '10000000-0000-4000-8000-000000000002',
    v_admin_user_id::text,
    v_admin_user_id,
    jsonb_build_object(
      'sub', v_admin_user_id::text,
      'email', v_admin_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE
  SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  INSERT INTO public.admin_users (
    id,
    user_id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    '10000000-0000-4000-8000-000000000003',
    v_admin_user_id,
    v_admin_email,
    'Local Admin',
    'admin',
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = now();
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'intake_submissions'
      AND policyname = 'Admins can read local intake submissions'
  ) THEN
    CREATE POLICY "Admins can read local intake submissions"
      ON public.intake_submissions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'intake_submissions'
      AND policyname = 'Admins can update local intake submissions'
  ) THEN
    CREATE POLICY "Admins can update local intake submissions"
      ON public.intake_submissions
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

INSERT INTO public.intake_submissions (
  id,
  full_name,
  email,
  phone,
  preferred_contact,
  business_name,
  selected_package,
  setup_fee,
  monthly_fee,
  industry,
  business_overview,
  website_goals,
  main_visitor_action,
  pages_needed,
  content_status,
  domain_status,
  existing_domain,
  domain_name,
  mailbox_count,
  requested_email_addresses,
  requested_services,
  source,
  status,
  raw_payload,
  additional_notes,
  created_at,
  updated_at,
  deleted_at,
  deleted_by
) VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'Maya Naidoo',
    'maya.naidoo@example.test',
    '+27 82 555 0101',
    'email',
    'Cape Bloom Studio',
    'smart_website',
    '2450',
    '650',
    'Florist',
    'Local floral studio needing a simple service and gallery website.',
    'Show arrangements, capture wedding enquiries, and list delivery areas.',
    'Submit an enquiry',
    'Home, Services, Gallery, Contact',
    'copy_ready',
    'needs_domain',
    null,
    'capebloomstudio.test',
    null,
    null,
    'website_build',
    'local_seed',
    'new',
    jsonb_build_object('seed', true, 'persona', 'florist'),
    'Fake local seed enquiry for website build testing.',
    now() - interval '5 days',
    now() - interval '5 days',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Sipho Dlamini',
    'sipho.dlamini@example.test',
    '+27 71 555 0102',
    'whatsapp',
    'Dlamini Mobile Mechanics',
    'booking_system',
    '3950',
    '850',
    'Automotive Services',
    'Mobile mechanic business that wants customers to book repair slots.',
    'Let customers request call-outs and pick preferred appointment windows.',
    'Book a service',
    'Home, Booking, Services, Reviews, Contact',
    'needs_help',
    'has_domain',
    'dlaminimobile.test',
    null,
    null,
    null,
    'booking_system',
    'local_seed',
    'contacted',
    jsonb_build_object('seed', true, 'persona', 'mobile_mechanic'),
    'Fake local seed enquiry for booking flow testing.',
    now() - interval '4 days',
    now() - interval '4 days',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Aisha Patel',
    'aisha.patel@example.test',
    '+27 73 555 0103',
    'email',
    'Patel Pantry',
    'ecommerce_build',
    '4950',
    '990',
    'Food Retail',
    'Small batch pantry shop preparing to sell sauces and spice kits online.',
    'Launch a compact online shop with product pages and payment flow.',
    'Buy online',
    'Home, Shop, About, Contact',
    'copy_ready',
    'needs_domain',
    null,
    'patelpantry.test',
    null,
    null,
    'ecommerce_build',
    'local_seed',
    'qualified',
    jsonb_build_object('seed', true, 'persona', 'food_retail'),
    'Fake local seed enquiry for ecommerce testing.',
    now() - interval '3 days',
    now() - interval '3 days',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Lerato Mokoena',
    'lerato.mokoena@example.test',
    '+27 74 555 0104',
    'email',
    'Mokoena Legal Admin',
    'business_email_starter',
    '650',
    '250',
    'Professional Services',
    'Admin consultancy needing branded mailboxes for a new domain.',
    null,
    'Set up business email',
    null,
    'not_required',
    'domain_registered',
    'mokoenalegal.test',
    null,
    '3',
    'hello@mokoenalegal.test, accounts@mokoenalegal.test, lerato@mokoenalegal.test',
    'email_only',
    'local_seed',
    'icebox',
    jsonb_build_object('seed', true, 'persona', 'email_only'),
    'Fake local seed enquiry for email-only testing.',
    now() - interval '2 days',
    now() - interval '2 days',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Noah Jacobs',
    'noah.jacobs@example.test',
    '+27 76 555 0105',
    'phone',
    'DELETE TEST ONLY - Koca Local',
    'general_enquiry',
    null,
    null,
    'Local QA',
    'Safe fake record reserved for local delete/archive button testing only.',
    'Verify archive/delete UI without touching real data.',
    'Test admin workflow',
    null,
    'not_required',
    'not_required',
    null,
    null,
    null,
    null,
    'general_enquiry',
    'local_seed',
    'new',
    jsonb_build_object('seed', true, 'delete_test_only', true),
    'Safe local-only record. Do not use real data here.',
    now() - interval '1 day',
    now() - interval '1 day',
    null,
    null
  )
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  preferred_contact = EXCLUDED.preferred_contact,
  business_name = EXCLUDED.business_name,
  selected_package = EXCLUDED.selected_package,
  setup_fee = EXCLUDED.setup_fee,
  monthly_fee = EXCLUDED.monthly_fee,
  industry = EXCLUDED.industry,
  business_overview = EXCLUDED.business_overview,
  website_goals = EXCLUDED.website_goals,
  main_visitor_action = EXCLUDED.main_visitor_action,
  pages_needed = EXCLUDED.pages_needed,
  content_status = EXCLUDED.content_status,
  domain_status = EXCLUDED.domain_status,
  existing_domain = EXCLUDED.existing_domain,
  domain_name = EXCLUDED.domain_name,
  mailbox_count = EXCLUDED.mailbox_count,
  requested_email_addresses = EXCLUDED.requested_email_addresses,
  requested_services = EXCLUDED.requested_services,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  raw_payload = EXCLUDED.raw_payload,
  additional_notes = EXCLUDED.additional_notes,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  deleted_at = null,
  deleted_by = null;
