
-- Change default order status to confirmed
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'confirmed'::order_status;

-- Create cancellation_requests table
CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Sellers can create cancellation requests for their orders
CREATE POLICY "Sellers can create cancellation requests"
ON public.cancellation_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND seller_id = auth.uid()
  )
);

-- Sellers can view their own cancellation requests
CREATE POLICY "Sellers can view own cancellation requests"
ON public.cancellation_requests FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

-- Buyers can view cancellation requests on their orders
CREATE POLICY "Buyers can view cancellation requests on own orders"
ON public.cancellation_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid()
  )
);

-- Admins can view all cancellation requests
CREATE POLICY "Admins can view all cancellation requests"
ON public.cancellation_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update cancellation requests
CREATE POLICY "Admins can update cancellation requests"
ON public.cancellation_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_cancellation_requests_updated_at
BEFORE UPDATE ON public.cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
