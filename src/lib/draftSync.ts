// Cloud sync for the New-Post draft so the same user can pick up the draft
// on any device. Backed by `public.post_drafts` (one row per user) and the
// private `post-drafts` storage bucket (files under `{user_id}/...`).
//
// The page still caches everything locally for instant restore — this module
// is the "source of truth across devices" layer that runs in the background.

import { supabase } from '@/integrations/supabase/client';
import type { StoredMedia } from '@/lib/draftMediaStore';
import { getPlatform } from '@/lib/platform';

const BUCKET = 'post-drafts';

// JSON-safe shape we store under post_drafts.media. The file itself lives in
// storage; storage_path is how we re-download it on the other device.
interface RemoteMediaItem {
  id: string;
  kind: 'image' | 'video';
  storage_path: string;
  file_name: string;
  file_type: string;
  editor_state?: any;
}

export interface RemoteDraft {
  payload: any;             // PersistedDraft from CreatePostPage
  media: StoredMedia[];     // hydrated Blobs ready to feed into <PendingMedia>
  updated_at: string;       // ISO
  device_label: string | null;
}

const extFromName = (name: string, kind: 'image' | 'video') => {
  const e = (name.split('.').pop() || '').toLowerCase();
  if (e && /^[a-z0-9]{1,5}$/.test(e)) return e;
  return kind === 'video' ? 'mp4' : 'jpg';
};

const deviceLabel = () => {
  const p = getPlatform();
  if (p !== 'web') return p; // 'ios' | 'android'
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile web';
  return 'laptop';
};

export const loadRemoteDraft = async (userId: string): Promise<RemoteDraft | null> => {
  const { data, error } = await supabase
    .from('post_drafts' as any)
    .select('payload, media, updated_at, device_label')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  const remoteMedia: RemoteMediaItem[] = Array.isArray(row.media) ? row.media : [];

  // Download each media file in parallel.
  const downloaded = await Promise.all(remoteMedia.map(async (m): Promise<StoredMedia | null> => {
    try {
      const { data: blob, error: dErr } = await supabase.storage.from(BUCKET).download(m.storage_path);
      if (dErr || !blob || (blob as Blob).size === 0) return null;
      return {
        id: m.id,
        kind: m.kind,
        fileBlob: blob,
        fileName: m.file_name,
        fileType: m.file_type,
        editorState: m.editor_state,
      };
    } catch { return null; }
  }));

  return {
    payload: row.payload ?? {},
    media: downloaded.filter((x): x is StoredMedia => !!x),
    updated_at: row.updated_at,
    device_label: row.device_label ?? null,
  };
};

export const clearRemoteDraft = async (userId: string): Promise<void> => {
  try {
    // List & delete everything under {user_id}/
    const { data: list } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000 });
    if (list && list.length) {
      const paths = list.map(o => `${userId}/${o.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch { /* best effort */ }
  try {
    await supabase.from('post_drafts' as any).delete().eq('user_id', userId);
  } catch { /* best effort */ }
};

// Tracks which media ids have already been uploaded this session so we don't
// re-upload the same file on every keystroke.
const uploadedIds = new Map<string, string>(); // mediaId -> storage_path

export const resetSyncCache = () => uploadedIds.clear();

export const primeSyncCache = (items: RemoteMediaItem[]) => {
  uploadedIds.clear();
  items.forEach(m => uploadedIds.set(m.id, m.storage_path));
};

export interface SyncInput {
  payload: any;
  media: StoredMedia[];
}

const isEmptyDraft = (input: SyncInput) => {
  const p = input.payload || {};
  const hasText = !!(p.category || p.title || p.body || p.location || (p.hashtags && p.hashtags.length) || p.music);
  return !hasText && input.media.length === 0;
};

export const saveRemoteDraft = async (userId: string, input: SyncInput): Promise<void> => {
  if (isEmptyDraft(input)) {
    await clearRemoteDraft(userId);
    return;
  }

  // Upload any media not yet in storage. Idempotent by media.id.
  const remoteItems: RemoteMediaItem[] = [];
  for (const m of input.media) {
    let storage_path = uploadedIds.get(m.id);
    if (!storage_path) {
      storage_path = `${userId}/${m.id}.${extFromName(m.fileName, m.kind)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storage_path, m.fileBlob, {
        upsert: true,
        contentType: m.fileType || (m.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      });
      if (upErr) {
        // Skip this file rather than failing the whole save; will retry next debounce tick.
        continue;
      }
      uploadedIds.set(m.id, storage_path);
    }
    remoteItems.push({
      id: m.id,
      kind: m.kind,
      storage_path,
      file_name: m.fileName,
      file_type: m.fileType,
      editor_state: m.editorState,
    });
  }

  // Remove stale objects (media the user deleted locally).
  const keepPaths = new Set(remoteItems.map(r => r.storage_path));
  const stale: string[] = [];
  for (const [id, path] of uploadedIds.entries()) {
    if (!keepPaths.has(path)) {
      stale.push(path);
      uploadedIds.delete(id);
    }
  }
  if (stale.length) {
    try { await supabase.storage.from(BUCKET).remove(stale); } catch { /* ignore */ }
  }

  await supabase.from('post_drafts' as any).upsert({
    user_id: userId,
    payload: input.payload,
    media: remoteItems,
    device_label: deviceLabel(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
};
