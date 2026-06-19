CREATE TABLE public.post_drafts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_drafts TO authenticated;
GRANT ALL ON public.post_drafts TO service_role;

ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own draft" ON public.post_drafts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_post_drafts_updated_at
  BEFORE UPDATE ON public.post_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for post-drafts bucket (bucket created via storage tool)
CREATE POLICY "Users read own draft media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-drafts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own draft media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-drafts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own draft media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-drafts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own draft media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-drafts' AND auth.uid()::text = (storage.foldername(name))[1]);