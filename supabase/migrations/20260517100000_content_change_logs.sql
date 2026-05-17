-- Migration: content_change_logs
-- Records field-level changes when a client saves website content.

CREATE TABLE IF NOT EXISTS public.content_change_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        REFERENCES public.clients(id)  ON DELETE SET NULL,
  website_id   uuid        REFERENCES public.websites(id) ON DELETE SET NULL,
  field_id     uuid        REFERENCES public.fields(id)   ON DELETE SET NULL,
  old_value    text,
  new_value    text,
  changed_by   uuid,
  changed_at   timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'pending',
  baked_at     timestamptz,
  reviewed_by  uuid,
  notes        text
);

ALTER TABLE public.content_change_logs ENABLE ROW LEVEL SECURITY;

DO $body$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'content_change_logs'
      AND policyname = 'Clients can insert own change logs'
  ) THEN
    CREATE POLICY "Clients can insert own change logs"
      ON public.content_change_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        website_id IN (
          SELECT w.id FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
        )
      );
  END IF;
END $body$;

DO $body$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'content_change_logs'
      AND policyname = 'Clients can read own change logs'
  ) THEN
    CREATE POLICY "Clients can read own change logs"
      ON public.content_change_logs
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
END $body$;
