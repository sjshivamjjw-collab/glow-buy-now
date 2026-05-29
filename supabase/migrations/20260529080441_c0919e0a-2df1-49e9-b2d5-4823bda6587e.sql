DROP FUNCTION IF EXISTS public.get_trending_posts(integer, integer);

CREATE FUNCTION public.get_trending_posts(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(
   id uuid,
   user_id uuid,
   title text,
   body text,
   location text,
   hashtags text[],
   like_count integer,
   comment_count integer,
   created_at timestamp with time zone,
   cover_url text,
   cover_kind text,
   media_count integer,
   score numeric,
   is_anonymous boolean,
   category text
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
    p.is_anonymous,
    p.category
  FROM public.posts p
  ORDER BY score DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) TO authenticated;