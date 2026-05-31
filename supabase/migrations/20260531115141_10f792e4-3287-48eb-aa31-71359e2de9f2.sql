-- 1. Drop legacy functions / triggers
DROP FUNCTION IF EXISTS public.notify_buyer_order_status() CASCADE;
DROP FUNCTION IF EXISTS public.notify_seller_new_order() CASCADE;
DROP FUNCTION IF EXISTS public.notify_seller_new_follower() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_return_reviewed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_return_request() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_cancellation_reviewed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_cancellation_request() CASCADE;
DROP FUNCTION IF EXISTS public.notify_seller_application_reviewed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_seller_low_stock() CASCADE;
DROP FUNCTION IF EXISTS public.notify_seller_low_stock_variant() CASCADE;
DROP FUNCTION IF EXISTS public.notify_followers_on_live() CASCADE;
DROP FUNCTION IF EXISTS public.handle_seller_approval() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_product_stock(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.decrement_variant_stock(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_revoke_seller(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_seller_public_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_seller_public_profiles(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_single_default_address() CASCADE;
DROP FUNCTION IF EXISTS public.become_creator() CASCADE;

-- 2. Drop legacy view + tables
DROP VIEW IF EXISTS public.seller_ratings CASCADE;
DROP TABLE IF EXISTS public.cancellation_requests CASCADE;
DROP TABLE IF EXISTS public.return_requests CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.seller_applications CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.livestreams CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- 3. Drop orphan enums
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.livestream_status CASCADE;

-- 4. Drop legacy storage policies for the dropped buckets
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload livestream thumbnails" ON storage.objects;

-- 5. Remove legacy role assignments (keep enum values for compatibility)
DELETE FROM public.user_roles WHERE role::text IN ('shopper', 'seller');

-- 6. Default new users to 'creator' (was 'shopper')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;