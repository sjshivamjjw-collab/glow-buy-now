ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS music_title text;

CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);