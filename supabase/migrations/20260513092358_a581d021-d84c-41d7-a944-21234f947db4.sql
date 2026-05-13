-- Allow public read of community cover images (named like "{creator_id}/cover-*") in the
-- community-media bucket so existing covers still render after the bucket was made private.
-- Chat/DM attachments live at "{community_id}/..." paths so they remain members-only.
CREATE POLICY "Community covers are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'community-media'
  AND name LIKE '%/cover-%'
);