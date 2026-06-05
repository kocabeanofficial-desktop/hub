-- Targeted remote apply script for Initial Seed Review staging.
-- Manual use only after explicit approval:
-- APPROVE REMOTE SEED REVIEW STAGING MIGRATION
--
-- Scope:
-- - Creates the shared public.set_updated_at() helper if absent or outdated.
-- - Creates public.seed_reconciliation_proposals for staging/review rows only.
-- - Adds indexes, trigger, comments, RLS, and admin/super_admin policies.
--
-- Safety:
-- - This script does not load proposal row data.
-- - This script does not create clients, domains, hosting accounts, services, or mailboxes.
-- - Proposal rows are not confirmed ownership.
-- - suggested_client_id is only a suggestion until a separate approved admin workflow confirms it.
-- - No DNS, registrar, billing, WHM, Zoho, or core KBCC record changes are performed here.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.seed_reconciliation_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL,
  source_batch_id text NOT NULL,
  domain_name text,
  contact_name text,
  registrar_status text,
  auto_renew text,
  expiry_date timestamptz,
  renewal_risk text,
  existing_kbcc_domain_id uuid,
  existing_kbcc_client_id uuid,
  existing_kbcc_client_name text,
  existing_hosting_account_id uuid,
  suggested_client_id uuid,
  suggested_client_name text,
  confidence text,
  match_reason text,
  conflict_reasons text,
  proposed_actions text[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'pending_review',
  admin_decision text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seed_reconciliation_proposals_batch_proposal_unique
    UNIQUE (source_batch_id, proposal_id),
  CONSTRAINT seed_reconciliation_proposals_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low', 'none', 'conflict')),
  CONSTRAINT seed_reconciliation_proposals_renewal_risk_check
    CHECK (renewal_risk IS NULL OR renewal_risk IN ('expired', 'expires_soon_30_days', 'expires_soon_60_days', 'ok', 'unknown')),
  CONSTRAINT seed_reconciliation_proposals_review_status_check
    CHECK (review_status IN ('pending_review', 'confirmed_existing_client', 'manual_create_required', 'deferred', 'ignored', 'conflict')),
  CONSTRAINT seed_reconciliation_proposals_admin_decision_check
    CHECK (
      admin_decision IS NULL
      OR admin_decision IN (
        'attach_to_existing',
        'create_client_manually',
        'create_service_only',
        'create_domain_only',
        'create_hosting_only',
        'ignore',
        'defer'
      )
    )
);

COMMENT ON TABLE public.seed_reconciliation_proposals IS
  'Admin-reviewed staging proposals for the one-time Initial Server Client Seed & Reconciliation process. Rows are not confirmed ownership and do not create client, domain, hosting, service, or mailbox records.';

COMMENT ON COLUMN public.seed_reconciliation_proposals.suggested_client_id IS
  'Suggested client candidate only. Must not be treated as confirmed ownership without explicit admin confirmation in a separate approved workflow.';

COMMENT ON COLUMN public.seed_reconciliation_proposals.existing_kbcc_client_id IS
  'Existing client evidence from proposal generation. Must be validated before any separate approved core table write.';

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_source_batch_id
  ON public.seed_reconciliation_proposals(source_batch_id);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_domain_name
  ON public.seed_reconciliation_proposals(lower(domain_name));

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_confidence
  ON public.seed_reconciliation_proposals(confidence);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_renewal_risk
  ON public.seed_reconciliation_proposals(renewal_risk);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_review_status
  ON public.seed_reconciliation_proposals(review_status);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_suggested_client_id
  ON public.seed_reconciliation_proposals(suggested_client_id);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_existing_kbcc_client_id
  ON public.seed_reconciliation_proposals(existing_kbcc_client_id);

CREATE INDEX IF NOT EXISTS idx_seed_reconciliation_proposals_created_at
  ON public.seed_reconciliation_proposals(created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_seed_reconciliation_proposals_updated_at'
      AND tgrelid = 'public.seed_reconciliation_proposals'::regclass
  ) THEN
    CREATE TRIGGER set_seed_reconciliation_proposals_updated_at
      BEFORE UPDATE ON public.seed_reconciliation_proposals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.seed_reconciliation_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seed_reconciliation_proposals'
      AND policyname = 'Admins can read seed reconciliation proposals'
  ) THEN
    CREATE POLICY "Admins can read seed reconciliation proposals"
      ON public.seed_reconciliation_proposals
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
      AND tablename = 'seed_reconciliation_proposals'
      AND policyname = 'Admins can insert seed reconciliation proposals'
  ) THEN
    CREATE POLICY "Admins can insert seed reconciliation proposals"
      ON public.seed_reconciliation_proposals
      FOR INSERT
      TO authenticated
      WITH CHECK (
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
      AND tablename = 'seed_reconciliation_proposals'
      AND policyname = 'Admins can update seed reconciliation proposals'
  ) THEN
    CREATE POLICY "Admins can update seed reconciliation proposals"
      ON public.seed_reconciliation_proposals
      FOR UPDATE
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
