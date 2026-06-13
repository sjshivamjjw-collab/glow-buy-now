import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { invalidatePostDetail, invalidateTrending } from '@/lib/feedCache';
import { ArrowLeft, Loader2, MapPin, Hash, X, Check, ImagePlus, Tag, Pencil, ChevronLeft, ChevronRight, Crop } from 'lucide-react';
import { extractStoragePath } from '@/lib/storageUrls';
import RichTextEditor, { type RichTextEditorHandle } from '@/components/RichTextEditor';
import TravelStructureHelper, { buildPillSnippet } from '@/components/TravelStructureHelper';
import { markdownToHtml, isRichTextEmpty } from '@/lib/richText';
import { ImageCropperDialog } from '@/components/ImageCropperDialog';
import { LayoutPickerSheet, type LayoutChoice } from '@/components/createpost/LayoutPickerSheet';
import { SingleImageTextEditor } from '@/components/createpost/SingleImageTextEditor';
import { GridTextEditor } from '@/components/createpost/GridTextEditor';
import { CostBreakdownEditor } from '@/components/createpost/CostBreakdownEditor';
import type { LayoutEditorState } from '@/lib/composeLayout';

type CategoryKey = 'everyday_vibes' | 'trip' | 'review' | 'real_talk' | 'hidden_gems';
type ReviewSubKey = 'restaurant' | 'hotel' | 'product' | 'media' | 'activity';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  everyday_vibes: 'Daily Life',
  trip: 'Travel Diaries',
  hidden_gems: 'Work Diaries',
  review: 'Review',
  real_talk: 'Advice and Tips',
};
const REVIEW_SUB_LABELS: Record<ReviewSubKey, string> = {
  restaurant: 'Restaurant / Bar / Food Joint',
  hotel: 'Hotel / Stay / Hostel',
  product: 'Product',
  media: 'Places and Institutions',
  activity: 'Activity / Experience / Event',
};

const TITLE_MAX = 90;
const MAX_FILES = 18;
const MAX_FILE_MB = 50;

interface ExistingMedia {
  id: string;
  url: string;
  kind: 'image' | 'video';
  sort_order: number;
}

interface NewMedia {
  tempId: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  editorState?: LayoutEditorState;
}

const EditPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, isAdmin } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  const [location, setLocation] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  const [existing, setExisting] = useState<ExistingMedia[]>([]);
  const [originalFirstUrl, setOriginalFirstUrl] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newMedia, setNewMedia] = useState<NewMedia[]>([]);
  // Combined visual order across existing + newly uploaded media.
  // Lets the user reorder a freshly-added image into slot #1 (the cover).
  const [order, setOrder] = useState<Array<{ k: 'e' | 'n'; key: string }>>([]);
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);

  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [reviewSub, setReviewSub] = useState<ReviewSubKey | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
      if (!data) { setLoading(false); setNotAllowed(true); return; }
      const p: any = data;
      if (p.user_id !== userId && !isAdmin) { setNotAllowed(true); setLoading(false); return; }
      setTitle(p.title || '');
      {
        const raw = p.body || '';
        const isHtml = /<(strong|b|em|i|u|br|div|p|span)\b/i.test(raw);
        setBody(isHtml ? raw : (raw ? markdownToHtml(raw) : ''));
      }
      setLocation(p.location || '');
      setHashtags(p.hashtags || []);
      setCategory((p.category as CategoryKey) || null);
      setReviewSub((p.review_subcategory as ReviewSubKey) || null);

      const { data: mediaRows } = await supabase
        .from('post_media' as any)
        .select('id, url, kind, sort_order')
        .eq('post_id', id)
        .order('sort_order', { ascending: true });
      const rows = (mediaRows as any[] || []).map(m => ({
        id: m.id, url: m.url, kind: m.kind as 'image' | 'video', sort_order: m.sort_order,
      }));
      setExisting(rows);
      setOrder(rows.map(r => ({ k: 'e' as const, key: r.id })));
      setOriginalFirstUrl(rows[0]?.url ?? null);
      setLoading(false);
    };
    load();
  }, [id, userId, isAdmin]);

  const commitHashtag = () => {
    const raw = hashtagInput.trim().replace(/^#+/, '').toLowerCase();
    if (!raw) return;
    if (hashtags.includes(raw)) { setHashtagInput(''); return; }
    setHashtags(prev => [...prev, raw].slice(0, 20));
    setHashtagInput('');
  };

  const handleHashtagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitHashtag();
    } else if (e.key === 'Backspace' && !hashtagInput && hashtags.length) {
      setHashtags(prev => prev.slice(0, -1));
    }
  };

  const totalMedia = existing.length + newMedia.length;

  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const currentCropFile = cropQueue[0] ?? null;
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverTempId, setCoverTempId] = useState<string | null>(null);
  // Triggered when the image in slot #1 changes (reorder, delete, recrop tap).
  // Fetches existing-image URLs into a File so the cropper can open on them.
  const [recropFile, setRecropFile] = useState<File | null>(null);

  const urlToFile = async (url: string): Promise<File | null> => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      return new File([blob], 'cover-source.jpg', { type: blob.type || 'image/jpeg' });
    } catch (e) {
      console.warn('cover source fetch failed', e);
      return null;
    }
  };

  // Given the latest existing/newMedia state, open the cropper on whatever
  // image is in slot #1 (the post's cover). No-op when slot #1 is a video.
  const triggerCoverRecrop = async (
    nextExisting: ExistingMedia[],
    nextNew: NewMedia[],
  ) => {
    const firstExisting = nextExisting[0];
    if (firstExisting) {
      if (firstExisting.kind !== 'image') return;
      const f = await urlToFile(firstExisting.url);
      if (f) setRecropFile(f);
      return;
    }
    const firstNew = nextNew[0];
    if (firstNew && firstNew.kind === 'image') {
      setRecropFile(firstNew.file);
    }
  };

  const [layoutSheetOpen, setLayoutSheetOpen] = useState(false);
  const [activeLayout, setActiveLayout] = useState<LayoutChoice | null>(null);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);

  const addNewMediaFile = (file: File, editorState?: LayoutEditorState) => {
    const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    const entry: NewMedia = {
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      kind,
      editorState,
    };
    setNewMedia(prev => [...prev, entry]);
    setOrder(prev => [...prev, { k: 'n', key: entry.tempId }]);
    return entry.tempId;
  };

  const handleLayoutDone = (files: File[], states: LayoutEditorState[]) => {
    if (editingTempId) {
      const idx = newMedia.findIndex(m => m.tempId === editingTempId);
      if (idx !== -1 && files.length > 0) {
        const newUrl = URL.createObjectURL(files[0]);
        setNewMedia(prev => {
          const next = [...prev];
          URL.revokeObjectURL(next[idx].previewUrl);
          next[idx] = { ...next[idx], file: files[0], previewUrl: newUrl, editorState: states[0] };
          return next;
        });
        const extras = files.slice(1);
        const remaining = MAX_FILES - (existing.length + newMedia.length);
        extras.slice(0, Math.max(0, remaining)).forEach((f, i) => addNewMediaFile(f, states[i + 1]));
      }
      setEditingTempId(null);
      setActiveLayout(null);
      return;
    }
    const remaining = MAX_FILES - (existing.length + newMedia.length);
    const slice = files.slice(0, Math.max(0, remaining));
    if (slice.length < files.length) {
      toast({ title: `Only added ${slice.length} of ${files.length}`, description: `Max ${MAX_FILES} attachments per post.` });
    }
    slice.forEach((f, i) => addNewMediaFile(f, states[i]));
    setActiveLayout(null);
  };

  const startEditNewMedia = (m: NewMedia) => {
    if (!m.editorState) return;
    setEditingTempId(m.tempId);
    setActiveLayout(m.editorState.kind);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    Array.from(files).forEach(file => {
      if (totalMedia + accepted.length >= MAX_FILES) return;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${file.name} is too large`, description: `Max ${MAX_FILE_MB}MB per file`, variant: 'destructive' });
        return;
      }
      accepted.push(file);
    });
    const videos = accepted.filter(f => f.type.startsWith('video/'));
    const images = accepted.filter(f => !f.type.startsWith('video/'));
    videos.forEach(f => addNewMediaFile(f));
    // Only crop the cover (first image overall) to 4:5 for the Discover grid.
    const needsCover = existing.length === 0 && newMedia.length === 0 && cropQueue.length === 0;
    if (images.length) {
      if (needsCover) {
        const [cover, ...rest] = images;
        setCropQueue(prev => [...prev, cover]);
        rest.forEach(f => addNewMediaFile(f));
      } else {
        images.forEach(f => addNewMediaFile(f));
      }
    }
  };

  const handleCropApply = (croppedFile: File) => {
    const originalCover = cropQueue[0];
    if (originalCover) {
      const tempId = addNewMediaFile(originalCover);
      setCoverFile(croppedFile);
      setCoverTempId(tempId);
    } else {
      addNewMediaFile(croppedFile);
    }
    setCropQueue(prev => prev.slice(1));
  };

  const handleCropCancel = () => {
    setCropQueue(prev => prev.slice(1));
  };

  const removeExisting = (m: ExistingMedia) => {
    const wasFirst = existing[0]?.id === m.id;
    const nextExisting = existing.filter(x => x.id !== m.id);
    setExisting(nextExisting);
    setRemovedIds(prev => [...prev, m.id]);
    const path = extractStoragePath(m.url, 'post-media');
    if (path) setRemovedPaths(prev => [...prev, path]);
    if (wasFirst) {
      // The slot-#1 image just changed — clear any stale cover and re-crop the new first.
      setCoverFile(null);
      setCoverTempId(null);
      triggerCoverRecrop(nextExisting, newMedia);
    }
  };

  const removeNew = (tempId: string) => {
    const wasFirstOverall = existing.length === 0 && newMedia[0]?.tempId === tempId;
    const target = newMedia.find(x => x.tempId === tempId);
    if (target) URL.revokeObjectURL(target.previewUrl);
    if (tempId === coverTempId) {
      setCoverFile(null);
      setCoverTempId(null);
    }
    const nextNew = newMedia.filter(x => x.tempId !== tempId);
    setNewMedia(nextNew);
    if (wasFirstOverall) {
      setCoverFile(null);
      setCoverTempId(null);
      triggerCoverRecrop(existing, nextNew);
    }
  };

  const moveExisting = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= existing.length) return;
    const next = [...existing];
    [next[idx], next[j]] = [next[j], next[idx]];
    setExisting(next);
    if (idx === 0 || j === 0) {
      // Slot #1 changed — recrop the new first image.
      setCoverFile(null);
      setCoverTempId(null);
      triggerCoverRecrop(next, newMedia);
    }
  };

  const moveNew = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= newMedia.length) return;
    const next = [...newMedia];
    [next[idx], next[j]] = [next[j], next[idx]];
    setNewMedia(next);
    // Only matters for the cover when there are no existing images in front.
    if (existing.length === 0 && (idx === 0 || j === 0)) {
      setCoverFile(null);
      setCoverTempId(null);
      triggerCoverRecrop(existing, next);
    }
  };

  const handleSave = async () => {
    if (!id || !userId) return;
    if (!title.trim()) { toast({ title: 'Add a title', variant: 'destructive' }); return; }
    if (isRichTextEmpty(body)) { toast({ title: 'Add a description', variant: 'destructive' }); return; }
    
    setSaving(true);
    try {
      // 1. Delete removed media rows + storage files
      if (removedIds.length) {
        const { error: delErr } = await supabase.from('post_media' as any).delete().in('id', removedIds);
        if (delErr) throw delErr;
      }
      if (removedPaths.length) {
        await supabase.storage.from('post-media').remove(removedPaths);
      }

      // Dedicated Discover cover: upload the user's selected portrait crop
      // separately so the original post media remains unchanged in the post.
      let coverUpdate: Record<string, string | null> | null = null;
      if (coverFile) {
        const coverPath = `${userId}/${id}/cover-${Date.now()}.jpg`;
        const { error: coverUpErr } = await supabase.storage.from('post-media').upload(coverPath, coverFile, {
          contentType: coverFile.type || 'image/jpeg', upsert: false,
        });
        if (coverUpErr) throw coverUpErr;
        coverUpdate = {
          cover_url: supabase.storage.from('post-media').getPublicUrl(coverPath).data.publicUrl,
          cover_kind: 'image',
        };
      } else {
        // Any media change (removal, reorder, or new upload) should clear the
        // dedicated cover so the feed falls back to the (new) first post_media row.
        const reordered = existing.some((m, i) => m.sort_order !== i);
        const mediaChanged =
          removedIds.length > 0 ||
          newMedia.length > 0 ||
          reordered ||
          (existing[0]?.url ?? null) !== originalFirstUrl;
        if (mediaChanged) {
          coverUpdate = { cover_url: null, cover_kind: null };
        }
      }

      // If the user removed the original first image and uploaded new media,
      // treat the new media as the replacement first slot so the feed cover
      // reflects what they actually uploaded.
      const originalFirstRemoved =
        originalFirstUrl !== null && !existing.some(m => m.url === originalFirstUrl);
      const newAtStart = originalFirstRemoved && newMedia.length > 0;
      const existingStart = newAtStart ? newMedia.length : 0;
      const newStart = newAtStart ? 0 : existing.length;

      // 2. Reorder remaining existing media
      for (let i = 0; i < existing.length; i++) {
        const m = existing[i];
        const target = existingStart + i;
        if (m.sort_order !== target) {
          await supabase.from('post_media' as any).update({ sort_order: target }).eq('id', m.id);
        }
      }

      // 3. Upload new media
      for (let i = 0; i < newMedia.length; i++) {
        const m = newMedia[i];
        const order = newStart + i;
        const ext = m.file.name.split('.').pop() || (m.kind === 'video' ? 'mp4' : 'jpg');
        const path = `${userId}/${id}/${order}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, m.file, {
          contentType: m.file.type || undefined, upsert: false,
        });
        if (upErr) throw upErr;
        const url = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
        const { error: mErr } = await supabase.from('post_media' as any).insert({
          post_id: id, url, kind: m.kind, sort_order: order,
        });
        if (mErr) throw mErr;
      }


      // 4. Update post fields
      const { error } = await supabase.from('posts' as any).update({
        title: title.trim(),
        body: isRichTextEmpty(body) ? null : body,
        location: location.trim() || null,
        hashtags,
        ...(coverUpdate || {}),
        ...(isAdmin ? {
          category,
          review_subcategory: category === 'review' ? reviewSub : null,
        } : {}),
      }).eq('id', id);
      if (error) throw error;

      toast({ title: 'Post updated' });
      if (id) { invalidatePostDetail(id); }
      invalidateTrending();
      navigate(`/p/${id}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  }
  if (notAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#6b6b6b] gap-3">
        <p>You can't edit this post.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-full bg-[#0a0a0a] text-white text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-4 pt-4 pb-32">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
          </button>
          <h1 className="text-xl font-bold text-[#0a0a0a]">Edit post</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>

      {isAdmin ? (
        <p className="text-xs text-[#ef4444] mb-4 font-semibold">Admin mode — you can edit category, content, and media.</p>
      ) : (
        <p className="text-xs text-[#6b6b6b] mb-4">Category and music can't be edited. To change those, delete and repost.</p>
      )}

      {isAdmin && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">
            <Tag className="w-3 h-3 inline mr-1" /> Category
          </label>
          <select
            value={category ?? ''}
            onChange={e => setCategory((e.target.value || null) as CategoryKey | null)}
            className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
          >
            <option value="">— None —</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {category === 'review' && (
            <select
              value={reviewSub ?? ''}
              onChange={e => setReviewSub((e.target.value || null) as ReviewSubKey | null)}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
            >
              <option value="">— Pick a review type —</option>
              {Object.entries(REVIEW_SUB_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Media */}
        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">
            Photos & videos ({totalMedia}/{MAX_FILES})
          </label>
          <div className="grid grid-cols-3 gap-2">
            {existing.map((m, idx) => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#e5e5e5]">
                {m.kind === 'video' ? (
                  <video
                    src={m.url}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    // @ts-ignore
                    webkit-playsinline="true"
                  />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-contain" />
                )}
                {idx === 0 && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">Cover</span>
                )}
                {idx === 0 && m.kind === 'image' && (
                  <button
                    onClick={async () => {
                      const f = await urlToFile(m.url);
                      if (f) setRecropFile(f);
                    }}
                    aria-label="Recrop cover"
                    title="Recrop cover"
                    className="absolute top-1 right-8 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => removeExisting(m)}
                  aria-label="Remove"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                  <button
                    onClick={() => moveExisting(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move left"
                    className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveExisting(idx, 1)}
                    disabled={idx === existing.length - 1}
                    aria-label="Move right"
                    className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {newMedia.map((m, nIdx) => {
              const isCoverSlot = existing.length === 0 && nIdx === 0 && m.kind === 'image';
              return (
              <div key={m.tempId} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#ef4444]/40">
                {m.kind === 'video' ? (
                  <video
                    src={m.previewUrl}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    // @ts-ignore
                    webkit-playsinline="true"
                  />
                ) : (
                  <img src={m.previewUrl} alt="" className="w-full h-full object-contain" />
                )}
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#ef4444] text-white text-[10px] font-semibold">New</span>
                {isCoverSlot && (
                  <button
                    onClick={() => setRecropFile(m.file)}
                    aria-label="Recrop cover"
                    title="Recrop cover"
                    className="absolute top-1 right-8 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                )}
                {m.editorState && (
                  <button
                    onClick={() => startEditNewMedia(m)}
                    aria-label="Edit layout"
                    className="absolute bottom-1 right-1 px-2 h-6 rounded-full bg-black/70 text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                <button
                  onClick={() => removeNew(m.tempId)}
                  aria-label="Remove"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              );
            })}
            {totalMedia < MAX_FILES && (
              <button
                onClick={() => setLayoutSheetOpen(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#fafafa] flex flex-col items-center justify-center gap-1 text-[#6b6b6b] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-[11px] font-semibold">Add media</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <p className="mt-1.5 text-[11px] text-[#9b9b9b]">Up to {MAX_FILES} files, {MAX_FILE_MB}MB each. New uploads appear after existing ones.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
            placeholder="Title"
            className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
          />
          <p className="mt-1 text-[11px] text-[#9b9b9b] text-right">{title.length}/{TITLE_MAX}</p>
        </div>

        <div>
          {category === 'trip' ? (
            <TravelStructureHelper
              bodyIsEmpty={isRichTextEmpty(body)}
              onInsert={(pill) => {
                const snippet = buildPillSnippet(pill, isRichTextEmpty(body));
                bodyEditorRef.current?.insertHtml(snippet);
              }}
              onRemove={(pill) => bodyEditorRef.current?.removeByPill(pill.key)}
              labelSlot={
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide">Description</label>
              }
            />
          ) : (
            <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Description</label>
          )}
          <RichTextEditor
            ref={bodyEditorRef}
            value={body}
            onChange={setBody}
            placeholder="Write something..."
            rows={6}
            
          />
        </div>



        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Location</label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9b9b]" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Hashtags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {hashtags.map(h => (
              <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444] text-xs font-semibold">
                #{h}
                <button onClick={() => setHashtags(prev => prev.filter(x => x !== h))} aria-label={`Remove ${h}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9b9b]" />
            <input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKey}
              onBlur={commitHashtag}
              placeholder="Add a hashtag and press enter"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
            />
          </div>
        </div>
      </div>



      <ImageCropperDialog
        file={currentCropFile ?? recropFile}
        open={!!currentCropFile || !!recropFile}
        aspect={4 / 5}
        title={recropFile ? 'Recrop cover for Discover' : 'Crop your cover photo (shown on Discover)'}
        onCancel={() => {
          if (recropFile) setRecropFile(null);
          else handleCropCancel();
        }}
        onApply={(f) => {
          if (recropFile) {
            setCoverFile(f);
            setCoverTempId(null);
            setRecropFile(null);
          } else {
            handleCropApply(f);
          }
        }}
      />

      <LayoutPickerSheet
        open={layoutSheetOpen}
        onOpenChange={setLayoutSheetOpen}
        onPick={(c) => { setLayoutSheetOpen(false); setActiveLayout(c); }}
      />
      {activeLayout === 'single' && (
        <SingleImageTextEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingTempId(null); }}
          initialState={(() => {
            const m = newMedia.find(x => x.tempId === editingTempId);
            return m?.editorState?.kind === 'single' ? m.editorState : undefined;
          })()}
        />
      )}
      {activeLayout === 'grid' && (
        <GridTextEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingTempId(null); }}
          initialState={(() => {
            const m = newMedia.find(x => x.tempId === editingTempId);
            return m?.editorState?.kind === 'grid' ? m.editorState : undefined;
          })()}
        />
      )}
      {activeLayout === 'cost' && (
        <CostBreakdownEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingTempId(null); }}
          initialState={(() => {
            const m = newMedia.find(x => x.tempId === editingTempId);
            return m?.editorState?.kind === 'cost' ? m.editorState : undefined;
          })()}
        />
      )}
    </div>
  );
};

export default EditPostPage;
