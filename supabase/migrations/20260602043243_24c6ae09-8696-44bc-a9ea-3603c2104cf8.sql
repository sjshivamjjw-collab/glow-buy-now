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
  v_is_demo boolean := COALESCE(v_phone = ANY(v_demo_phones), false);
  v_is_admin boolean := COALESCE(v_phone = ANY(v_admin_phones), false);
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