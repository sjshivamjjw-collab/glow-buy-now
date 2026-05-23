
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read comment likes"
  ON public.post_comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like comments as themselves"
  ON public.post_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own comment likes"
  ON public.post_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.maintain_post_comment_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_post_comment_like_count ON public.post_comment_likes;
CREATE TRIGGER trg_post_comment_like_count
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.maintain_post_comment_like_count();

CREATE OR REPLACE FUNCTION public.notify_post_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid; v_post uuid; v_liker text;
BEGIN
  SELECT user_id, post_id INTO v_owner, v_post FROM public.post_comments WHERE id = NEW.comment_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(name, username, 'Someone') INTO v_liker FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'like', v_liker || ' liked your comment', '', '/p/' || v_post::text);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_comment_like ON public.post_comment_likes;
CREATE TRIGGER trg_notify_post_comment_like
AFTER INSERT ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment_like();
