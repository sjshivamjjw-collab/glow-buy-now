DROP POLICY IF EXISTS "Read comments (mask anon author)" ON public.post_comments;

CREATE POLICY "Read comments (mask anon author)"
  ON public.post_comments FOR SELECT TO authenticated
  USING (
    is_anonymous = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_commenter text;
BEGIN
  SELECT user_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;

  IF COALESCE(NEW.is_anonymous, false) THEN
    v_commenter := 'Rippler';
  ELSE
    SELECT COALESCE(name, username, 'Someone') INTO v_commenter FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'comment', v_commenter || ' commented on your post', LEFT(NEW.body, 140), '/p/' || NEW.post_id::text);
  RETURN NEW;
END;
$$;

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

  IF COALESCE(NEW.is_anonymous, false) THEN
    v_author := 'Rippler';
  ELSE
    SELECT COALESCE(name, username, 'Someone') INTO v_author
    FROM public.profiles WHERE id = NEW.user_id;
  END IF;

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

  IF COALESCE(NEW.is_anonymous, false) THEN
    v_author := 'Rippler';
  ELSE
    SELECT COALESCE(name, username, 'Someone') INTO v_author
    FROM public.profiles WHERE id = NEW.user_id;
  END IF;

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