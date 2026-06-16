import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { invalidateTrending } from '@/lib/feedCache';
import { track } from '@/lib/analytics';

import {
  ArrowLeft, ImagePlus, X, Loader2, MapPin, Hash, Music, Sparkles,
  Palette, Star, MessageSquareQuote, Gem, ChevronRight, Crop, Pencil,
  UtensilsCrossed, BedDouble, Plane, ShoppingBag, BookOpen, Ticket,
} from 'lucide-react';
import { ImageCropperDialog } from '@/components/ImageCropperDialog';
import { LayoutPickerSheet, type LayoutChoice } from '@/components/createpost/LayoutPickerSheet';
import { SingleImageTextEditor } from '@/components/createpost/SingleImageTextEditor';
import { GridTextEditor } from '@/components/createpost/GridTextEditor';
import { CostBreakdownEditor } from '@/components/createpost/CostBreakdownEditor';
import type { LayoutEditorState } from '@/lib/composeLayout';
import {
  saveDraftMedia, loadDraftMedia, clearDraftMedia,
  serializeEditorState, deserializeEditorState,
} from '@/lib/draftMediaStore';

import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { MusicPicker, type PickedTrack } from '@/components/MusicPicker';
import RichTextEditor, { type RichTextEditorHandle } from '@/components/RichTextEditor';
import TravelStructureHelper, { buildPillSnippet } from '@/components/TravelStructureHelper';
import { markdownToHtml, isRichTextEmpty } from '@/lib/richText';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const MAX_FILES = 18;
const MAX_FILE_MB = 50;

type CategoryKey = 'everyday_vibes' | 'trip' | 'review' | 'real_talk' | 'hidden_gems';
type ReviewSubKey = 'restaurant' | 'hotel' | 'product' | 'media' | 'activity';
type RecommendationKey = 'loved' | 'mixed' | 'not_for_me';

const RECOMMENDATION_OPTIONS: { key: RecommendationKey; emoji: string; label: string }[] = [
  { key: 'loved', emoji: '❤️', label: 'Loved it' },
  { key: 'mixed', emoji: '🤔', label: 'Mixed feelings' },
  { key: 'not_for_me', emoji: '👎', label: 'Not for me' },
];

const REVIEW_SUBCATEGORIES: {
  key: ReviewSubKey;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  accent: string;
}[] = [
  { key: 'restaurant', title: 'Restaurant / Bar / Food Joint', subtitle: 'Cafés, bars, street food and dining spots', icon: UtensilsCrossed, accent: 'from-orange-500/20 to-red-400/20 text-orange-500' },
  { key: 'hotel', title: 'Hotel / Stay / Hostel', subtitle: 'Where you stayed and how it felt', icon: BedDouble, accent: 'from-indigo-500/20 to-blue-400/20 text-indigo-500' },
  { key: 'product', title: 'Product', subtitle: 'Something you bought and tried', icon: ShoppingBag, accent: 'from-violet-500/20 to-fuchsia-400/20 text-violet-500' },
  { key: 'media', title: 'Places and Institutions', subtitle: 'Workplace, college, gym & more', icon: BookOpen, accent: 'from-amber-500/20 to-yellow-400/20 text-amber-500' },
  { key: 'activity', title: 'Activity / Experience / Event', subtitle: 'A class, concert, tour, or event', icon: Ticket, accent: 'from-emerald-500/20 to-teal-400/20 text-emerald-500' },
];

const PenguinIcon = () => (
  <img
    src="https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg"
    alt="penguin"
    className="inline-block w-4 h-4 align-[-3px]"
  />
);

const CATEGORIES: {
  key: CategoryKey;
  title: string;
  subtitle: React.ReactNode;
  icon: typeof Sparkles;
  accent: string;
}[] = [
  { key: 'everyday_vibes', title: 'Daily Life', subtitle: 'Things you did, designed, decorated or bought', icon: Sparkles, accent: 'from-pink-500/20 to-orange-400/20 text-pink-500' },
  
  { key: 'trip', title: 'Travel Diaries', subtitle: 'A full journey or getaway', icon: Plane, accent: 'from-sky-500/20 to-cyan-400/20 text-sky-500' },
  { key: 'hidden_gems', title: 'Work Diaries', subtitle: <>option to post anonymous as <PenguinIcon /> Rippler</>, icon: Gem, accent: 'from-emerald-500/20 to-teal-400/20 text-emerald-500' },
  { key: 'review', title: 'Review', subtitle: 'A place, product, food spot, or experience you tried', icon: Star, accent: 'from-amber-500/20 to-yellow-400/20 text-amber-500' },
  { key: 'real_talk', title: 'Advice and Tips', subtitle: 'Share advice, recommendation or life lesson', icon: MessageSquareQuote, accent: 'from-sky-500/20 to-cyan-400/20 text-sky-500' },
];

