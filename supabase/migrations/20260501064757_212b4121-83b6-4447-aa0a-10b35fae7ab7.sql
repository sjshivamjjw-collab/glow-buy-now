
-- Allow buyers to create cancellation requests on their own orders
CREATE POLICY "Buyers can create cancellation requests"
ON public.cancellation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = cancellation_requests.order_id AND orders.buyer_id = auth.uid()
  )
);

-- Create return_requests table
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create return requests on own orders"
ON public.return_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (SELECT 1 FROM orders WHERE orders.id = return_requests.order_id AND orders.buyer_id = auth.uid())
);

CREATE POLICY "Buyers can view own return requests"
ON public.return_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Sellers can view return requests on their orders"
ON public.return_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = return_requests.order_id AND orders.seller_id = auth.uid()));

CREATE POLICY "Admins can view all return requests"
ON public.return_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update return requests"
ON public.return_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_return_requests_updated_at
BEFORE UPDATE ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
