CREATE OR REPLACE FUNCTION public.decrement_variant_stock(_variant_id uuid, _qty integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_rows integer;
  v_product_id uuid;
BEGIN
  IF _qty IS NULL OR _qty <= 0 THEN
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
    AND v.stock_quantity >= _qty
  RETURNING v.product_id INTO v_product_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows > 0 AND v_product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock_quantity = GREATEST(stock_quantity - _qty, 0),
        updated_at = now()
    WHERE id = v_product_id;
  END IF;

  RETURN updated_rows > 0;
END;
$function$;