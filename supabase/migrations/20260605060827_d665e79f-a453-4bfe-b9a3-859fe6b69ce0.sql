CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_phones text[] := ARRAY[
    '+918921046170','+918921046171','+919082036638','+919619836638','+919999966666','+911111111111','+919821046171','+919821046170',
    '+910000000001','+910000000002','+910000000003','+910000000004','+910000000005','+910000000006','+910000000007','+910000000008','+910000000009','+910000000010','+910000000011','+910000000012',
    '+910000000013','+910000000014','+910000000015','+910000000016','+910000000017','+910000000018','+910000000019','+910000000020'
  ];
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
$function$;