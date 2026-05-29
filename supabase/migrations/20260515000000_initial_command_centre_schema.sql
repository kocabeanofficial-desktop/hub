-- Local Command Centre baseline schema.
-- Creates the core external-project tables that later migrations assume exist.
-- Safe/idempotent only: no drops, truncates, deletes, or permissive public policies.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_user_id
  ON public.admin_users(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email
  ON public.admin_users(lower(email));

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  trading_name text,
  company_registration text,
  vat_number text,
  industry text,
  website_url text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  email text,
  phone text,
  full_name text,
  last_contacted_at timestamptz,
  lifecycle_notes text,
  zoho_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_business_name ON public.clients(business_name);

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts(client_id);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_name text,
  project_type text NOT NULL DEFAULT 'website_build',
  stage text NOT NULL DEFAULT 'enquiry_received',
  priority text NOT NULL DEFAULT 'medium',
  description text,
  internal_notes text,
  requested_start_date date,
  due_date date,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  progress_stage text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_code text NOT NULL REFERENCES public.services(code) ON UPDATE CASCADE,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  source text,
  started_at timestamptz,
  billing_cycle text,
  billing_amount numeric(12,2),
  renewal_date date,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service_code ON public.client_services(service_code);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  source text NOT NULL DEFAULT 'manual',
  task_type text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);

CREATE TABLE IF NOT EXISTS public.intake_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  business_name text,
  business_type text,
  business_description text,
  has_logo boolean,
  logo_url text,
  has_domain boolean,
  domain_name text,
  needs_email boolean,
  website_goal text,
  selected_pages text,
  has_images boolean,
  requested_services text,
  status text NOT NULL DEFAULT 'new',
  source text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_created_at
  ON public.intake_submissions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.hosting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cpanel_username text,
  cpanel_package text,
  server text,
  status text NOT NULL DEFAULT 'active',
  disk_quota_mb integer,
  disk_used_mb integer,
  bandwidth_quota_mb integer,
  bandwidth_used_mb integer,
  ip_address text,
  notes text,
  activated_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hosting_accounts_client_id ON public.hosting_accounts(client_id);

CREATE TABLE IF NOT EXISTS public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hosting_account_id uuid REFERENCES public.hosting_accounts(id) ON DELETE SET NULL,
  domain_name text NOT NULL,
  tld text,
  registrar text,
  status text NOT NULL DEFAULT 'active',
  ssl_status text,
  ssl_expiry date,
  domain_expiry date,
  auto_renew boolean,
  dns_configured boolean,
  is_primary boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_client_id ON public.domains(client_id);
CREATE INDEX IF NOT EXISTS idx_domains_hosting_account_id ON public.domains(hosting_account_id);

CREATE TABLE IF NOT EXISTS public.mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hosting_account_id uuid REFERENCES public.hosting_accounts(id) ON DELETE SET NULL,
  email_address text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mailboxes_client_id ON public.mailboxes(client_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_hosting_account_id ON public.mailboxes(hosting_account_id);

CREATE TABLE IF NOT EXISTS public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text,
  domain text,
  platform text,
  logo_url text,
  primary_color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_websites_client_id ON public.websites(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_websites_slug ON public.websites(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_website_id ON public.pages(website_id);

CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sections_page_id ON public.sections(page_id);

CREATE TABLE IF NOT EXISTS public.fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  default_value text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fields_section_id ON public.fields(section_id);

CREATE TABLE IF NOT EXISTS public.content_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_content_values_website_id ON public.content_values(website_id);
CREATE INDEX IF NOT EXISTS idx_content_values_field_id ON public.content_values(field_id);

CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_source text,
  status text NOT NULL DEFAULT 'pending',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.services (code, name, category, description, is_active)
VALUES
  ('website_build', 'New Website Build', 'Websites', 'New website build project.', true),
  ('website_redesign', 'Website Redesign', 'Websites', 'Website redesign project.', true),
  ('ecommerce_build', 'E-Commerce Build', 'Websites', 'E-commerce website build project.', true),
  ('booking_system', 'Booking System', 'Websites', 'Booking system project.', true),
  ('custom_web_app', 'Custom Web App', 'Websites', 'Custom web application project.', true),
  ('hosting_email', 'Hosting + Email Setup', 'Hosting & Email', 'Hosting and email setup service.', true),
  ('email_only', 'Email Only', 'Hosting & Email', 'Email-only service.', true),
  ('domain_only', 'Domain Registration Only', 'Domains', 'Domain registration service.', true),
  ('domain_transfer', 'Domain Transfer', 'Domains', 'Domain transfer service.', true),
  ('hosting_transfer', 'Hosting Transfer', 'Hosting & Email', 'Hosting transfer service.', true),
  ('support_request', 'Support Request', 'Support', 'Support request service.', true),
  ('billing_request', 'Billing / Invoice Request', 'Billing', 'Billing request service.', true),
  ('renewal_request', 'Renewal Request', 'Renewals', 'Renewal request service.', true),
  ('existing_client_add_service', 'Existing Client - Add Service', 'General', 'Additional service for an existing client.', true),
  ('general_enquiry', 'General Enquiry', 'General', 'General enquiry service.', true),
  ('seo', 'SEO', 'Marketing', 'Search engine optimisation service.', true),
  ('basic_seo', 'Basic SEO', 'Marketing', 'Basic search engine optimisation service.', true),
  ('seo_management', 'SEO Management', 'Marketing', 'Ongoing SEO management service.', true),
  ('website_seo', 'Website SEO', 'Marketing', 'SEO service for an active website.', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.clients (
  id,
  business_name,
  trading_name,
  email,
  phone,
  industry,
  website_url,
  status
)
VALUES (
  'b486d456-121b-40af-8cc2-016c74a7c26b',
  'Smartlook Pharmacy',
  'Smartlook Pharmacy',
  'smartlook@example.com',
  NULL,
  'Pharmacy',
  'https://smartlook.co.za',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.websites (
  id,
  client_id,
  name,
  slug,
  domain,
  platform,
  is_active
)
VALUES (
  '6be267fe-b5c1-48bc-b03d-c790a6319b7f',
  'b486d456-121b-40af-8cc2-016c74a7c26b',
  'Smartlook Pharmacy',
  'smartlook',
  'smartlook.co.za',
  'wordpress',
  true
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
      AND policyname = 'Users can read own admin row'
  ) THEN
    CREATE POLICY "Users can read own admin row"
      ON public.admin_users
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
