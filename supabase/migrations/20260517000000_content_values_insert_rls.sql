-- Add missing INSERT policy for content_values.
-- Without this, upsert fails for new rows because no INSERT policy exists.
-- The UPDATE policy already exists; this mirrors its WITH CHECK logic.
DO $$ BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'content_values'
        AND policyname = 'Clients can insert own content values'
    ) THEN
    CREATE POLICY "Clients can insert own content values"
      ON public.content_values
      FOR INSERT
      TO authenticated
      WITH CHECK (
          website_id IN (
            SELECT w.id
            FROM public.websites w
            JOIN public.clients c ON c.id = w.client_id
            WHERE c.email = auth.email()
          )
        );
  END IF;
END $$;
