
DO $$
DECLARE
  v_user uuid := '08f2d99b-f49c-44a6-acb7-950b7570ec55';
BEGIN
  DELETE FROM public.product_variants WHERE product_id IN (SELECT id FROM public.products WHERE seller_id = v_user);
  UPDATE public.products SET is_active = false, deleted_at = now() WHERE seller_id = v_user;
  DELETE FROM public.user_roles WHERE user_id = v_user AND role = 'seller';
  DELETE FROM public.seller_applications WHERE user_id = v_user;
  DELETE FROM public.livestreams WHERE seller_id = v_user;
  DELETE FROM public.follows WHERE seller_id = v_user;
END $$;
