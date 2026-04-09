
-- Table 1: email_settings_requests
CREATE TABLE public.email_settings_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  requesting_name TEXT NOT NULL DEFAULT 'Client',
  requesting_email TEXT NOT NULL,
  domain TEXT NOT NULL,
  mailbox_address TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'resend_settings',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own email requests"
  ON public.email_settings_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own email requests"
  ON public.email_settings_requests FOR SELECT TO authenticated
  USING (requesting_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Table 2: staff_authorizations
CREATE TABLE public.staff_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  staff_full_name TEXT NOT NULL,
  staff_email TEXT NOT NULL,
  staff_phone TEXT,
  staff_role TEXT,
  access_email BOOLEAN NOT NULL DEFAULT false,
  access_website BOOLEAN NOT NULL DEFAULT false,
  access_cpanel BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_owner_confirm',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own staff authorizations"
  ON public.staff_authorizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own staff authorizations"
  ON public.staff_authorizations FOR SELECT TO authenticated
  USING (owner_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Table 3: upgrade_requests
CREATE TABLE public.upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  business_description TEXT NOT NULL,
  current_website_url TEXT,
  current_platform TEXT NOT NULL DEFAULT 'unknown',
  goals TEXT,
  upgrade_type TEXT NOT NULL DEFAULT 'ai_website',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own upgrade requests"
  ON public.upgrade_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own upgrade requests"
  ON public.upgrade_requests FOR SELECT TO authenticated
  USING (submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
