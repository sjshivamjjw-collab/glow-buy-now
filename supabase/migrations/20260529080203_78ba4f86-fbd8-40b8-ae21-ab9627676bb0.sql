CREATE OR REPLACE FUNCTION public.get_post_public(_post_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  body text,
  location text,
  hashtags text[],
  category text,
  review_subcategory text,
  review_recommendation text,
  like_count integer,
  comment_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  music_url text,
  music_title text,
  is_anonymous boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    CASE WHEN p.is_anonymous THEN NULL ELSE p.user_id END AS user_id,
    p.title,
    p.body,
    p.location,
    p.hashtags,
    p.category,
    p.review_subcategory,
    p.review_recommendation,
    p.like_count,
    p.comment_count,
    p.created_at,
    p.updated_at,
    p.music_url,
    p.music_title,
    p.is_anonymous
  FROM public.posts p
  WHERE p.id = _post_id
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_post_public(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_post_comments_public(_post_id uuid)
RETURNS TABLE(
  id uuid,
  post_id uuid,
  user_id uuid,
  body text,
  created_at timestamp with time zone,
  parent_id uuid,
  like_count integer,
  is_anonymous boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.post_id,
    CASE WHEN c.is_anonymous THEN NULL ELSE c.user_id END AS user_id,
    c.body,
    c.created_at,
    c.parent_id,
    c.like_count,
    c.is_anonymous
  FROM public.post_comments c
  JOIN public.posts p ON p.id = c.post_id
  WHERE c.post_id = _post_id
  ORDER BY c.created_at ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_post_comments_public(uuid) TO authenticated;