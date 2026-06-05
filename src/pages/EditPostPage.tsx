import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { invalidatePostDetail, invalidateTrending } from '@/lib/feedCache';
import { ArrowLeft, Loader2, MapPin, Hash, X, Check, ImagePlus, Tag } from 'lucide-react';
import { extractStoragePath } from '@/lib/storageUrls';
import RichTextEditor from '@/components/RichTextEditor';
import { markdownToHtml, isRichTextEmpty } from '@/lib/richText';
import { ImageCropperDialog } from '@/components/ImageCropperDialog';

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
const MAX_FILES = 10;
const MAX_FILE_MB = 25;

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
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newMedia, setNewMedia] = useState<NewMedia[]>([]);

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
      setExisting((mediaRows as any[] || []).map(m => ({
        id: m.id, url: m.url, kind: m.kind, sort_order: m.sort_order,
      })));
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

  const addNewMediaFile = (file: File) => {
    const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    const entry: NewMedia = {
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      kind,
    };
    setNewMedia(prev => [...prev, entry]);
    return entry.tempId;
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
    videos.forEach(addNewMediaFile);
    // Only crop the cover (first image overall) to 4:5 for the Discover grid.
    const needsCover = existing.length === 0 && newMedia.length === 0 && cropQueue.length === 0;
    if (images.length) {
      if (needsCover) {
        const [cover, ...rest] = images;
        setCropQueue(prev => [...prev, cover]);
        rest.forEach(addNewMediaFile);
      } else {
        images.forEach(addNewMediaFile);
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
    setExisting(prev => prev.filter(x => x.id !== m.id));
    setRemovedIds(prev => [...prev, m.id]);
    const path = extractStoragePath(m.url, 'post-media');
    if (path) setRemovedPaths(prev => [...prev, path]);
  };

  const removeNew = (tempId: string) => {
    setNewMedia(prev => {
      const target = prev.find(x => x.tempId === tempId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      if (tempId === coverTempId) {
        setCoverFile(null);
        setCoverTempId(null);
      }
      return prev.filter(x => x.tempId !== tempId);
    });
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

      // 2. Reorder remaining existing media
      for (let i = 0; i < existing.length; i++) {
        const m = existing[i];
        if (m.sort_order !== i) {
          await supabase.from('post_media' as any).update({ sort_order: i }).eq('id', m.id);
        }
      }

      // 3. Upload new media starting after existing
      let order = existing.length;
      for (const m of newMedia) {
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
        order++;
      }

      // 4. Update post fields
      const { error } = await supabase.from('posts' as any).update({
        title: title.trim(),
        body: isRichTextEmpty(body) ? null : body,
        location: location.trim() || null,
        hashtags,
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
            {existing.map(m => (
              <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#e5e5e5]">
                {m.kind === 'video' ? (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    // @ts-ignore
                    webkit-playsinline="true"
                  />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeExisting(m)}
                  aria-label="Remove"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {newMedia.map(m => (
              <div key={m.tempId} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#ef4444]/40">
                {m.kind === 'video' ? (
                  <video
                    src={m.previewUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    // @ts-ignore
                    webkit-playsinline="true"
                  />
                ) : (
                  <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
                )}
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#ef4444] text-white text-[10px] font-semibold">New</span>
                <button
                  onClick={() => removeNew(m.tempId)}
                  aria-label="Remove"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {totalMedia < MAX_FILES && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#fafafa] flex flex-col items-center justify-center gap-1 text-[#6b6b6b] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-[11px] font-semibold">Add</span>
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
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Description</label>
          <RichTextEditor
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
        file={currentCropFile}
        open={!!currentCropFile}
        aspect={4 / 5}
        title="Crop your cover photo (shown on Discover)"
        onCancel={handleCropCancel}
        onApply={handleCropApply}
      />
    </div>
  );
};

export default EditPostPage;
