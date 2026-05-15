-- Client portal RLS: allow authenticated client users to read their own records.
-- This is required so AuthContext can resolve clientId via email lookup,
-- and so client dashboard queries (websites, reports) can find their data.

-- Allow authenticated users to read their own client row (matched by email).
-- Does not expose any other client's data.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'clients'
        AND policyname = 'Clients can read own row'
    ) THEN
    CREATE POLICY "Clients can read own row"
      ON public.clients
      FOR SELECT
      TO authenticated
      USING (email = auth.email());
  END IF;
END $$;

-- Allow authenticated users to read websites linked to their own client_id.
-- This enables the website card on the client dashboard.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'websites'
        AND policyname = 'Clients can read own websites'
    ) THEN
    CREATE POLICY "Clients can read own websites"
      ON public.websites
      FOR SELECT
      TO authenticated
      USING (
          client_id IN (
            SELECT id FROM public.clients WHERE email = auth.email()
          )
          OR
          -- Also allow if user_metadata.client_id matches (for invite-accepted users)
        client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        );
  END IF;
END $$;

-- Allow authenticated users to read content_values for their linked website.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'content_values'
        AND policyname = 'Clients can read own content values'
    ) THEN
    CREATE POLICY "Clients can read own content values"
      ON public.content_values
      FOR SELECT
      TO authenticated
      USING (
          website_id IN (
            SELECT w.id FROM public.websites w
            JOIN public.clients c ON c.id = w.client_id
            WHERE c.email = auth.email()
          )
        );
  END IF;
END $$;

-- Allow authenticated users to update content_values for their linked website.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'content_values'
        AND policyname = 'Clients can update own content values'
    ) THEN
    CREATE POLICY "Clients can update own content values"
      ON public.content_values
      FOR UPDATE
      TO authenticated
      USING (
          website_id IN (
            SELECT w.id FROM public.websites w
            JOIN public.clients c ON c.id = w.client_id
            WHERE c.email = auth.email()
          )
        )
      WITH CHECK (
          website_id IN (
            SELECT w.id FROM public.websites w
            JOIN public.clients c ON c.id = w.client_id
            WHERE c.email = auth.email()
          )
        );
  END IF;
END $$;

-- Allow authenticated users to read their own reports.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'reports'
        AND policyname = 'Clients can read own reports'
    ) THEN
    CREATE POLICY "Clients can read own reports"
      ON public.reports
      FOR SELECT
      TO authenticated
      USING (
          client_id IN (
            SELECT id FROM public.clients WHERE email = auth.email()
          )
          OR
          client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        );
  END IF;
END $$;
