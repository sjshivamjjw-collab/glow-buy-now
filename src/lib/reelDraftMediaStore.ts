// Persists Create-Reel media across navigation/reloads. Files/Blobs can't
// live in localStorage, so we use IndexedDB. Separate from the post draft
// store so the two flows don't trample each other.

const DB_NAME = 'ripple-reel-draft';
const STORE = 'media';
const KEY = 'current';

export interface StoredReelMedia {
  id: string;
  kind: 'image' | 'video';
  fileBlob: Blob;
  fileName: string;
  fileType: string;
  caption: string;
}

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

export const saveReelDraftMedia = async (items: StoredReelMedia[]): Promise<void> => {
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

export const loadReelDraftMedia = async (): Promise<StoredReelMedia[]> => {
  try {
    const db = await openDb();
    const result = await new Promise<StoredReelMedia[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as StoredReelMedia[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
};

export const clearReelDraftMedia = async (): Promise<void> => {
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
