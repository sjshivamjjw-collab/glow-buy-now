CREATE OR REPLACE FUNCTION public.admin_revoke_seller(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can revoke seller access';
  END IF;

  -- Remove seller role
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = 'seller'::app_role;

  -- Mark seller application(s) as rejected so they can re-apply
  UPDATE public.seller_applications
  SET status = 'rejected'::application_status,
      rejection_reason = COALESCE(rejection_reason, 'Seller access revoked by admin'),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE user_id = _user_id AND status = 'approved'::application_status;

  -- Clear product variants (preserves order history via order_items snapshots)
  DELETE FROM public.product_variants
  WHERE product_id IN (SELECT id FROM public.products WHERE seller_id = _user_id);

  -- Soft-delete products
  UPDATE public.products
  SET is_active = false,
      deleted_at = now(),
      updated_at = now()
  WHERE seller_id = _user_id AND deleted_at IS NULL;

  -- Remove livestreams and follows
  DELETE FROM public.livestreams WHERE seller_id = _user_id;
  DELETE FROM public.follows WHERE seller_id = _user_id;

  RETURN true;
END;
$$;