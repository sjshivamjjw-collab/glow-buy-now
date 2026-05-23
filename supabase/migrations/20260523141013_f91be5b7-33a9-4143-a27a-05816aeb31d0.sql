-- Search profiles for @mention autocomplete (any signed-in user can search)
CREATE OR REPLACE FUNCTION public.search_profiles_for_mention(_q text)
RETURNS TABLE(id uuid, username text, name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.username IS NOT NULL
    AND COALESCE(_q, '') <> ''
    AND (
      p.username ILIKE _q || '%'
      OR p.name ILIKE _q || '%'
      OR p.username ILIKE '%' || _q || '%'
    )
  ORDER BY
    CASE WHEN p.username ILIKE _q || '%' THEN 0
         WHEN p.name ILIKE _q || '%' THEN 1
         ELSE 2 END,
    p.username
  LIMIT 8;
$$;

-- Helper to extract @usernames from a text body
CREATE OR REPLACE FUNCTION public.extract_mention_usernames(_text text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT lower(m[1]))
     FROM regexp_matches(COALESCE(_text, ''), '@([a-zA-Z0-9_\.]{2,30})', 'g') AS m),
    '{}'::text[]
  );
$$;

-- Notify mentioned users on post insert
CREATE OR REPLACE FUNCTION public.notify_post_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unames text[];
  v_author text;
BEGIN
  v_unames := public.extract_mention_usernames(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, ''));
  IF v_unames IS NULL OR array_length(v_unames, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(name, username, 'Someone') INTO v_author
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  SELECT p.id,
         'mention',
         COALESCE(v_author, 'Someone') || ' mentioned you in a post',
         LEFT(COALESCE(NEW.title, NEW.body, ''), 140),
         '/p/' || NEW.id::text
  FROM public.profiles p
  WHERE lower(p.username) = ANY(v_unames)
    AND p.id <> NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mentions ON public.posts;
CREATE TRIGGER trg_notify_post_mentions
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_post_mentions();

-- Notify mentioned users on comment insert
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unames text[];
  v_author text;
BEGIN
  v_unames := public.extract_mention_usernames(NEW.body);
  IF v_unames IS NULL OR array_length(v_unames, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(name, username, 'Someone') INTO v_author
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  SELECT p.id,
         'mention',
         COALESCE(v_author, 'Someone') || ' mentioned you in a comment',
         LEFT(NEW.body, 140),
         '/p/' || NEW.post_id::text
  FROM public.profiles p
  WHERE lower(p.username) = ANY(v_unames)
    AND p.id <> NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_mentions ON public.post_comments;
CREATE TRIGGER trg_notify_comment_mentions
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions();