
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigger-maintained tsvector (generated columns require IMMUTABLE; to_tsvector is only STABLE)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION public.posts_search_tsv_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.hashtags, '{}'::text[]), ' ')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.location, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'C');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS posts_search_tsv_trg ON public.posts;
CREATE TRIGGER posts_search_tsv_trg
BEFORE INSERT OR UPDATE OF title, body, hashtags, location ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_search_tsv_update();

-- Backfill existing rows
UPDATE public.posts SET search_tsv =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(hashtags, '{}'::text[]), ' ')), 'A') ||
  setweight(to_tsvector('simple', coalesce(location, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(body, '')), 'C')
WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS posts_search_tsv_idx ON public.posts USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx ON public.posts USING GIN (lower(coalesce(title,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS posts_location_trgm_idx ON public.posts USING GIN (lower(coalesce(location,'')) gin_trgm_ops);

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
    (SELECT url FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_url,
    (SELECT kind FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_kind,
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

CREATE OR REPLACE FUNCTION public.search_people(_q text, _limit integer DEFAULT 10)
RETURNS TABLE(id uuid, name text, username text, avatar_url text, score int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.username, p.avatar_url,
    (CASE WHEN p.username ILIKE _q || '%' THEN 3
          WHEN p.name ILIKE _q || '%' THEN 2
          WHEN p.username ILIKE '%' || _q || '%' THEN 1
          WHEN p.name ILIKE '%' || _q || '%' THEN 1
          ELSE 0 END) AS score
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND coalesce(_q,'') <> ''
    AND (p.username ILIKE '%' || _q || '%' OR p.name ILIKE '%' || _q || '%')
  ORDER BY score DESC, p.username NULLS LAST
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.search_hashtags(_q text, _limit integer DEFAULT 10)
RETURNS TABLE(tag text, post_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(t) AS tag, count(*) AS post_count
  FROM public.posts p, unnest(coalesce(p.hashtags,'{}'::text[])) AS t
  WHERE p.is_hidden = false
    AND coalesce(_q,'') <> ''
    AND lower(t) ILIKE '%' || lower(replace(_q, '#', '')) || '%'
  GROUP BY lower(t)
  ORDER BY post_count DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.search_locations(_q text, _limit integer DEFAULT 10)
RETURNS TABLE(location text, post_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.location, count(*) AS post_count
  FROM public.posts p
  WHERE p.is_hidden = false
    AND p.location IS NOT NULL
    AND coalesce(_q,'') <> ''
    AND lower(p.location) ILIKE '%' || lower(_q) || '%'
  GROUP BY p.location
  ORDER BY post_count DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_posts(text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_people(text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_hashtags(text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_locations(text,int) TO authenticated;
