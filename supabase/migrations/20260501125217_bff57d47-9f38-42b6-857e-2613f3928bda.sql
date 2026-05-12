INSERT INTO storage.buckets (id, name, public) VALUES ('livestream-thumbnails', 'livestream-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view livestream thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'livestream-thumbnails');

CREATE POLICY "Sellers can upload own livestream thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'livestream-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can update own livestream thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'livestream-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Sellers can delete own livestream thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'livestream-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);