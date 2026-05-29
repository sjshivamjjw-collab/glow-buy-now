-- 1. Add column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- 2. Tighten SELECT policy on base posts table
DROP POLICY IF EXISTS "Anyone authenticated can read posts" ON public.posts;
DROP POLICY IF EXISTS "Read posts (mask anon owner)" ON public.posts;

CREATE POLICY "Read posts (mask anon owner)"
  ON public.posts FOR SELECT TO authenticated
  USING (
    is_anonymous = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Public view masking user_id for anonymous posts
DROP VIEW IF EXISTS public.posts_public;
CREATE VIEW public.posts_public WITH (security_invoker = on) AS
SELECT
  id,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  is_anonymous,
  title, body, location, hashtags,
  like_count, comment_count,
  created_at, updated_at,
  category, music_url, music_title,
  review_subcategory, review_recommendation
FROM public.posts;

GRANT SELECT ON public.posts_public TO authenticated;
GRANT SELECT ON public.posts_public TO anon;

-- 4. Recreate trending RPC with new return type
DROP FUNCTION IF EXISTS public.get_trending_posts(integer, integer);

CREATE FUNCTION public.get_trending_posts(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(
   id uuid, user_id uuid, title text, body text, location text, hashtags text[],
   like_count integer, comment_count integer, created_at timestamp with time zone,
   cover_url text, cover_kind text, media_count integer, score numeric,
   is_anonymous boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    CASE WHEN p.is_anonymous THEN NULL ELSE p.user_id END AS user_id,
    p.title, p.body, p.location, p.hashtags,
    p.like_count, p.comment_count, p.created_at,
    (SELECT url FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_url,
    (SELECT kind FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_kind,
    (SELECT count(*)::int FROM public.post_media m WHERE m.post_id = p.id) AS media_count,
    ((p.like_count + 1)::numeric / power(EXTRACT(EPOCH FROM (now() - p.created_at))/3600 + 2, 1.5)) AS score,
    p.is_anonymous
  FROM public.posts p
  ORDER BY score DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;