
-- Helper: generate a unique username from an email prefix
CREATE OR REPLACE FUNCTION public.generate_username_from_email(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 0;
BEGIN
  IF _email IS NULL OR _email = '' THEN
    v_base := 'user' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  ELSE
    v_base := lower(regexp_replace(split_part(_email,'@',1), '[^a-zA-Z0-9_]', '', 'g'));
    IF length(v_base) < 3 THEN
      v_base := v_base || substr(replace(gen_random_uuid()::text,'-',''),1,6);
    END IF;
    IF length(v_base) > 24 THEN
      v_base := substr(v_base,1,24);
    END IF;
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_candidate) LOOP
    v_n := v_n + 1;
    v_candidate := v_base || v_n::text;
  END LOOP;
  RETURN v_candidate;
END;
$$;

-- Update handle_new_user: for OAuth signups (Google/Apple) with email + name,
-- auto-generate username and mark onboarding complete.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demo_phones text[] := ARRAY['+918921046170','+918921046171','+919082036638','+919619836638','+919999966666','+911111111111','+919821046171','+919821046170'];
  v_admin_phones text[] := ARRAY['+919619846170'];
  v_phone text := CASE WHEN NEW.phone IS NULL OR NEW.phone = '' THEN NULL WHEN NEW.phone LIKE '+%' THEN NEW.phone ELSE '+' || NEW.phone END;
  v_is_demo boolean := COALESCE(v_phone = ANY(v_demo_phones), false);
  v_is_admin boolean := COALESCE(v_phone = ANY(v_admin_phones), false);
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text := NULLIF(COALESCE(v_meta->>'full_name', v_meta->>'name'), '');
  v_avatar text := NULLIF(COALESCE(v_meta->>'avatar_url', v_meta->>'picture'), '');
  v_email text := NULLIF(COALESCE(NEW.email, v_meta->>'email'), '');
  v_provider text := COALESCE(NEW.raw_app_meta_data->>'provider','');
  v_is_oauth boolean := v_provider IN ('google','apple') AND v_email IS NOT NULL;
  v_username text;
  v_auto_onboarded boolean := v_is_demo OR v_is_oauth;
BEGIN
  IF v_is_oauth THEN
    v_username := public.generate_username_from_email(v_email);
  END IF;

  INSERT INTO public.profiles (id, phone, email, name, avatar_url, username, onboarding_completed)
  VALUES (NEW.id, v_phone, v_email, v_name, v_avatar, v_username, v_auto_onboarded)
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    onboarding_completed = CASE
      WHEN v_is_demo THEN true
      WHEN v_is_oauth AND public.profiles.onboarding_completed IS NOT TRUE THEN true
      ELSE public.profiles.onboarding_completed
    END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'creator'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: existing Google/Apple OAuth users with no completed onboarding
DO $$
DECLARE
  r record;
  v_username text;
  v_email text;
  v_name text;
  v_avatar text;
BEGIN
  FOR r IN
    SELECT u.id, u.email, u.raw_user_meta_data, u.raw_app_meta_data
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE COALESCE(u.raw_app_meta_data->>'provider','') IN ('google','apple')
      AND (p.onboarding_completed IS NOT TRUE OR p.username IS NULL)
  LOOP
    v_email := NULLIF(COALESCE(r.email, r.raw_user_meta_data->>'email'), '');
    v_name := NULLIF(COALESCE(r.raw_user_meta_data->>'full_name', r.raw_user_meta_data->>'name'), '');
    v_avatar := NULLIF(COALESCE(r.raw_user_meta_data->>'avatar_url', r.raw_user_meta_data->>'picture'), '');

    SELECT username INTO v_username FROM public.profiles WHERE id = r.id;
    IF v_username IS NULL AND v_email IS NOT NULL THEN
      v_username := public.generate_username_from_email(v_email);
    END IF;

    UPDATE public.profiles
    SET
      username = COALESCE(username, v_username),
      name = COALESCE(name, v_name),
      avatar_url = COALESCE(avatar_url, v_avatar),
      email = COALESCE(email, v_email),
      onboarding_completed = true
    WHERE id = r.id;
  END LOOP;
END $$;
