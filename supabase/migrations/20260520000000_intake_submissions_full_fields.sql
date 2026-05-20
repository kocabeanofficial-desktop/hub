-- Add all missing fields to intake_submissions table
-- Preserves all existing data and columns
-- Run after the initial intake_submissions table creation

-- Contact & Identity
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS preferred_contact text,
  ADD COLUMN IF NOT EXISTS business_registration text;

-- Package / Pricing
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS selected_package text,
  ADD COLUMN IF NOT EXISTS setup_fee text,
  ADD COLUMN IF NOT EXISTS monthly_fee text;

-- Domain
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS domain_status text,
  ADD COLUMN IF NOT EXISTS existing_domain text,
  ADD COLUMN IF NOT EXISTS domain_provider text,
  ADD COLUMN IF NOT EXISTS domain_access text,
  ADD COLUMN IF NOT EXISTS preferred_domains text;

-- Business Info
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS operating_area text,
  ADD COLUMN IF NOT EXISTS business_overview text,
  ADD COLUMN IF NOT EXISTS ideal_customers text,
  ADD COLUMN IF NOT EXISTS customer_problem_solved text,
  ADD COLUMN IF NOT EXISTS trust_factors text;

-- Website Goals
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS website_goals text,
  ADD COLUMN IF NOT EXISTS main_visitor_action text,
  ADD COLUMN IF NOT EXISTS pages_needed text,
  ADD COLUMN IF NOT EXISTS main_services_products text;

-- Content & Assets
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS content_status text,
  ADD COLUMN IF NOT EXISTS logo_status text,
  ADD COLUMN IF NOT EXISTS brand_colours_status text,
  ADD COLUMN IF NOT EXISTS photos_status text,
  ADD COLUMN IF NOT EXISTS upload_note text;

-- Design Preferences
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS design_style text,
  ADD COLUMN IF NOT EXISTS website_examples_liked text,
  ADD COLUMN IF NOT EXISTS websites_disliked text,
  ADD COLUMN IF NOT EXISTS competitors text,
  ADD COLUMN IF NOT EXISTS features_needed text;

-- Email / Hosting
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS mailbox_count text,
  ADD COLUMN IF NOT EXISTS requested_email_addresses text;

-- Timeline
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS start_timing text,
  ADD COLUMN IF NOT EXISTS launch_deadline text;

-- Notes & Metadata
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS final_notes text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS additional_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_intake_submissions_updated_at ON public.intake_submissions;
CREATE TRIGGER set_intake_submissions_updated_at
  BEFORE UPDATE ON public.intake_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_intake_submissions_client_id ON public.intake_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_project_id ON public.intake_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON public.intake_submissions(status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_source ON public.intake_submissions(source);
