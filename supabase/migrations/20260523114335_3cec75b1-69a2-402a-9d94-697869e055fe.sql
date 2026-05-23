CREATE TABLE public.post_saves (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saves" ON public.post_saves
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can save as themselves" ON public.post_saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave own" ON public.post_saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_post_saves_user_created ON public.post_saves (user_id, created_at DESC);