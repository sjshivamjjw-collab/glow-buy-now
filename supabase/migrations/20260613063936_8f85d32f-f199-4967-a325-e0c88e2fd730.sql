
-- Location canonicalization: normalize variants so "Bombay", "mumbai", "Mumbai, India" all match.

CREATE OR REPLACE FUNCTION public.normalize_location(_loc text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
  parts text[];
  out_parts text[] := '{}';
  part text;
  alias_map jsonb := '{
    "bombay": "mumbai",
    "bangalore": "bengaluru",
    "calcutta": "kolkata",
    "madras": "chennai",
    "gurgaon": "gurugram",
    "trivandrum": "thiruvananthapuram",
    "pondicherry": "puducherry",
    "cochin": "kochi",
    "mysore": "mysuru",
    "baroda": "vadodara",
    "poona": "pune",
    "benares": "varanasi",
    "banaras": "varanasi",
    "allahabad": "prayagraj",
    "nyc": "new york",
    "ny": "new york",
    "sf": "san francisco",
    "la": "los angeles",
    "blr": "bengaluru",
    "del": "delhi",
    "new delhi": "delhi",
    "bom": "mumbai",
    "uk": "united kingdom",
    "usa": "united states",
    "us": "united states",
    "uae": "united arab emirates"
  }'::jsonb;
BEGIN
  IF _loc IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(_loc));
  IF s = '' THEN RETURN NULL; END IF;
  -- collapse whitespace, strip punctuation except commas
  s := regexp_replace(s, '[^a-z0-9, ]+', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  parts := string_to_array(s, ',');
  FOREACH part IN ARRAY parts LOOP
    part := trim(part);
    IF part = '' THEN CONTINUE; END IF;
    IF alias_map ? part THEN
      part := alias_map ->> part;
    END IF;
    -- de-dup consecutive
    IF array_length(out_parts, 1) IS NULL OR out_parts[array_length(out_parts,1)] <> part THEN
      out_parts := array_append(out_parts, part);
    END IF;
  END LOOP;
  RETURN array_to_string(out_parts, ', ');
END;
$$;

-- Add a generated normalized column for indexing + fast match
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS location_norm text
  GENERATED ALWAYS AS (public.normalize_location(location)) STORED;

CREATE INDEX IF NOT EXISTS posts_location_norm_trgm_idx
  ON public.posts USING gin (location_norm gin_trgm_ops);

-- Update tsv trigger to also index normalized location with weight B
CREATE OR REPLACE FUNCTION public.posts_search_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.hashtags, '{}'::text[]), ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(public.normalize_location(NEW.location), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'C');
  RETURN NEW;
END $$;

-- Rebuild tsv to incorporate normalized location
UPDATE public.posts SET title = title;

-- Update search_posts to use canonicalized location
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
      coalesce(public.normalize_location(_q), '') AS qnorm,
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
      + CASE WHEN (SELECT qnorm FROM q) <> '' AND coalesce(p.location_norm,'') ILIKE '%' || (SELECT qnorm FROM q) || '%' THEN 2.5 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%') THEN 2 ELSE 0 END
      + GREATEST(
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.title,''))) * 3,
          word_similarity((SELECT qlower FROM q), lower(coalesce(p.location,''))) * 2.5,
          word_similarity((SELECT qnorm FROM q), coalesce(p.location_norm,'')) * 3,
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
      OR ((SELECT qnorm FROM q) <> '' AND coalesce(p.location_norm,'') ILIKE '%' || (SELECT qnorm FROM q) || '%')
      OR EXISTS (SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t WHERE lower(t) ILIKE '%' || (SELECT qlower FROM q) || '%')
      OR word_similarity((SELECT qlower FROM q), lower(coalesce(p.title,''))) >= (SELECT fuzzy_threshold FROM q)
      OR word_similarity((SELECT qlower FROM q), lower(coalesce(p.location,''))) >= (SELECT fuzzy_threshold FROM q)
      OR ((SELECT qnorm FROM q) <> '' AND word_similarity((SELECT qnorm FROM q), coalesce(p.location_norm,'')) >= (SELECT fuzzy_threshold FROM q))
      OR EXISTS (
        SELECT 1 FROM unnest(coalesce(p.hashtags,'{}'::text[])) t
        WHERE word_similarity((SELECT qlower FROM q), lower(t)) >= (SELECT fuzzy_threshold FROM q)
      )
    )
  ORDER BY rank DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;
