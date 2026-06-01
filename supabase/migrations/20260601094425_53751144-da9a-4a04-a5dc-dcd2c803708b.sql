-- Add email column to profiles for OAuth (Google) signups that don't have phone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user to also capture name, avatar_url, and email from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_phones text[] := ARRAY['+918921046170','+918921046171','+919082036638','+919619836638','+919999966666','+911111111111','+919821046171','+919821046170'];
  v_admin_phones text[] := ARRAY['+919619846170'];
  v_phone text := CASE WHEN NEW.phone IS NULL OR NEW.phone = '' THEN NULL WHEN NEW.phone LIKE '+%' THEN NEW.phone ELSE '+' || NEW.phone END;
  v_is_demo boolean := v_phone = ANY(v_demo_phones);
  v_is_admin boolean := v_phone = ANY(v_admin_phones);
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text := NULLIF(COALESCE(v_meta->>'full_name', v_meta->>'name'), '');
  v_avatar text := NULLIF(COALESCE(v_meta->>'avatar_url', v_meta->>'picture'), '');
  v_email text := NULLIF(COALESCE(NEW.email, v_meta->>'email'), '');
BEGIN
  INSERT INTO public.profiles (id, phone, email, name, avatar_url, onboarding_completed)
  VALUES (NEW.id, v_phone, v_email, v_name, v_avatar, v_is_demo)
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    onboarding_completed = CASE WHEN v_is_demo THEN true ELSE public.profiles.onboarding_completed END;

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
$function$;

-- Backfill existing profiles with missing name/avatar/email/phone from auth.users
UPDATE public.profiles p
SET
  email = COALESCE(p.email, NULLIF(u.email, ''), NULLIF(u.raw_user_meta_data->>'email','')),
  name  = COALESCE(p.name,  NULLIF(u.raw_user_meta_data->>'full_name',''), NULLIF(u.raw_user_meta_data->>'name','')),
  avatar_url = COALESCE(p.avatar_url, NULLIF(u.raw_user_meta_data->>'avatar_url',''), NULLIF(u.raw_user_meta_data->>'picture','')),
  phone = COALESCE(p.phone,
    CASE WHEN u.phone IS NULL OR u.phone = '' THEN NULL
         WHEN u.phone LIKE '+%' THEN u.phone ELSE '+' || u.phone END)
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.name IS NULL OR p.avatar_url IS NULL OR p.phone IS NULL);