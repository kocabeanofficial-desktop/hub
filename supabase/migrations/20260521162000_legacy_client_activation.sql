-- Legacy client activation and linked-account support.
-- Safe/idempotent only: no destructive changes.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_origin text NOT NULL DEFAULT 'new_intake';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS migration_status text NOT NULL DEFAULT 'not_required';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_client_origin_check'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_client_origin_check
      CHECK (client_origin IN ('new_intake', 'legacy_client', 'manual_capture', 'migration', 'referral'));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.services') IS NOT NULL THEN
    WITH service_seed(code, name, category, description, is_active) AS (
      VALUES
        ('legacy_domain_only', 'Legacy Domain Service', 'Legacy Services', 'Existing domain service retained from the pre-KBCC system.', true),
        ('legacy_email_only', 'Legacy Email Service', 'Legacy Services', 'Existing business email service retained from the pre-KBCC system.', true),
        ('legacy_domain_and_email', 'Legacy Domain & Email', 'Legacy Services', 'Existing domain and email service retained from the pre-KBCC system.', true),
        ('legacy_hosting_only', 'Legacy Hosting Service', 'Legacy Services', 'Existing hosting service retained from the pre-KBCC system.', true),
        ('legacy_website_management', 'Legacy Website Management', 'Legacy Services', 'Existing website management service retained from the pre-KBCC system.', true),
        ('legacy_website_hosting_email', 'Legacy Website, Hosting & Email', 'Legacy Services', 'Existing website, hosting and email service retained from the pre-KBCC system.', true),
        ('legacy_other', 'Legacy Service', 'Legacy Services', 'Existing service retained from the pre-KBCC system.', true)
    )
    UPDATE public.services s
    SET
      name = service_seed.name,
      category = service_seed.category,
      description = service_seed.description,
      is_active = service_seed.is_active
    FROM service_seed
    WHERE s.code = service_seed.code;

    WITH service_seed(code, name, category, description, is_active) AS (
      VALUES
        ('legacy_domain_only', 'Legacy Domain Service', 'Legacy Services', 'Existing domain service retained from the pre-KBCC system.', true),
        ('legacy_email_only', 'Legacy Email Service', 'Legacy Services', 'Existing business email service retained from the pre-KBCC system.', true),
        ('legacy_domain_and_email', 'Legacy Domain & Email', 'Legacy Services', 'Existing domain and email service retained from the pre-KBCC system.', true),
        ('legacy_hosting_only', 'Legacy Hosting Service', 'Legacy Services', 'Existing hosting service retained from the pre-KBCC system.', true),
        ('legacy_website_management', 'Legacy Website Management', 'Legacy Services', 'Existing website management service retained from the pre-KBCC system.', true),
        ('legacy_website_hosting_email', 'Legacy Website, Hosting & Email', 'Legacy Services', 'Existing website, hosting and email service retained from the pre-KBCC system.', true),
        ('legacy_other', 'Legacy Service', 'Legacy Services', 'Existing service retained from the pre-KBCC system.', true)
    )
    INSERT INTO public.services (code, name, category, description, is_active)
    SELECT code, name, category, description, is_active
    FROM service_seed
    WHERE NOT EXISTS (
      SELECT 1 FROM public.services s WHERE s.code = service_seed.code
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_migration_status_check'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_migration_status_check
      CHECK (migration_status IN ('not_required', 'needs_activation', 'partially_captured', 'activated'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.client_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  related_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_relationships_no_self_link CHECK (source_client_id <> related_client_id),
  CONSTRAINT client_relationships_relationship_type_check CHECK (
    relationship_type IN (
      'same_owner',
      'billing_contact',
      'referral',
      'managed_by',
      'previous_service_link',
      'sold_business',
      'associated_business',
      'admin_contact',
      'other'
    )
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_relationships_unique_link'
      AND conrelid = 'public.client_relationships'::regclass
  ) THEN
    ALTER TABLE public.client_relationships
      ADD CONSTRAINT client_relationships_unique_link
      UNIQUE (source_client_id, related_client_id, relationship_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_relationships_source_client_id
  ON public.client_relationships(source_client_id);

CREATE INDEX IF NOT EXISTS idx_client_relationships_related_client_id
  ON public.client_relationships(related_client_id);

CREATE TABLE IF NOT EXISTS public.client_history_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'internal',
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_history_notes_client_id
  ON public.client_history_notes(client_id);

ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_relationships'
      AND policyname = 'Admins can manage client relationships'
  ) THEN
    CREATE POLICY "Admins can manage client relationships"
      ON public.client_relationships
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
      AND tablename = 'client_history_notes'
      AND policyname = 'Admins can manage client history notes'
  ) THEN
    CREATE POLICY "Admins can manage client history notes"
      ON public.client_history_notes
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
