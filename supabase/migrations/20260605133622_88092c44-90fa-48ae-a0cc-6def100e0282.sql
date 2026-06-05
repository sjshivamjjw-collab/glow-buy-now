ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_kind text;

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
    COALESCE(p.cover_url, (SELECT url FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1)) AS cover_url,
    COALESCE(p.cover_kind, (SELECT kind FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1)) AS cover_kind,
    (SELECT count(*)::int FROM public.post_media m WHERE m.post_id = p.id) AS media_count,
    ((p.like_count + 1)::numeric / power(EXTRACT(EPOCH FROM (now() - p.created_at))/3600 + 2, 1.5)) AS score,
    p.is_anonymous,
    p.category
  FROM public.posts p
  WHERE COALESCE(p.is_hidden, false) = false
  ORDER BY score DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_posts(_q text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, user_id uuid, title text, body text, location text, hashtags text[],
  like_count integer, comment_count integer, created_at timestamp with time zone,
  cover_url text, cover_kind text, media_count integer,
  is_anonymous boolean, category text, rank real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', coalesce(_q, '')) AS tsq,
           lower(coalesce(_q, '')) AS qlower
  )
  SELECT
    p.id,
    CASE WHEN p.is_anonymous THEN NULL ELSE p.user_id END AS user_id,
    p.title, p.body, p.location, p.hashtags,
    p.like_count, p.comment_count, p.created_at,
    COALESCE(p.cover_url, (SELECT url FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1)) AS cover_url,
    COALESCE(p.cover_kind, (SELECT kind FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1)) AS cover_kind,
    (SELECT count(*)::int FROM public.post_media m WHERE m.post_id = p.id) AS media_count,
    p.is_anonymous, p.category,
    (
      CASE WHEN (SELECT tsq FROM q) @@ p.search_tsv
           THEN ts_rank(p.search_tsv, (SELECT tsq FROM q)) * 10
           ELSE 0 END
      + CASE WHEN lower(coalesce(p.title,'')) ILIKE '%' || (SELECT qlower FROM q) || '%' THEN 2 ELSE 0 END
      + CASE WHEN lower(coalesce(p.location,'')) ILIKE '%' || (SELECT qlower FROM q) || '%' THEN 1.5 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%') THEN 2 ELSE 0 END
      + (p.like_count + p.comment_count) * 0.01
    )::real AS rank
  FROM public.posts p
  WHERE p.is_hidden = false
    AND coalesce(_q, '') <> ''
    AND (
      (SELECT tsq FROM q) @@ p.search_tsv
      OR lower(coalesce(p.title,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR lower(coalesce(p.body,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR lower(coalesce(p.location,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%')
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;

REVOKE EXECUTE ON FUNCTION public.search_posts(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_posts(text, integer, integer) TO authenticated;