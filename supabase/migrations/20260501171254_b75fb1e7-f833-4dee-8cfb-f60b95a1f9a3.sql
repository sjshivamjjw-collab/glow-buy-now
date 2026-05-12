DROP POLICY IF EXISTS "Sellers can upload own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view livestream thumbnails" ON storage.objects;

CREATE POLICY "Livestream thumbnails are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'livestream-thumbnails');

CREATE POLICY "Users can upload livestream thumbnails to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'livestream-thumbnails'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can update own livestream thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'livestream-thumbnails'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can delete own livestream thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'livestream-thumbnails'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);