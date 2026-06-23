
-- Submissions table
CREATE TABLE public.reel_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text NOT NULL,
  trip_title text NOT NULL,
  duration_label text NOT NULL,
  duration_days int,
  cost_text text,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  itinerary_enabled boolean NOT NULL DEFAULT false,
  itinerary_kind text CHECK (itinerary_kind IN ('day','place')),
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  editor_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_submissions TO authenticated;
GRANT ALL ON public.reel_submissions TO service_role;

ALTER TABLE public.reel_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reel submissions"
  ON public.reel_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own reel submissions"
  ON public.reel_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all reel submissions"
  ON public.reel_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update all reel submissions"
  ON public.reel_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_reel_submissions_updated_at
  BEFORE UPDATE ON public.reel_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Media table
CREATE TABLE public.reel_submission_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.reel_submissions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reel_submission_media_submission ON public.reel_submission_media(submission_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_submission_media TO authenticated;
GRANT ALL ON public.reel_submission_media TO service_role;

ALTER TABLE public.reel_submission_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert media for own submission"
  ON public.reel_submission_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.reel_submissions s
    WHERE s.id = submission_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users view media for own submission"
  ON public.reel_submission_media FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reel_submissions s
    WHERE s.id = submission_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all submission media"
  ON public.reel_submission_media FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Storage policies for reel-submissions bucket
-- Path convention: {auth.uid()}/{submission_id}/{filename}
CREATE POLICY "Owners upload to own reel folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reel-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners read own reel files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reel-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all reel files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reel-submissions'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
