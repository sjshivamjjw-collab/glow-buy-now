import { supabase } from '@/integrations/supabase/client';

// Extracts the storage path from either a public URL or a raw path. Works for
// the legacy public URLs we used to store as well as new path-only values.
export const extractStoragePath = (rawUrlOrPath: string, bucket: string): string => {
  if (!rawUrlOrPath) return rawUrlOrPath;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const signMarker = `/storage/v1/object/sign/${bucket}/`;
  const renderMarker = `/storage/v1/render/image/public/${bucket}/`;
  for (const marker of [publicMarker, signMarker, renderMarker]) {
    const idx = rawUrlOrPath.indexOf(marker);
    if (idx >= 0) {
      const tail = rawUrlOrPath.slice(idx + marker.length);
      // Strip any query string (signed URLs carry ?token=...).
      return tail.split('?')[0];
    }
  }
  return rawUrlOrPath;
};

// In-memory cache of signed URLs so navigating the feed doesn't trigger a
// per-image round-trip to Supabase on every component mount. Keyed by
// bucket+path; entries auto-expire 10 min before the signed URL itself does.
interface CachedSignedUrl { url: string; expiresAt: number }
const signedCache = new Map<string, CachedSignedUrl>();

export const getSignedUrl = async (
  bucket: string,
  rawUrlOrPath: string,
  expiresInSeconds = 3600,
): Promise<string | null> => {
  const path = extractStoragePath(rawUrlOrPath, bucket);
  const key = `${bucket}::${path}`;
  const now = Date.now();
  const cached = signedCache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('createSignedUrl failed', bucket, path, error);
    return null;
  }
  const url = data?.signedUrl || null;
  if (url) {
    // Expire 60s before the server-side expiry to be safe.
    signedCache.set(key, { url, expiresAt: now + (expiresInSeconds - 60) * 1000 });
  }
  return url;
};

// Rewrites a public Supabase storage URL (or path) to use the on-the-fly
// image transformation endpoint, which serves a resized + re-compressed
// version. Cuts thumbnail bandwidth from MBs to KBs on user-uploaded photos.
// Returns the input unchanged for non-Supabase URLs or non-public buckets.
export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: 'cover' | 'contain' | 'fill';
}

export const optimizedImageUrl = (
  rawUrl: string | null | undefined,
  opts: ImageTransform = {},
): string | null => {
  if (!rawUrl) return rawUrl ?? null;
  // Only rewrite Supabase public-object URLs.
  const marker = '/storage/v1/object/public/';
  const idx = rawUrl.indexOf(marker);
  if (idx < 0) return rawUrl;
  const base = rawUrl.slice(0, idx);
  const tail = rawUrl.slice(idx + marker.length).split('?')[0];
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.resize) params.set('resize', opts.resize);
  const qs = params.toString();
  return `${base}/storage/v1/render/image/public/${tail}${qs ? `?${qs}` : ''}`;
};