const BODY_PLACEHOLDERS: Partial<Record<CategoryKey, string>> = {
  everyday_vibes: "You can include:\n\n📅 What's a day in your life looking like lately?\n\n🛠️ What are the items, products, or tools you used here?\n\n⏱️ How long did it take and what's the cost breakdown?",
  review: 'You can include:\n\n✨ What did you try? Highlight the must-tries or absolute skips.\n\n🪑 How was the seating or service? (e.g., ideal for dates, laptop work, group hangs).\n\n💰 How was the overall experience and did it justify the price?',
  real_talk: 'You can include:\n\n🧠 What is the exact context and situation one faces?\n\n🪜 What are the key steps to take or avoid?',
  hidden_gems: "You can include:\n\n💼 What's the reality vs expectation of working here?\n\n🤔 What do you wish you knew before joining?\n\n🚀 Who would thrive or struggle here?\n\n🌱 What have been your biggest learnings here?",
  trip: 'You can include:\n\n🗺️ What surprised you most — and what felt overrated?\n\n🚕 Best ways to get around, and when\u2019s the best time to visit?\n\n💸 What was the detailed cost breakdown and tips to save money?',
};
const REVIEW_SUB_PLACEHOLDERS: Partial<Record<ReviewSubKey, string>> = {
  hotel: 'You can include:\n\n🛏️ How were the comfort, cleanliness, views & amenities overall?\n\n✨ Any insider tips, upgrades or things people shouldn\u2019t miss?\n\n💭 What would you tell someone thinking of booking this?',
  product: 'You can include:\n\n⏳ How long have you been using it — and how\u2019s it been?\n\n👍 What impressed you, and what fell short?\n\n💸 Was it worth the price?',
  media: 'You can include:\n\n🏢 What\u2019s the culture, vibe or environment actually like?\n\n💡 What\u2019s something people should know before joining or visiting?\n\n👀 Who do you think this place is actually good — or not good — for?',
  activity: 'You can include:\n\n🎶 What was the energy and vibe actually like in person?\n\n💸 Looking back, did it feel worth the time and money?',
};

interface PendingMedia {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  // Set when this media was produced by a layout editor — lets the user
  // tap the tile to reopen that editor and tweak everything.
  editorState?: LayoutEditorState;
}

const SortableMediaTile = ({ m, onRemove, onCrop, onEdit }: { m: PendingMedia; onRemove: () => void; onCrop?: () => void; onEdit?: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f5] border border-[#e5e5e5] touch-none cursor-grab active:cursor-grabbing"
    >
      {m.kind === 'video' ? (
        <>
          <video
            src={m.previewUrl}
            className="w-full h-full object-contain pointer-events-none"
            muted
            playsInline
            controls
            preload="metadata"
            // @ts-ignore - iOS Safari attribute
            webkit-playsinline="true"
          />
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 pointer-events-none">
            <span>▶</span>
            <span className="truncate max-w-[80px]">{m.file.name}</span>
          </div>
        </>
      ) : (
        <img src={m.previewUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
      )}
      {onCrop && m.kind === 'image' && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCrop(); }}
          aria-label="Crop"
          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>
      )}
      {onEdit && m.editorState && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit(); }}
          aria-label="Edit layout"
          className="absolute bottom-1 right-1 px-2 h-6 rounded-full bg-black/70 text-white text-[10px] font-semibold flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};


const DRAFT_KEY = 'createPostDraft:v1';

