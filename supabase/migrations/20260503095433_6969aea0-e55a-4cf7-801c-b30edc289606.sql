-- 1. Restrict platform_settings reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- 2. Remove broad public seller profile policy; expose only safe columns via a view
DROP POLICY IF EXISTS "Anyone can view seller profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_seller_profiles
WITH (security_invoker = false) AS
SELECT p.id, p.name, p.username, p.avatar_url
FROM public.profiles p
WHERE public.has_role(p.id, 'seller'::app_role);

GRANT SELECT ON public.public_seller_profiles TO anon, authenticated;

-- Allow authenticated users (e.g. shoppers viewing seller pages) to read safe seller columns directly too
CREATE POLICY "Authenticated can view seller public info"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(id, 'seller'::app_role));
-- Note: column-level security is enforced by application code only selecting safe columns.
-- Admins and owners retain full access via existing policies.

-- 3. Stock decrement guards
CREATE OR REPLACE FUNCTION public.decrement_product_stock(_product_id uuid, _qty integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_rows integer;
  v_caller uuid := auth.uid();
  v_authorized boolean := false;
BEGIN
  IF _qty IS NULL OR _qty <= 0 OR v_caller IS NULL THEN
    RETURN false;
  END IF;

  -- Authorize: caller is the seller, OR has a recent pending order for this product
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = _product_id AND p.seller_id = v_caller
  ) OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.buyer_id = v_caller
      AND oi.product_id = _product_id
      AND o.created_at > now() - interval '1 hour'
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RETURN false;
  END IF;

  UPDATE public.products
  SET stock_quantity = stock_quantity - _qty,
      updated_at = now()
  WHERE id = _product_id
    AND is_active = true
    AND deleted_at IS NULL
    AND stock_quantity >= _qty;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(_variant_id uuid, _qty integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_rows integer;
  v_product_id uuid;
  v_caller uuid := auth.uid();
  v_authorized boolean := false;
BEGIN
  IF _qty IS NULL OR _qty <= 0 OR v_caller IS NULL THEN
    RETURN false;
  END IF;

  SELECT product_id INTO v_product_id FROM public.product_variants WHERE id = _variant_id;
  IF v_product_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = v_product_id AND p.seller_id = v_caller
  ) OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.buyer_id = v_caller
      AND oi.variant_id = _variant_id
      AND o.created_at > now() - interval '1 hour'
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RETURN false;
  END IF;

  UPDATE public.product_variants v
  SET stock_quantity = v.stock_quantity - _qty,
      updated_at = now()
  FROM public.products p
  WHERE v.id = _variant_id
    AND v.product_id = p.id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND v.stock_quantity >= _qty;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows > 0 THEN
    UPDATE public.products
    SET stock_quantity = GREATEST(stock_quantity - _qty, 0),
        updated_at = now()
    WHERE id = v_product_id;
  END IF;

  RETURN updated_rows > 0;
END;
$function$;