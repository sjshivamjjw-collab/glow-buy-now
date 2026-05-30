ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Read posts (mask anon owner)" ON public.posts;

CREATE POLICY "Read posts (mask anon owner)"
ON public.posts
FOR SELECT
TO authenticated
USING (
  (is_hidden = false OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_anonymous = false OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);