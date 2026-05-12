-- 1. product_variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size_label)
);

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variants of active products"
ON public.product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
  )
);

CREATE POLICY "Sellers can view own product variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid()
  )
);

CREATE POLICY "Sellers can insert variants on own products"
ON public.product_variants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid()
  )
);

CREATE POLICY "Sellers can update variants on own products"
ON public.product_variants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid()
  )
);

CREATE POLICY "Sellers can delete variants on own products"
ON public.product_variants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid()
  )
);

-- updated_at trigger
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. order_items: variant snapshot
ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN variant_label text;

-- 3. RPC to atomically decrement variant stock
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(_variant_id uuid, _qty integer)
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
  RETURN updated_rows > 0;
END;
$$;

-- 4. Update low-stock notifications to also handle variant stock changes
CREATE OR REPLACE FUNCTION public.notify_seller_low_stock_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_title text;
BEGIN
  IF NEW.stock_quantity = OLD.stock_quantity THEN
    RETURN NEW;
  END IF;

  SELECT seller_id, title
    INTO v_seller_id, v_title
  FROM public.products
  WHERE id = NEW.product_id;

  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.stock_quantity = 0 THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      v_seller_id,
      'inventory',
      'Out of stock: ' || COALESCE(v_title, 'Product') || ' (' || NEW.size_label || ')',
      'Size ' || NEW.size_label || ' just sold out. Restock to keep selling.',
      '/products'
    );
  ELSIF NEW.stock_quantity <= 3 AND NEW.stock_quantity < OLD.stock_quantity THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      v_seller_id,
      'inventory',
      'Low stock: ' || COALESCE(v_title, 'Product') || ' (' || NEW.size_label || ')',
      'Only ' || NEW.stock_quantity || ' left in size ' || NEW.size_label || '.',
      '/products'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_seller_low_stock_variant
AFTER UPDATE OF stock_quantity ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_low_stock_variant();