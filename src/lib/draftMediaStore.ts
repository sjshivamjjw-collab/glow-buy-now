// Persists New-Post media (and any layout editor state) across reloads so
// drafts survive even when the user closes the app. Uses IndexedDB because
// Files / Blobs can't be stored in localStorage.
import type { LayoutEditorState } from '@/lib/composeLayout';

const DB_NAME = 'ripple-draft';
const STORE = 'media';
const KEY = 'current';

export interface StoredMedia {
  id: string;
  kind: 'image' | 'video';
  fileBlob: Blob;
  fileName: string;
  fileType: string;
  editorState?: SerializedEditorState;
}

type SerializedEditorState =
  | { kind: 'single'; slides: { id: string; fileBlob: Blob; fileName: string; fileType: string; overlays: any[]; posX?: number; posY?: number; scale?: number }[] }
  | { kind: 'grid'; cells: { fileBlob: Blob; fileName: string; fileType: string; posX: number; posY: number; scale: number }[]; overlays: any[] }
  | { kind: 'cost'; headerL: string; headerR: string; rows: { left: string; right: string }[] };

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('No IndexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveDraftMedia = async (items: StoredMedia[]): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(items, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {/* best effort */}
};

export const loadDraftMedia = async (): Promise<StoredMedia[]> => {
  try {
    const db = await openDb();
    const result = await new Promise<StoredMedia[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as StoredMedia[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
};

export const clearDraftMedia = async (): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {/* best effort */}
};

// ─── Editor-state serialization ──────────────────────────────────────────────
// LayoutEditorState contains File objects for the original photos; we strip
// them into Blob + name + type so they round-trip through IndexedDB cleanly.
export const serializeEditorState = (s: LayoutEditorState): SerializedEditorState => {
  if (s.kind === 'single') {
    return {
      kind: 'single',
      slides: s.slides.map(sl => ({
        id: sl.id,
        fileBlob: sl.file,
        fileName: sl.file.name,
        fileType: sl.file.type,
        overlays: sl.overlays,
        posX: sl.posX,
        posY: sl.posY,
        scale: sl.scale,
      })),
    };
  }
  if (s.kind === 'grid') {
    return {
      kind: 'grid',
      overlays: s.overlays,
      cells: s.cells.map(c => ({
        fileBlob: c.file,
        fileName: c.file.name,
        fileType: c.file.type,
        posX: c.posX,
        posY: c.posY,
        scale: c.scale,
      })),
    };
  }
  return { kind: 'cost', headerL: s.headerL, headerR: s.headerR, rows: s.rows };
};

const isValidBlob = (b: unknown): b is Blob =>
  !!b && typeof (b as Blob).size === 'number' && (b as Blob).size > 0;

export const deserializeEditorState = (s: SerializedEditorState): LayoutEditorState | undefined => {
  if (s.kind === 'single') {
    const slides = s.slides
      .filter(sl => isValidBlob(sl.fileBlob))
      .map(sl => ({
        id: sl.id,
        file: new File([sl.fileBlob], sl.fileName || 'photo.jpg', { type: sl.fileType || 'image/jpeg' }),
        overlays: sl.overlays as any,
      }));
    if (!slides.length) return undefined;
    return { kind: 'single', slides };
  }
  if (s.kind === 'grid') {
    const cells = s.cells
      .filter(c => isValidBlob(c.fileBlob))
      .map(c => ({
        file: new File([c.fileBlob], c.fileName || 'photo.jpg', { type: c.fileType || 'image/jpeg' }),
        posX: c.posX,
        posY: c.posY,
        scale: c.scale,
      }));
    if (cells.length !== s.cells.length || cells.length === 0) return undefined;
    return { kind: 'grid', overlays: s.overlays as any, cells };
  }
  return { kind: 'cost', headerL: s.headerL, headerR: s.headerR, rows: s.rows };
};

