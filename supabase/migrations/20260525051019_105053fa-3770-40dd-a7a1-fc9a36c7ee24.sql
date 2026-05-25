CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_demo_phones text[] := ARRAY['+918921046170','+918921046171','+919082036638','+919619836638','+919999966666','+911111111111','+919821046171','+919821046170'];
  v_admin_phones text[] := ARRAY['+919619846170'];
  v_phone text := CASE WHEN NEW.phone IS NULL THEN NULL WHEN NEW.phone LIKE '+%' THEN NEW.phone ELSE '+' || NEW.phone END;
  v_is_demo boolean := v_phone = ANY(v_demo_phones);
  v_is_admin boolean := v_phone = ANY(v_admin_phones);
BEGIN
  INSERT INTO public.profiles (id, phone, onboarding_completed, name)
  VALUES (NEW.id, v_phone, v_is_demo, NULL)
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    onboarding_completed = CASE
      WHEN v_is_demo THEN true
      ELSE public.profiles.onboarding_completed
    END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'shopper')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.profiles SET onboarding_completed = false WHERE phone = '+919619846170';