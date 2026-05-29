DROP POLICY IF EXISTS "Anyone authenticated can read likes" ON public.post_likes;
CREATE POLICY "Read safe post likes"
  ON public.post_likes FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Anyone authenticated can read comment likes" ON public.post_comment_likes;
CREATE POLICY "Read safe comment likes"
  ON public.post_comment_likes FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.get_comment_like_state(_comment_ids uuid[])
RETURNS TABLE(comment_id uuid, like_count integer, liked_by_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id AS comment_id,
    c.like_count,
    EXISTS (
      SELECT 1 FROM public.post_comment_likes l
      WHERE l.comment_id = c.id AND l.user_id = auth.uid()
    ) AS liked_by_me
  FROM public.post_comments c
  WHERE c.id = ANY(COALESCE(_comment_ids, '{}'::uuid[]));
$function$;

REVOKE EXECUTE ON FUNCTION public.get_comment_like_state(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_comment_like_state(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_comment_like_state(uuid[]) TO authenticated;