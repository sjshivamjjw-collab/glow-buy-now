ALTER TABLE public.reel_submissions
  ADD COLUMN IF NOT EXISTS delivered_file_path text,
  ADD COLUMN IF NOT EXISTS delivered_file_name text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE POLICY "Admins upload reel files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reel-submissions' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update reel files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'reel-submissions' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'reel-submissions' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete reel files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reel-submissions' AND public.has_role(auth.uid(), 'admin'::public.app_role));