
-- 1. post_views table
CREATE TABLE public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX post_views_post_viewer_uidx
  ON public.post_views (post_id, viewer_id) WHERE viewer_id IS NOT NULL;
CREATE UNIQUE INDEX post_views_post_session_uidx
  ON public.post_views (post_id, session_key) WHERE viewer_id IS NULL AND session_key IS NOT NULL;
CREATE INDEX post_views_post_idx ON public.post_views (post_id);

GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT SELECT, INSERT ON public.post_views TO anon;
GRANT ALL ON public.post_views TO service_role;

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
  ON public.post_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (viewer_id IS NULL AND session_key IS NOT NULL)
    OR (viewer_id = auth.uid())
  );

CREATE POLICY "Authors can see views on their posts"
  ON public.post_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_views.post_id AND p.user_id = auth.uid())
  );

-- 2. Denormalized counts on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count integer NOT NULL DEFAULT 0;

-- 3. Trigger: maintain view_count
CREATE OR REPLACE FUNCTION public.maintain_post_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END $$;

CREATE TRIGGER post_views_count_trg
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.maintain_post_view_count();

-- 4. Trigger: maintain save_count from post_saves
CREATE OR REPLACE FUNCTION public.maintain_post_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER post_saves_count_trg
AFTER INSERT OR DELETE ON public.post_saves
FOR EACH ROW EXECUTE FUNCTION public.maintain_post_save_count();

-- 5. Backfill save_count
UPDATE public.posts p SET save_count = COALESCE(sub.c, 0)
FROM (SELECT post_id, count(*)::int AS c FROM public.post_saves GROUP BY post_id) sub
WHERE p.id = sub.post_id;
