-- Prototype website editor support for Smartlook.
-- Adds a public-read website media bucket with client-scoped write policies,
-- confirms demo editable fields, and creates starter content_values where missing.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-media',
  'website-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can read website media'
  ) THEN
    CREATE POLICY "Public can read website media"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'website-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Clients can upload own website media'
  ) THEN
    CREATE POLICY "Clients can upload own website media"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'website-media'
        AND (storage.foldername(name))[1] IN (
          SELECT w.id::text
          FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
             OR w.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Clients can update own website media'
  ) THEN
    CREATE POLICY "Clients can update own website media"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'website-media'
        AND (storage.foldername(name))[1] IN (
          SELECT w.id::text
          FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
             OR w.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      )
      WITH CHECK (
        bucket_id = 'website-media'
        AND (storage.foldername(name))[1] IN (
          SELECT w.id::text
          FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
             OR w.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Clients can delete own website media'
  ) THEN
    CREATE POLICY "Clients can delete own website media"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'website-media'
        AND (storage.foldername(name))[1] IN (
          SELECT w.id::text
          FROM public.websites w
          JOIN public.clients c ON c.id = w.client_id
          WHERE c.email = auth.email()
             OR w.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_values'
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
             OR w.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')
        )
      );
  END IF;
END $$;

DO $$
DECLARE
  v_website_id uuid;
  v_home_page_id uuid;
  v_section_id uuid;
  v_field_id uuid;
  v_field_key text;
  v_label text;
  v_field_type text;
  v_default_value text;
  v_sort_order integer;
  v_section_title text;
  v_section_sort_order integer;
BEGIN
  SELECT id
  INTO v_website_id
  FROM public.websites
  WHERE id = '6be267fe-b5c1-48bc-b03d-c790a6319b7f'
     OR domain = 'smartlook.co.za'
     OR slug = 'smartlook'
  ORDER BY created_at
  LIMIT 1;

  IF v_website_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_home_page_id
  FROM public.pages
  WHERE website_id = v_website_id
    AND (slug = 'home' OR lower(title) = 'home')
  ORDER BY sort_order, created_at
  LIMIT 1;

  IF v_home_page_id IS NULL THEN
    INSERT INTO public.pages (website_id, title, slug, sort_order, is_active)
    VALUES (v_website_id, 'Home', 'home', 0, true)
    RETURNING id INTO v_home_page_id;
  END IF;

  FOR v_section_title, v_section_sort_order IN
    SELECT *
    FROM (VALUES
      ('Hero Section', 10),
      ('Buttons & Links', 20),
      ('Opening Hours', 30),
      ('Contact Details', 40),
      ('Images', 50)
    ) AS section_seed(title, sort_order)
  LOOP
    SELECT id
    INTO v_section_id
    FROM public.sections
    WHERE page_id = v_home_page_id
      AND lower(title) IN (
        lower(v_section_title),
        CASE WHEN v_section_title = 'Hero Section' THEN 'hero' ELSE lower(v_section_title) END
      )
    ORDER BY sort_order, created_at
    LIMIT 1;

    IF v_section_id IS NULL THEN
      INSERT INTO public.sections (page_id, title, sort_order, is_active)
      VALUES (v_home_page_id, v_section_title, v_section_sort_order, true);
    ELSE
      UPDATE public.sections
      SET title = v_section_title,
          sort_order = v_section_sort_order,
          is_active = true
      WHERE id = v_section_id;
    END IF;
  END LOOP;

  FOR v_field_key, v_label, v_field_type, v_default_value, v_sort_order, v_section_title IN
    SELECT *
    FROM (VALUES
      ('hero_headline', 'Hero Headline', 'text', 'Your trusted neighbourhood pharmacy', 10, 'Hero Section'),
      ('hero_subheadline', 'Hero Subheadline', 'textarea', 'Friendly care, practical advice, and everyday pharmacy essentials.', 20, 'Hero Section'),
      ('primary_button_text', 'Primary Button Text', 'button_text', 'Contact Us', 10, 'Buttons & Links'),
      ('primary_button_url', 'Primary Button URL', 'button_url', '/contact', 20, 'Buttons & Links'),
      ('whatsapp_button_text', 'WhatsApp Button Text', 'button_text', 'WhatsApp Us', 30, 'Buttons & Links'),
      ('whatsapp_url', 'WhatsApp URL', 'button_url', 'https://wa.me/', 40, 'Buttons & Links'),
      ('weekday_hours', 'Weekday Hours', 'text', 'Monday to Friday: 08:00 - 17:00', 10, 'Opening Hours'),
      ('saturday_hours', 'Saturday Hours', 'text', 'Saturday: 08:00 - 13:00', 20, 'Opening Hours'),
      ('sunday_hours', 'Sunday Hours', 'text', 'Sunday: Closed', 30, 'Opening Hours'),
      ('contact_phone', 'Contact Phone', 'phone', '', 10, 'Contact Details'),
      ('contact_email', 'Contact Email', 'email', '', 20, 'Contact Details'),
      ('address', 'Address', 'textarea', '', 30, 'Contact Details'),
      ('footer_contact_text', 'Footer Contact Text', 'textarea', 'Speak to the Smartlook Pharmacy team for friendly support.', 40, 'Contact Details'),
      ('hero_image', 'Hero Image', 'image', '', 10, 'Images'),
      ('promo_banner_text', 'Promo Banner Text', 'textarea', 'Ask us about current pharmacy specials.', 20, 'Images'),
      ('promo_banner_image', 'Promo Banner Image', 'image', '', 30, 'Images')
    ) AS field_seed(field_key, label, field_type, default_value, sort_order, section_title)
  LOOP
    SELECT id
    INTO v_section_id
    FROM public.sections
    WHERE page_id = v_home_page_id
      AND title = v_section_title
    ORDER BY sort_order, created_at
    LIMIT 1;

    SELECT f.id
    INTO v_field_id
    FROM public.fields f
    JOIN public.sections s ON s.id = f.section_id
    WHERE s.page_id = v_home_page_id
      AND f.field_key = v_field_key
    ORDER BY f.sort_order, f.created_at
    LIMIT 1;

    IF v_field_id IS NULL THEN
      INSERT INTO public.fields (
        section_id,
        field_key,
        label,
        field_type,
        default_value,
        sort_order,
        is_active
      )
      VALUES (
        v_section_id,
        v_field_key,
        v_label,
        v_field_type,
        v_default_value,
        v_sort_order,
        true
      )
      RETURNING id INTO v_field_id;
    ELSE
      UPDATE public.fields
      SET section_id = v_section_id,
          label = v_label,
          field_type = v_field_type,
          default_value = COALESCE(default_value, v_default_value),
          sort_order = v_sort_order,
          is_active = true
      WHERE id = v_field_id;
    END IF;

    INSERT INTO public.content_values (website_id, field_id, value)
    SELECT v_website_id, v_field_id, COALESCE(v_default_value, '')
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.content_values
      WHERE website_id = v_website_id
        AND field_id = v_field_id
    );
  END LOOP;
END $$;
