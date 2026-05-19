-- Invoice-to-Action Renewal Engine V1
-- Notice + action tracking only. No payment gateway integration.

CREATE TABLE IF NOT EXISTS public.renewal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date,
  invoice_due_date date,
  renewal_date date NOT NULL,
  domain_or_service text NOT NULL,
  invoice_amount numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) DEFAULT 0,
  invoice_file_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paid', 'overdue', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.renewal_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_invoice_id uuid NOT NULL REFERENCES public.renewal_invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_name text NOT NULL,
  amount numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  renewal_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.renewal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_invoice_id uuid NOT NULL REFERENCES public.renewal_invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'dashboard', 'admin_task')),
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  message_subject text,
  message_body text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_renewal_invoices_client_id ON public.renewal_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_invoices_status ON public.renewal_invoices(status);
CREATE INDEX IF NOT EXISTS idx_renewal_invoices_renewal_date ON public.renewal_invoices(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewal_services_invoice_id ON public.renewal_services(renewal_invoice_id);
CREATE INDEX IF NOT EXISTS idx_renewal_actions_invoice_id ON public.renewal_actions(renewal_invoice_id);
CREATE INDEX IF NOT EXISTS idx_renewal_actions_scheduled_date ON public.renewal_actions(scheduled_date);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_invoices'
      AND policyname = 'Admins can manage renewal invoices'
  ) THEN
    CREATE POLICY "Admins can manage renewal invoices"
      ON public.renewal_invoices
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_services'
      AND policyname = 'Admins can manage renewal services'
  ) THEN
    CREATE POLICY "Admins can manage renewal services"
      ON public.renewal_services
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_actions'
      AND policyname = 'Admins can manage renewal actions'
  ) THEN
    CREATE POLICY "Admins can manage renewal actions"
      ON public.renewal_actions
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_invoices'
      AND policyname = 'Clients can read own renewal invoices'
  ) THEN
    CREATE POLICY "Clients can read own renewal invoices"
      ON public.renewal_invoices
      FOR SELECT
      TO authenticated
      USING (
        client_id IN (SELECT id FROM public.clients WHERE email = auth.email())
        OR client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_services'
      AND policyname = 'Clients can read own renewal services'
  ) THEN
    CREATE POLICY "Clients can read own renewal services"
      ON public.renewal_services
      FOR SELECT
      TO authenticated
      USING (
        client_id IN (SELECT id FROM public.clients WHERE email = auth.email())
        OR client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'renewal_actions'
      AND policyname = 'Clients can read own dashboard renewal actions'
  ) THEN
    CREATE POLICY "Clients can read own dashboard renewal actions"
      ON public.renewal_actions
      FOR SELECT
      TO authenticated
      USING (
        channel = 'dashboard'
        AND (
          client_id IN (SELECT id FROM public.clients WHERE email = auth.email())
          OR client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('renewal-invoices', 'renewal-invoices', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins can manage renewal invoice PDFs'
  ) THEN
    CREATE POLICY "Admins can manage renewal invoice PDFs"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (
        bucket_id = 'renewal-invoices'
        AND EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        bucket_id = 'renewal-invoices'
        AND EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;