interface PersistedDraft {
  category: CategoryKey | null;
  reviewSub: ReviewSubKey | null;
  recommendation: RecommendationKey | null;
  title: string;
  body: string;
  location: string;
  hashtags: string[];
  music: PickedTrack | null;
  postAnonymously?: boolean;
}

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<RichTextEditorHandle>(null);

  // Hydrate once from localStorage so users return to exactly where they left off.
  const initial = (() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedDraft;
    } catch { return null; }
  })();

  const [searchParams] = useSearchParams();
  const presetCategory = searchParams.get('category') as CategoryKey | null;
  const presetSub = searchParams.get('sub') as ReviewSubKey | null;
  const validCategories: CategoryKey[] = ['everyday_vibes', 'trip', 'review', 'real_talk', 'hidden_gems'];
  const validReviewSubs: ReviewSubKey[] = ['restaurant', 'hotel', 'product', 'media', 'activity'];
  const initialCategory = initial?.category ?? (presetCategory && validCategories.includes(presetCategory) ? presetCategory : null);
  const [category, setCategory] = useState<CategoryKey | null>(initialCategory);
  const [reviewSub, setReviewSub] = useState<ReviewSubKey | null>(
    initial?.reviewSub ?? (initialCategory === 'review' && presetSub && validReviewSubs.includes(presetSub) ? presetSub : null)
  );
  const [recommendation, setRecommendation] = useState<RecommendationKey | null>(initial?.recommendation ?? null);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [title, setTitle] = useState(initial?.title ?? '');
  // Body is stored as a small HTML subset produced by RichTextEditor.
  // For backwards compatibility, any legacy markdown draft is converted on load.
  const [body, setBody] = useState<string>(() => {
    const raw = initial?.body ?? '';
    if (!raw) return '';
    if (/<(strong|b|em|i|u|br|div|p|span)\b/i.test(raw)) return raw;
    return markdownToHtml(raw);
  });
  const [location, setLocation] = useState(initial?.location ?? '');
  const [locSuggestions, setLocSuggestions] = useState<{ name: string; display: string }[]>([]);
  const [locOpen, setLocOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const locJustPicked = useRef(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(initial?.hashtags ?? []);
  const [music, setMusic] = useState<PickedTrack | null>(initial?.music ?? null);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [postAnonymously, setPostAnonymously] = useState<boolean>(initial?.postAnonymously ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [layoutSheetOpen, setLayoutSheetOpen] = useState(false);
  const [activeLayout, setActiveLayout] = useState<LayoutChoice | null>(null);
  // When set, finishing the active layout editor REPLACES this entry instead of appending.
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(() => !!(initial && (initial.title || initial.body || initial.location || initial.hashtags?.length || initial.category)));

  // Anonymous toggle only applies to Work Diaries — reset when leaving that category.
  useEffect(() => {
    if (category !== 'hidden_gems' && postAnonymously) setPostAnonymously(false);
  }, [category, postAnonymously]);

  // Persist draft on any change (debounced) and expose a synchronous flush
  // for visibility/unload events so a sudden refresh can't lose recent edits.
  const textDraftRef = useRef<PersistedDraft | null>(null);
  textDraftRef.current = { category, reviewSub, recommendation, title, body, location, hashtags, music, postAnonymously };

  const flushTextDraft = () => {
    const d = textDraftRef.current;
    if (!d) return;
    const hasContent = !!(d.category || d.title || d.body || d.location || d.hashtags.length || d.music);
    try {
      if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(flushTextDraft, 150);
    return () => clearTimeout(t);
  }, [category, reviewSub, recommendation, title, body, location, hashtags, music, postAnonymously]);

  // ─── Media drafts (IndexedDB) ─────────────────────────────────────────────
  // Skip the first auto-save right after we hydrate from IDB so an empty
  // initial `media` state can't wipe the saved draft before load completes.
  const mediaHydratedRef = useRef(false);
  useEffect(() => {
    (async () => {
      const saved = await loadDraftMedia();
      const valid = saved.filter(s => s.fileBlob && (s.fileBlob as Blob).size > 0);
      if (valid.length !== saved.length) {
        await clearDraftMedia();
      }
      if (valid.length) {
        setMedia(valid.map(s => ({
          id: s.id,
          file: new File([s.fileBlob], s.fileName || (s.kind === 'video' ? 'video.mp4' : 'photo.jpg'), { type: s.fileType || (s.kind === 'video' ? 'video/mp4' : 'image/jpeg') }),
          previewUrl: URL.createObjectURL(s.fileBlob),
          kind: s.kind,
          editorState: s.editorState ? deserializeEditorState(s.editorState) : undefined,
        })));
        setDraftRestored(true);
      }
      mediaHydratedRef.current = true;
    })();
  }, []);

  const mediaRef = useRef<PendingMedia[]>([]);
  mediaRef.current = media;
  const flushMediaDraft = () => {
    if (!mediaHydratedRef.current) return;
    const m = mediaRef.current;
    if (m.length === 0) { clearDraftMedia(); return; }
    saveDraftMedia(m.map(x => ({
      id: x.id,
      kind: x.kind,
      fileBlob: x.file,
      fileName: x.file.name,
      fileType: x.file.type,
      editorState: x.editorState ? serializeEditorState(x.editorState) : undefined,
    })));
  };

  useEffect(() => {
    if (!mediaHydratedRef.current) return;
    const t = setTimeout(flushMediaDraft, 200);
    return () => clearTimeout(t);
  }, [media]);

  // Flush drafts immediately when the tab is hidden or the page is unloaded
  // so a connection drop / refresh in the middle of typing never loses work.
  useEffect(() => {
    const handler = () => { flushTextDraft(); flushMediaDraft(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') handler(); };
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    clearDraftMedia();
  };

  const discardDraft = () => {
    clearDraft();
    setCategory(null); setReviewSub(null); setRecommendation(null); setTitle(''); setBody('');
    setLocation(''); setHashtags([]); setMusic(null); setPostAnonymously(false);
    setMedia(prev => { prev.forEach(m => URL.revokeObjectURL(m.previewUrl)); return []; });
    setCoverFile(null); setCoverMediaId(null);
    setDraftRestored(false);
    toast({ title: 'Draft discarded' });
  };


  const selectedCategory = CATEGORIES.find(c => c.key === category);
  const selectedReviewSub = REVIEW_SUBCATEGORIES.find(s => s.key === reviewSub);
  useEffect(() => {
    if (locJustPicked.current) { locJustPicked.current = false; return; }
    const q = location.trim();
    if (q.length < 2) { setLocSuggestions([]); setLocLoading(false); return; }
    setLocLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, headers: { 'Accept': 'application/json' } }
        );
        const data: any[] = await res.json();
        const items = data.map(d => {
          const a = d.address || {};
          const primary = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county || a.state || d.name || d.display_name.split(',')[0];
          // Secondary context shown only as hint in the dropdown (not saved).
          const contextParts: string[] = [];
          const seenPart = new Set<string>([primary.toLowerCase()]);
          [a.city, a.state, a.country].forEach((p) => {
            if (p && !seenPart.has(p.toLowerCase())) {
              seenPart.add(p.toLowerCase());
              contextParts.push(p);
            }
          });
          return { name: primary, display: contextParts.join(', ') };
        });
        // de-dup by name + display hint
        const seen = new Set<string>();
        const unique = items.filter(i => { const k = `${i.name}|${i.display}`; if (seen.has(k)) return false; seen.add(k); return true; });
        setLocSuggestions(unique);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') setLocSuggestions([]);
      } finally {
        setLocLoading(false);
      }
    }, 300);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [location]);


  // Image crop flow state
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [editCropId, setEditCropId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const currentCropFile = editCropId
    ? media.find(m => m.id === editCropId)?.file ?? null
    : cropQueue[0] ?? null;
  const cropperOpen = !!currentCropFile;

  const addMediaFile = (file: File, editorState?: LayoutEditorState) => {
    const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    const entry: PendingMedia = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      kind,
      editorState,
    };
    setMedia(prev => [...prev, entry]);
    return entry.id;
  };

  const handleLayoutDone = (files: File[], states: LayoutEditorState[]) => {
    // EDIT mode — replace the existing entry in place and append any extras
    // (e.g. user added more slides to a Single-image post).
    if (editingMediaId) {
      const idx = media.findIndex(m => m.id === editingMediaId);
      if (idx !== -1 && files.length > 0) {
        const newPrimaryUrl = URL.createObjectURL(files[0]);
        setMedia(prev => {
          const next = [...prev];
          URL.revokeObjectURL(next[idx].previewUrl);
          next[idx] = {
            ...next[idx],
            file: files[0],
            previewUrl: newPrimaryUrl,
            editorState: states[0],
          };
          return next;
        });
        if (coverMediaId === editingMediaId) setCoverFile(files[0]);
        // Append any extra files beyond the first as new entries.
        const extras = files.slice(1);
        const remaining = MAX_FILES - media.length;
        extras.slice(0, Math.max(0, remaining)).forEach((f, i) => addMediaFile(f, states[i + 1]));
      }
      setEditingMediaId(null);
      setActiveLayout(null);
      return;
    }

    const remaining = MAX_FILES - media.length;
    const slice = files.slice(0, Math.max(0, remaining));
    if (slice.length < files.length) {
      toast({ title: `Only added ${slice.length} of ${files.length}`, description: `Max ${MAX_FILES} attachments per post.` });
    }
    let firstId: string | null = null;
    slice.forEach((f, i) => {
      const id = addMediaFile(f, states[i]);
      if (i === 0) firstId = id;
    });
    if (firstId && !coverFile) {
      setCoverFile(slice[0]);
      setCoverMediaId(firstId);
    }
    setActiveLayout(null);
  };

  const startEditMedia = (m: PendingMedia) => {
    if (!m.editorState) return;
    setEditingMediaId(m.id);
    setActiveLayout(m.editorState.kind);
  };



  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const remaining = MAX_FILES - media.length - cropQueue.length;
    const accepted: File[] = [];
    for (const file of arr) {
      if (accepted.length >= remaining) break;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${file.name} is too large`, description: `Max ${MAX_FILE_MB}MB per file`, variant: 'destructive' });
        continue;
      }
      accepted.push(file);
    }
    const images = accepted.filter(f => !f.type.startsWith('video/'));
    const videos = accepted.filter(f => f.type.startsWith('video/'));
    videos.forEach(f => addMediaFile(f));
    // Only the cover image (first slot) is cropped to 4:5 for the Discover grid.
    // Additional images keep their original aspect ratio.
    const needsCover = media.length === 0 && cropQueue.length === 0;
    if (images.length) {
      if (needsCover) {
        const [cover, ...rest] = images;
        setCropQueue(prev => [...prev, cover]);
        rest.forEach(f => addMediaFile(f));
      } else {
        images.forEach(f => addMediaFile(f));
      }
    }
  };

  const handleCropApply = (croppedFile: File) => {
    if (editCropId) {
      setCoverFile(croppedFile);
      setCoverMediaId(editCropId);
      setEditCropId(null);
    } else {
      const originalCover = cropQueue[0];
      if (originalCover) {
        const id = addMediaFile(originalCover);
        setCoverFile(croppedFile);
        setCoverMediaId(id);
      } else {
        addMediaFile(croppedFile);
      }
      setCropQueue(prev => prev.slice(1));
    }
  };

  const handleCropSkip = () => {
    if (editCropId) { setEditCropId(null); return; }
    const [first, ...rest] = cropQueue;
    if (first) addMediaFile(first);
    setCropQueue(rest);
  };

  const handleCropCancel = () => {
    if (editCropId) { setEditCropId(null); return; }
    // Cancel discards the current pending image and advances the queue
    setCropQueue(prev => prev.slice(1));
  };

  const removeMedia = (i: number) => {
    const removedId = media[i]?.id;
    const wasFirst = i === 0;
    let newFirstIdToCrop: string | null = null;
    setMedia(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[i].previewUrl);
      copy.splice(i, 1);
      if (wasFirst && copy[0]?.kind === 'image') {
        newFirstIdToCrop = copy[0].id;
      }
      return copy;
    });
    if (removedId && removedId === coverMediaId) {
      setCoverFile(null);
      setCoverMediaId(null);
    }
    if (newFirstIdToCrop) {
      const idToCrop = newFirstIdToCrop;
      // Re-crop whichever image is now in slot #1 so the Discover cover stays 4:5.
      setTimeout(() => setEditCropId(idToCrop), 0);
    }
  };


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    let newFirstIdToCrop: string | null = null;
    setMedia(prev => {
      const oldIndex = prev.findIndex(m => m.id === active.id);
      const newIndex = prev.findIndex(m => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      const newFirst = next[0];
      if (newFirst && newFirst.kind === 'image' && newFirst.id !== coverMediaId) {
        newFirstIdToCrop = newFirst.id;
      }
      return next;
    });
    if (newFirstIdToCrop) {
      const idToCrop = newFirstIdToCrop;
      setTimeout(() => setEditCropId(idToCrop), 0);
    }
  };


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

  const uploadWithRetry = async (path: string, file: File, attempts = 3) => {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        const { error } = await supabase.storage.from('post-media').upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (!error) return;
        lastErr = error;
      } catch (e) {
        lastErr = e;
      }
      // Backoff before retrying transient network failures.
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
    throw lastErr || new Error('Upload failed');
  };

  const handleSubmit = async () => {
    if (!userId || !category) return;
    // Media is optional — when none is added, a text-only cover card is rendered in feeds.

    if (!title.trim()) {
      toast({ title: 'Add a title', description: 'Tell people what you are sharing', variant: 'destructive' });
      return;
    }
    if (isRichTextEmpty(body)) {
      toast({ title: 'Add a description', description: 'Tell people more about your post', variant: 'destructive' });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast({ title: 'You are offline', description: 'Check your connection and try again', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    let createdPostId: string | null = null;
    try {
      // Re-validate the session with the auth server before inserting —
      // a stale/expired refresh token on mobile leaves `userId` populated
      // in client state while `auth.uid()` is null server-side, which trips
      // the posts INSERT RLS policy (auth.uid() = user_id).
      const { data: u, error: uErr } = await supabase.auth.getUser();
      const authedId = u?.user?.id ?? null;
      if (uErr || !authedId) {
        toast({
          title: 'Please sign in again',
          description: 'Your session expired. Sign in and try posting again.',
          variant: 'destructive',
        });
        setSubmitting(false);
        navigate('/auth');
        return;
      }
      if (authedId !== userId) {
        // Use the server-validated id so RLS will pass.
        console.warn('Auth id mismatch — using server-validated id for post insert.');
      }

      const musicUrl = music?.previewUrl ?? null;
      const musicLabel = music ? `${music.title} — ${music.artist}` : null;

      const { data: post, error: postErr } = await supabase.from('posts' as any).insert({
        user_id: authedId,
        category,
        review_subcategory: category === 'review' ? reviewSub : null,
        review_recommendation: category === 'review' ? recommendation : null,
        title: title.trim() || null,
        body: isRichTextEmpty(body) ? null : body,
        location: location.trim() || null,
        hashtags,
        music_url: musicUrl,
        music_title: musicLabel,
        is_anonymous: category === 'hidden_gems' && postAnonymously,
      }).select('id').single();
      if (postErr || !post) throw postErr || new Error('Failed to create post');
      const postId = (post as any).id as string;
      createdPostId = postId;

      if (coverFile) {
        const coverPath = `${userId}/${postId}/cover-${Date.now()}.jpg`;
        await uploadWithRetry(coverPath, coverFile);
        const coverUrl = supabase.storage.from('post-media').getPublicUrl(coverPath).data.publicUrl;
        const { error: coverErr } = await supabase
          .from('posts' as any)
          .update({ cover_url: coverUrl, cover_kind: 'image' })
          .eq('id', postId);
        if (coverErr) throw coverErr;
      }

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const ext = m.file.name.split('.').pop() || (m.kind === 'video' ? 'mp4' : 'jpg');
        const path = `${userId}/${postId}/${i}-${Date.now()}.${ext}`;
        await uploadWithRetry(path, m.file);
        const url = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
        const { error: mErr } = await supabase.from('post_media' as any).insert({
          post_id: postId, url, kind: m.kind, sort_order: i,
        });
        if (mErr) throw mErr;
      }

      clearDraft();
      toast({ title: 'Posted!' });
      invalidateTrending();
      track('post_created', { post_id: postId, category: category || null, media_count: media.length });
      navigate(`/p/${postId}`);
    } catch (e: any) {

      console.error(e);
      // Best-effort cleanup of an orphan post if media uploads failed mid-way.
      if (createdPostId) {
        try { await supabase.from('posts' as any).delete().eq('id', createdPostId); } catch {}
      }
      const raw = e?.message || '';
      const isNetwork = /failed to fetch|network|load failed|networkerror/i.test(raw);
      toast({
        title: 'Could not post',
        description: isNetwork
          ? 'Network issue uploading your post. If you use Brave Shields or an ad blocker, try disabling it for this site, then retry.'
          : (raw || 'Try again'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 1 — pick a category
  if (!category) {
    return (
      <div className="min-h-screen bg-white max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
          </button>
          <h1 className="text-xl font-bold text-[#0a0a0a]">New post</h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a0a0a] mb-1">What are you posting about?</h2>
        <p className="text-sm text-[#6b6b6b] mb-5">Pick the closest one — takes one second</p>

        <div className="grid grid-cols-1 gap-3">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="text-left rounded-2xl bg-gradient-to-br from-white to-[#fafafa] border border-[#e5e5e5] p-5 flex items-start gap-4 active:scale-[0.98] hover:border-[#ef4444]/50 transition-all shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
              >
                <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0a0a0a] text-base leading-tight mb-1">{c.title}</p>
                  <p className="text-[13px] text-[#6b6b6b] leading-snug">{c.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6b6b6b] mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

    );
  }

  // STEP 1b — pick a review subcategory
  if (category === 'review' && !reviewSub) {
    return (
      <div className="min-h-screen bg-white max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setCategory(null)} className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
          </button>
          <h1 className="text-xl font-bold text-[#0a0a0a]">New post</h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a0a0a] mb-1">What are you reviewing?</h2>
        <p className="text-sm text-[#6b6b6b] mb-5">Pick the closest one</p>

        <div className="grid grid-cols-1 gap-3">
          {REVIEW_SUBCATEGORIES.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setReviewSub(s.key)}
                className="text-left rounded-2xl bg-gradient-to-br from-white to-[#fafafa] border border-[#e5e5e5] p-5 flex items-start gap-4 active:scale-[0.98] hover:border-[#ef4444]/50 transition-all shadow-[0_4px_16px_-8px_rgba(0,0,0,0.1)]"
              >
                <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0a0a0a] text-base leading-tight mb-1">{s.title}</p>
                  <p className="text-[13px] text-[#6b6b6b] leading-snug">{s.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6b6b6b] mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

    );
  }


  // STEP 2 — fill in the post
  
  const goBackFromForm = () => {
    if (category === 'review') { setReviewSub(null); } else { setCategory(null); }
  };
  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-4 pt-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBackFromForm} className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
        </button>
        <h1 className="text-xl font-bold text-[#0a0a0a]">New post</h1>
      </div>
      {draftRestored && (
        <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20">
          <p className="text-xs text-[#0a0a0a]">
            Picked up where you left off — your draft was saved.
          </p>
          <button
            onClick={discardDraft}
            className="text-xs font-semibold text-[#ef4444] hover:underline shrink-0"
          >
            Discard
          </button>
        </div>
      )}

      {/* Anonymous toggle — Work Diaries only */}
      {category === 'hidden_gems' && (
        <label className="mb-4 flex items-start gap-3 px-3 py-3 rounded-xl bg-[#0f3460]/5 border border-[#0f3460]/20 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={postAnonymously}
            onChange={e => setPostAnonymously(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#0f3460] shrink-0"
          />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0a0a0a]">
              <img
                src="https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg"
                alt=""
                className="w-4 h-4"
              />
              Post anonymously as Rippler
            </span>
            <span className="block text-[11px] text-[#6b6b6b] mt-0.5 leading-snug">
              Your name and profile won't be shown on this post — not on Discover, not on your profile, not anywhere.
            </span>
          </span>
        </label>
      )}

      {/* Media grid */}
      <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">
        Media <span className="font-normal text-[#9b9b9b]">· optional</span>

        {media.length > 1 && (
          <span className="ml-2 font-normal text-[#9b9b9b]">· drag to reorder</span>
        )}
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={media.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 mb-1">
            {media.map((m, i) => (
              <SortableMediaTile
                key={m.id}
                m={m}
                onRemove={() => removeMedia(i)}
                onCrop={i === 0 ? () => setEditCropId(m.id) : undefined}
                onEdit={m.editorState ? () => startEditMedia(m) : undefined}
              />
            ))}
            {media.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => setLayoutSheetOpen(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#f5f5f5] flex flex-col items-center justify-center text-[#6b6b6b] gap-1 hover:border-[#ef4444]/50 transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px] font-semibold">Add media</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <LayoutPickerSheet
        open={layoutSheetOpen}
        onOpenChange={setLayoutSheetOpen}
        onPick={(c) => {
          setLayoutSheetOpen(false);
          if (c === 'video') {
            videoInputRef.current?.click();
          } else {
            setActiveLayout(c);
          }
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {activeLayout === 'single' && (
        <SingleImageTextEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingMediaId(null); }}
          initialState={(() => {
            const m = media.find(x => x.id === editingMediaId);
            return m?.editorState?.kind === 'single' ? m.editorState : undefined;
          })()}
        />
      )}
      {activeLayout === 'grid' && (
        <GridTextEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingMediaId(null); }}
          initialState={(() => {
            const m = media.find(x => x.id === editingMediaId);
            return m?.editorState?.kind === 'grid' ? m.editorState : undefined;
          })()}
        />
      )}
      {activeLayout === 'cost' && (
        <CostBreakdownEditor
          onDone={handleLayoutDone}
          onCancel={() => { setActiveLayout(null); setEditingMediaId(null); }}
          initialState={(() => {
            const m = media.find(x => x.id === editingMediaId);
            return m?.editorState?.kind === 'cost' ? m.editorState : undefined;
          })()}
        />
      )}


      

      {/* Title */}
      <label className="text-xs font-semibold text-[#6b6b6b] mb-1 mt-6 block">What are you sharing today? <span className="text-[#ef4444]">*</span></label>
      <input value={title} onChange={e => setTitle(e.target.value.slice(0, 90))} placeholder="Short and specific title helps..." maxLength={90}
        className="w-full px-4 py-3 mb-1 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm" />
      <div className="text-[10px] text-[#9b9b9b] text-right mb-4">{title.length}/90</div>

      {/* Body */}
      {(() => {
        const subPh = category === 'review' && reviewSub ? REVIEW_SUB_PLACEHOLDERS[reviewSub] : undefined;
        const ph = subPh ?? BODY_PLACEHOLDERS[category!] ?? 'Tell people more...';
        const hasSuggestions = !!subPh || !!BODY_PLACEHOLDERS[category!];
        return (
          <>
            {category === 'trip' ? (
              <TravelStructureHelper
                bodyIsEmpty={isRichTextEmpty(body)}
                onInsert={(pill) => {
                  const snippet = buildPillSnippet(pill, isRichTextEmpty(body));
                  bodyEditorRef.current?.insertHtml(snippet);
                }}
                onRemove={(pill) => bodyEditorRef.current?.removeByPill(pill.key)}
                labelSlot={
                  <label className="text-xs font-semibold text-[#6b6b6b] block">Tell people more... <span className="text-[#ef4444]">*</span></label>
                }
              />
            ) : (
              <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">Tell people more... <span className="text-[#ef4444]">*</span></label>
            )}
            <div className="relative mb-4">
              <RichTextEditor
                ref={bodyEditorRef}
                value={body}
                onChange={setBody}
                placeholder={ph}
                
                rows={hasSuggestions ? 7 : 5}
              />
            </div>
          </>
        );
      })()}

      {/* Recommendation (review only) */}
      {category === 'review' && (
        <>
          <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">Would you recommend it?</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {RECOMMENDATION_OPTIONS.map(opt => {
              const active = recommendation === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRecommendation(active ? null : opt.key)}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]'
                      : 'bg-[#f5f5f5] border-[#e5e5e5] text-[#0a0a0a] hover:border-[#d4d4d4]'
                  }`}
                >
                  <span className="text-lg leading-none">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}





      {/* Location */}
      <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">Location</label>
      <div className="relative mb-4">
        <MapPin className="absolute left-4 top-[22px] -translate-y-1/2 w-4 h-4 text-[#6b6b6b]" />
        <input
          value={location}
          onChange={e => { setLocation(e.target.value); setLocOpen(true); }}
          onFocus={() => setLocOpen(true)}
          onBlur={() => setTimeout(() => setLocOpen(false), 150)}
          placeholder="e.g. Mumbai, Bandra"
          maxLength={100}
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
        />
        {locLoading && (
          <Loader2 className="absolute right-3 top-[22px] -translate-y-1/2 w-4 h-4 text-[#6b6b6b] animate-spin" />
        )}
        {locOpen && location.trim().length >= 2 && locSuggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] shadow-lg overflow-hidden max-h-72 overflow-y-auto scrollbar-hide">
            {locSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  locJustPicked.current = true;
                  setLocation(s.name);
                  setLocOpen(false);
                  setLocSuggestions([]);
                }}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-[#f5f5f5] border border-[#e5e5e5] transition-colors border-b border-[#e5e5e5] last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-[#6b6b6b] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0a0a0a] truncate">{s.name}</p>
                  {s.display && <p className="text-[11px] text-[#6b6b6b] truncate">{s.display}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Hashtags */}
      <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">Hashtags</label>
      <div className="px-3 py-2 mb-1 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex flex-wrap gap-1.5 items-center min-h-[44px]">
        {hashtags.map(h => (
          <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] text-xs font-semibold">
            #{h}
            <button onClick={() => setHashtags(prev => prev.filter(x => x !== h))} aria-label="Remove">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b6b]" />
          <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} onKeyDown={handleHashtagKey} onBlur={commitHashtag}
            placeholder={hashtags.length ? '' : 'travel, foodie…'}
            className="w-full pl-7 pr-1 py-1 bg-transparent text-[#0a0a0a] placeholder:text-[#a0a0a0] focus:outline-none text-sm" />
        </div>
      </div>
      <p className="text-[10px] text-[#6b6b6b] mb-5">Press space, comma, or enter to add.</p>

      {/* Music */}
      <label className="text-xs font-semibold text-[#6b6b6b] mb-1 block">Music (optional)</label>
      {music ? (
        <div className="mb-1 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center shrink-0">
            {music.artworkUrl ? (
              <img src={music.artworkUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0a0a0a] truncate">{music.title}</p>
            <p className="text-[11px] text-[#6b6b6b] truncate">{music.artist}</p>
          </div>
          <button onClick={() => setMusicPickerOpen(true)} className="text-[11px] font-semibold text-[#ef4444] px-2">
            Change
          </button>
          <button onClick={() => setMusic(null)} aria-label="Remove music"
            className="w-8 h-8 rounded-full bg-[#e5e5e5] flex items-center justify-center">
            <X className="w-4 h-4 text-[#0a0a0a]" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setMusicPickerOpen(true)}
          className="w-full mb-1 rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#f5f5f5] p-4 flex items-center gap-3 text-[#6b6b6b] hover:border-[#ef4444]/50 transition-colors">
          <Music className="w-5 h-5" />
          <span className="text-sm font-semibold">Add a music track</span>
        </button>
      )}
      <div className="mb-6" />

      <MusicPicker open={musicPickerOpen} onClose={() => setMusicPickerOpen(false)} onPick={setMusic} />

      <ImageCropperDialog
        file={currentCropFile}
        open={cropperOpen}
        onApply={handleCropApply}
        onCancel={handleCropCancel}
        title={editCropId ? 'Recrop cover for Discover' : (cropQueue.length > 1 ? `Crop cover (${cropQueue.length} left)` : 'Crop your cover photo (shown on Discover)')}
      />


      <button onClick={handleSubmit} disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)]">
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Posting…' : 'Share post'}
      </button>

    </div>
  );
};

export default CreatePostPage;
