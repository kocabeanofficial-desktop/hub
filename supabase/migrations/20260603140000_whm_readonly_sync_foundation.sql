-- Phase 1 WHM/cPanel read-only sync foundation.
-- No WHM secrets are stored here. Writes are intended to happen through
-- service-role Edge Functions only; authenticated users get admin read-only access.

CREATE TABLE IF NOT EXISTS public.whm_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  base_url_alias text,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whm_servers_label
  ON public.whm_servers(label);

CREATE TABLE IF NOT EXISTS public.whm_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.whm_servers(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  accounts_seen integer NOT NULL DEFAULT 0,
  domains_seen integer NOT NULL DEFAULT 0,
  matched_accounts integer NOT NULL DEFAULT 0,
  unmatched_accounts integer NOT NULL DEFAULT 0,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.whm_servers(id),
  sync_run_id uuid REFERENCES public.whm_sync_runs(id),
  whm_user text NOT NULL,
  primary_domain text,
  owner text,
  plan text,
  ip_address text,
  status text,
  raw_status text,
  disk_used_mb numeric,
  disk_quota_mb numeric,
  bandwidth_used_mb numeric,
  bandwidth_quota_mb numeric,
  match_status text NOT NULL DEFAULT 'unmatched',
  matched_client_id uuid REFERENCES public.clients(id),
  match_confidence numeric,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whm_accounts_server_user
  ON public.whm_accounts(server_id, whm_user);

CREATE INDEX IF NOT EXISTS idx_whm_accounts_matched_client_id
  ON public.whm_accounts(matched_client_id);

CREATE INDEX IF NOT EXISTS idx_whm_accounts_primary_domain
  ON public.whm_accounts(lower(primary_domain));

CREATE TABLE IF NOT EXISTS public.whm_domain_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whm_account_id uuid REFERENCES public.whm_accounts(id) ON DELETE CASCADE,
  domain_name text NOT NULL,
  domain_type text,
  document_root text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whm_domain_observations_account_id
  ON public.whm_domain_observations(whm_account_id);

CREATE INDEX IF NOT EXISTS idx_whm_domain_observations_domain_name
  ON public.whm_domain_observations(lower(domain_name));

DROP TRIGGER IF EXISTS set_whm_servers_updated_at ON public.whm_servers;
CREATE TRIGGER set_whm_servers_updated_at
  BEFORE UPDATE ON public.whm_servers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_whm_accounts_updated_at ON public.whm_accounts;
CREATE TRIGGER set_whm_accounts_updated_at
  BEFORE UPDATE ON public.whm_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.whm_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whm_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whm_domain_observations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whm_servers'
      AND policyname = 'Admins can read whm servers'
  ) THEN
    CREATE POLICY "Admins can read whm servers"
      ON public.whm_servers
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whm_sync_runs'
      AND policyname = 'Admins can read whm sync runs'
  ) THEN
    CREATE POLICY "Admins can read whm sync runs"
      ON public.whm_sync_runs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whm_accounts'
      AND policyname = 'Admins can read whm accounts'
  ) THEN
    CREATE POLICY "Admins can read whm accounts"
      ON public.whm_accounts
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whm_domain_observations'
      AND policyname = 'Admins can read whm domain observations'
  ) THEN
    CREATE POLICY "Admins can read whm domain observations"
      ON public.whm_domain_observations
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users au
          WHERE au.user_id = auth.uid()
            AND au.is_active = true
            AND au.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;
