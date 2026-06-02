-- Admin Service Monitoring V1
-- Dashboard-only service health and payment reminders. No production notifications.

CREATE TABLE IF NOT EXISTS public.monitored_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_type text NOT NULL,
  provider text,
  environment text NOT NULL DEFAULT 'production',
  service_url text,
  login_url text,
  hostname text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'archived')),
  health text NOT NULL DEFAULT 'unknown' CHECK (health IN ('running', 'degraded', 'down', 'unknown')),
  monthly_cost numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'once_off', 'unknown')),
  next_due_date date,
  notes text,
  admin_notes text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.monitored_services(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  reminder_level text NOT NULL DEFAULT 'ok' CHECK (reminder_level IN ('ok', 'upcoming', 'due_soon', 'urgent', 'due_today', 'overdue')),
  amount numeric(12,2),
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.monitored_services(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  health text NOT NULL CHECK (health IN ('running', 'degraded', 'down', 'unknown')),
  status_code integer,
  response_time_ms integer,
  reminder_level text CHECK (reminder_level IN ('ok', 'upcoming', 'due_soon', 'urgent', 'due_today', 'overdue')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitored_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_check_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_monitored_services_status ON public.monitored_services(status);
CREATE INDEX IF NOT EXISTS idx_monitored_services_next_due_date ON public.monitored_services(next_due_date);
CREATE INDEX IF NOT EXISTS idx_service_payment_reminders_service_id ON public.service_payment_reminders(service_id);
CREATE INDEX IF NOT EXISTS idx_service_payment_reminders_status ON public.service_payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_service_check_logs_service_id_checked_at ON public.service_check_logs(service_id, checked_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'monitored_services'
      AND policyname = 'Admins can manage monitored services'
  ) THEN
    CREATE POLICY "Admins can manage monitored services"
      ON public.monitored_services
      FOR ALL
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_payment_reminders'
      AND policyname = 'Admins can manage service payment reminders'
  ) THEN
    CREATE POLICY "Admins can manage service payment reminders"
      ON public.service_payment_reminders
      FOR ALL
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_check_logs'
      AND policyname = 'Admins can manage service check logs'
  ) THEN
    CREATE POLICY "Admins can manage service check logs"
      ON public.service_check_logs
      FOR ALL
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
