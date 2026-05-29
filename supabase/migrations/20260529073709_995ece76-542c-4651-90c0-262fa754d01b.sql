
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone authenticated can read comments" ON public.post_comments;

CREATE POLICY "Read comments (mask anon author)"
  ON public.post_comments FOR SELECT TO authenticated
  USING (
    is_anonymous = false
    OR auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE VIEW public.post_comments_public WITH (security_invoker = on) AS
SELECT
  id,
  post_id,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  is_anonymous,
  body,
  parent_id,
  like_count,
  created_at
FROM public.post_comments;

GRANT SELECT ON public.post_comments_public TO authenticated;
