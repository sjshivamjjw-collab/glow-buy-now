
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx ON public.posts USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_location_trgm_idx ON public.posts USING gin (lower(location) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_body_trgm_idx ON public.posts USING gin (lower(body) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_name_trgm_idx ON public.profiles USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_posts(_q text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, title text, body text, location text, hashtags text[], like_count integer, comment_count integer, created_at timestamp with time zone, cover_url text, cover_kind text, media_count integer, is_anonymous boolean, category text, rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT
      websearch_to_tsquery('english', coalesce(_q, '')) AS tsq,
      (
        SELECT to_tsquery('english', string_agg(token || ':*', ' & '))
        FROM (
          SELECT regexp_replace(t, '[^a-zA-Z0-9]', '', 'g') AS token
          FROM regexp_split_to_table(lower(coalesce(_q,'')), '\s+') AS t
          WHERE length(regexp_replace(t, '[^a-zA-Z0-9]', '', 'g')) > 0
        ) toks
      ) AS tsq_prefix,
      lower(coalesce(_q, '')) AS qlower,
      CASE WHEN length(coalesce(_q,'')) <= 4 THEN 0.5
           WHEN length(coalesce(_q,'')) <= 8 THEN 0.4
           ELSE 0.3 END AS fuzzy_threshold
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
           THEN ts_rank(p.search_tsv, (SELECT tsq FROM q)) * 10 ELSE 0 END
      + CASE WHEN (SELECT tsq_prefix FROM q) IS NOT NULL AND (SELECT tsq_prefix FROM q) @@ p.search_tsv
             THEN ts_rank(p.search_tsv, (SELECT tsq_prefix FROM q)) * 5 ELSE 0 END
      + CASE WHEN lower(coalesce(p.title,'')) ILIKE '%' || (SELECT qlower FROM q) || '%' THEN 2 ELSE 0 END
      + CASE WHEN lower(coalesce(p.location,'')) ILIKE '%' || (SELECT qlower FROM q) || '%' THEN 1.5 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%') THEN 2 ELSE 0 END
      + GREATEST(
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.title,''))) * 3,
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.location,''))) * 2.5,
          COALESCE((SELECT max(word_similarity((SELECT qlower FROM q), lower(t))) FROM unnest(coalesce(p.hashtags,'{}'::text[])) AS t), 0) * 2.5,
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.body,''))) * 1
        )
      + (p.like_count + p.comment_count) * 0.01
    )::real AS rank
  FROM public.posts p
  WHERE p.is_hidden = false
    AND coalesce(_q, '') <> ''
    AND (
      (SELECT tsq FROM q) @@ p.search_tsv
      OR ((SELECT tsq_prefix FROM q) IS NOT NULL AND (SELECT tsq_prefix FROM q) @@ p.search_tsv)
      OR lower(coalesce(p.title,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR lower(coalesce(p.body,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR lower(coalesce(p.location,'')) ILIKE '%' || (SELECT qlower FROM q) || '%'
      OR EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%')
      OR word_similarity((SELECT qlower FROM q), lower(coalesce(p.title,''))) >= (SELECT fuzzy_threshold FROM q)
      OR word_similarity((SELECT qlower FROM q), lower(coalesce(p.location,''))) >= (SELECT fuzzy_threshold FROM q)
      OR EXISTS (
        SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t
        WHERE word_similarity((SELECT qlower FROM q), lower(t)) >= (SELECT fuzzy_threshold FROM q)
      )
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;

DROP FUNCTION IF EXISTS public.search_people(text, integer);

CREATE OR REPLACE FUNCTION public.search_people(_q text, _limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, username text, avatar_url text, score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT lower(coalesce(_q,'')) AS qlower,
           CASE WHEN length(coalesce(_q,'')) <= 4 THEN 0.5
                WHEN length(coalesce(_q,'')) <= 8 THEN 0.4
                ELSE 0.3 END AS fuzzy_threshold
  )
  SELECT p.id, p.name, p.username, p.avatar_url,
    (
      CASE WHEN lower(p.username) LIKE (SELECT qlower FROM q) || '%' THEN 3
           WHEN lower(p.name) LIKE (SELECT qlower FROM q) || '%' THEN 2
           WHEN lower(p.username) LIKE '%' || (SELECT qlower FROM q) || '%' THEN 1
           WHEN lower(p.name) LIKE '%' || (SELECT qlower FROM q) || '%' THEN 1
           ELSE 0 END
      + GREATEST(
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.username,''))),
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.name,'')))
        )
    )::real AS score
  FROM public.profiles p, q
  WHERE auth.uid() IS NOT NULL
    AND q.qlower <> ''
    AND (
      lower(p.username) ILIKE '%' || q.qlower || '%'
      OR lower(p.name) ILIKE '%' || q.qlower || '%'
      OR word_similarity(q.qlower, lower(coalesce(p.username,''))) >= q.fuzzy_threshold
      OR word_similarity(q.qlower, lower(coalesce(p.name,''))) >= q.fuzzy_threshold
    )
  ORDER BY score DESC, p.username NULLS LAST
  LIMIT _limit;
$function$;
