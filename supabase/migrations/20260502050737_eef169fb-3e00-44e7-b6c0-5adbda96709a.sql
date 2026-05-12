
-- Atomic stock decrement; returns true on success, false if insufficient stock
CREATE OR REPLACE FUNCTION public.decrement_product_stock(_product_id uuid, _qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows integer;
BEGIN
  IF _qty IS NULL OR _qty <= 0 THEN
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
$$;

-- Notify seller on low/out-of-stock after an order item is created
CREATE OR REPLACE FUNCTION public.notify_seller_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title text;
  v_stock integer;
BEGIN
  SELECT seller_id, title, stock_quantity
    INTO v_seller_id, v_title, v_stock
  FROM public.products
  WHERE id = NEW.product_id;

  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_stock = 0 THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      v_seller_id,
      'inventory',
      'Out of stock: ' || COALESCE(v_title, 'Product'),
      'Your product just sold out. Restock to keep selling.',
      '/products'
    );
  ELSIF v_stock <= 3 THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      v_seller_id,
      'inventory',
      'Low stock: ' || COALESCE(v_title, 'Product'),
      'Only ' || v_stock || ' left in stock.',
      '/products'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_low_stock ON public.order_items;
CREATE TRIGGER trg_notify_seller_low_stock
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_low_stock();
