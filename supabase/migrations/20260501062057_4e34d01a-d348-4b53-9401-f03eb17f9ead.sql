CREATE POLICY "Buyers can update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);