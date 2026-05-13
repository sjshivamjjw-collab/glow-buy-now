import { supabase } from '@/integrations/supabase/client';

// Extracts the storage path from either a public URL or a raw path. Works for
// the legacy public URLs we used to store as well as new path-only values.
export const extractStoragePath = (rawUrlOrPath: string, bucket: string): string => {
  if (!rawUrlOrPath) return rawUrlOrPath;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const signMarker = `/storage/v1/object/sign/${bucket}/`;
  for (const marker of [publicMarker, signMarker]) {
    const idx = rawUrlOrPath.indexOf(marker);
    if (idx >= 0) {
      const tail = rawUrlOrPath.slice(idx + marker.length);
      // Strip any query string (signed URLs carry ?token=...).
      return tail.split('?')[0];
    }
  }
  return rawUrlOrPath;
};

export const getSignedUrl = async (
  bucket: string,
  rawUrlOrPath: string,
  expiresInSeconds = 3600,
): Promise<string | null> => {
  const path = extractStoragePath(rawUrlOrPath, bucket);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('createSignedUrl failed', bucket, path, error);
    return null;
  }
  return data?.signedUrl || null;
};
