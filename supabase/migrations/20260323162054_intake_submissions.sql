-- Drop old intake_submissions if exists and recreate with new schema
DROP TABLE IF EXISTS public.intake_submissions;

CREATE TABLE public.intake_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  business_name text,
  email text,
  phone text,
  business_type text,
  business_description text,
  has_logo boolean DEFAULT false,
  logo_url text,
  has_domain boolean DEFAULT false,
  domain_name text,
  needs_email boolean DEFAULT false,
  website_goal text,
  selected_pages text,
  has_images boolean DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (admin only in app logic)
CREATE POLICY "Authenticated users can manage intake_submissions"
  ON public.intake_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon insert for public intake forms
CREATE POLICY "Anon can insert intake_submissions"
  ON public.intake_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);
