CREATE POLICY "Anyone can view seller profiles"
ON public.profiles
FOR SELECT
TO public
USING (public.has_role(id, 'seller'::app_role));