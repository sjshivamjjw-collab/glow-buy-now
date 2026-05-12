DROP POLICY IF EXISTS "Users can upload livestream thumbnails to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Livestream thumbnails are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete own livestream thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view livestream thumbnails" ON storage.objects;

INSERT INTO storage.buckets (id, name, public)
VALUES ('livestream-thumbnails', 'livestream-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Anyone can view livestream thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'livestream-thumbnails');

CREATE POLICY "Sellers can upload livestream thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'livestream-thumbnails'
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

CREATE POLICY "Sellers can update own livestream thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'livestream-thumbnails'
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'livestream-thumbnails'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Sellers can delete own livestream thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'livestream-thumbnails'
  AND owner_id = auth.uid()::text
);