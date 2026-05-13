DROP POLICY IF EXISTS "Creators upload community resources" ON storage.objects;
DROP POLICY IF EXISTS "Creators delete own community resources" ON storage.objects;

CREATE POLICY "Creators upload community resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-resources'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.creator_id = auth.uid()
      AND c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Creators delete own community resources"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-resources'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.creator_id = auth.uid()
      AND c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);