-- Allow authenticated clients to SELECT pages for their own website
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pages'
      AND policyname = 'Clients can read pages of own websites'
  ) THEN
    CREATE POLICY "Clients can read pages of own websites"
      ON public.pages FOR SELECT TO authenticated
      USING (
        website_id IN (
          SELECT w.id FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
        )
      );
  END IF;
END $$;

-- Allow authenticated clients to SELECT sections for their own pages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sections'
      AND policyname = 'Clients can read sections of own pages'
  ) THEN
    CREATE POLICY "Clients can read sections of own pages"
      ON public.sections FOR SELECT TO authenticated
      USING (
        page_id IN (
          SELECT p.id FROM public.pages p
          JOIN public.websites w ON w.id = p.website_id
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
        )
      );
  END IF;
END $$;

-- Allow authenticated clients to SELECT fields for their own sections
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fields'
      AND policyname = 'Clients can read fields of own sections'
  ) THEN
    CREATE POLICY "Clients can read fields of own sections"
      ON public.fields FOR SELECT TO authenticated
      USING (
        section_id IN (
          SELECT s.id FROM public.sections s
          JOIN public.pages p ON p.id = s.page_id
          JOIN public.websites w ON w.id = p.website_id
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
        )
      );
  END IF;
END $$;

-- Seed demo report for Smartlook Pharmacy (idempotent)
INSERT INTO public.reports (client_id, title, report_type, status, summary)
SELECT
  'b486d456-121b-40af-8cc2-016c74a7c26b',
  'Smartlook Website Demo Report',
  'Website Management',
  'published',
  'Demo report showing how Koca Bean reports will appear in the client dashboard.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.reports
  WHERE client_id = 'b486d456-121b-40af-8cc2-016c74a7c26b'
);
