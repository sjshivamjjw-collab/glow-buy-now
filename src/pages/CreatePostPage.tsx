import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, ImagePlus, X, Loader2, MapPin, Hash, Music, Sparkles,
  Palette, Star, MessageSquareQuote, Gem, ChevronRight,
  UtensilsCrossed, BedDouble, Plane, ShoppingBag, BookOpen, Ticket,
} from 'lucide-react';

const MAX_FILES = 10;
const MAX_FILE_MB = 25;
const MAX_AUDIO_MB = 15;

type CategoryKey = 'everyday_vibes' | 'showcase' | 'review' | 'real_talk' | 'hidden_gems';
type ReviewSubKey = 'restaurant' | 'hotel' | 'trip' | 'product' | 'media' | 'activity';

const REVIEW_SUBCATEGORIES: {
  key: ReviewSubKey;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  accent: string;
}[] = [
  { key: 'restaurant', title: 'Restaurant / Bar / Food Joint', subtitle: 'Cafés, bars, street food and dining spots', icon: UtensilsCrossed, accent: 'from-orange-500/20 to-red-400/20 text-orange-500' },
  { key: 'hotel', title: 'Hotel / Stay / Hostel', subtitle: 'Where you stayed and how it felt', icon: BedDouble, accent: 'from-indigo-500/20 to-blue-400/20 text-indigo-500' },
  { key: 'trip', title: 'Trip / Vacation', subtitle: 'A full journey or getaway', icon: Plane, accent: 'from-sky-500/20 to-cyan-400/20 text-sky-500' },
  { key: 'product', title: 'Product', subtitle: 'Something you bought and tried', icon: ShoppingBag, accent: 'from-violet-500/20 to-fuchsia-400/20 text-violet-500' },
  { key: 'media', title: 'Book / Film / Podcast', subtitle: 'What you read, watched, or listened to', icon: BookOpen, accent: 'from-amber-500/20 to-yellow-400/20 text-amber-500' },
  { key: 'activity', title: 'Activity / Experience / Event', subtitle: 'A class, concert, tour, or event', icon: Ticket, accent: 'from-emerald-500/20 to-teal-400/20 text-emerald-500' },
];

const CATEGORIES: {
  key: CategoryKey;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  accent: string;
}[] = [
  { key: 'everyday_vibes', title: 'Daily Life', subtitle: 'Things you see, do & experience through the day', icon: Sparkles, accent: 'from-pink-500/20 to-orange-400/20 text-pink-500' },
  { key: 'showcase', title: 'Show & Tell', subtitle: 'Something you styled, designed, created or bought', icon: Palette, accent: 'from-violet-500/20 to-fuchsia-400/20 text-violet-500' },
  { key: 'review', title: 'Review', subtitle: 'A place, product, food spot, or experience you tried', icon: Star, accent: 'from-amber-500/20 to-yellow-400/20 text-amber-500' },
  { key: 'real_talk', title: 'Advice and Tips', subtitle: 'Share advice, recommendation or life lesson', icon: MessageSquareQuote, accent: 'from-sky-500/20 to-cyan-400/20 text-sky-500' },
  { key: 'hidden_gems', title: 'Hidden Gems & Life Hacks', subtitle: 'Share a secret local spot, rare find, or cool shortcut', icon: Gem, accent: 'from-emerald-500/20 to-teal-400/20 text-emerald-500' },
];

interface PendingMedia {
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
}

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [reviewSub, setReviewSub] = useState<ReviewSubKey | null>(null);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [locSuggestions, setLocSuggestions] = useState<{ name: string; display: string }[]>([]);
  const [locOpen, setLocOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const locJustPicked = useRef(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          const primary = a.city || a.town || a.village || a.suburb || a.neighbourhood || a.county || a.state || d.name || d.display_name.split(',')[0];
          const region = [a.state, a.country].filter(Boolean).join(', ');
          return { name: primary, display: region ? `${primary}, ${region}` : d.display_name };
        });
        // de-dup by display
        const seen = new Set<string>();
        const unique = items.filter(i => { if (seen.has(i.display)) return false; seen.add(i.display); return true; });
        setLocSuggestions(unique);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') setLocSuggestions([]);
      } finally {
        setLocLoading(false);
      }
    }, 300);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [location]);


  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PendingMedia[] = [];
    Array.from(files).forEach(file => {
      if (media.length + next.length >= MAX_FILES) return;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${file.name} is too large`, description: `Max ${MAX_FILE_MB}MB per file`, variant: 'destructive' });
        return;
      }
      const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      next.push({ file, previewUrl: URL.createObjectURL(file), kind });
    });
    setMedia(prev => [...prev, ...next]);
  };

  const removeMedia = (i: number) => {
    setMedia(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[i].previewUrl);
      copy.splice(i, 1);
      return copy;
    });
  };

  const handleAudio = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_AUDIO_MB * 1024 * 1024) {
      toast({ title: 'Audio too large', description: `Max ${MAX_AUDIO_MB}MB`, variant: 'destructive' });
      return;
    }
    setMusicFile(f);
    if (!musicTitle) setMusicTitle(f.name.replace(/\.[^.]+$/, ''));
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

  const handleSubmit = async () => {
    if (!userId || !category) return;
    if (!title.trim() && !body.trim() && media.length === 0) {
      toast({ title: 'Add some content', description: 'Add a title, description, or media', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let musicUrl: string | null = null;
      if (musicFile) {
        const ext = musicFile.name.split('.').pop() || 'mp3';
        const path = `${userId}/music/${Date.now()}.${ext}`;
        const { error: aErr } = await supabase.storage.from('post-media').upload(path, musicFile, {
          contentType: musicFile.type || 'audio/mpeg', upsert: false,
        });
        if (aErr) throw aErr;
        musicUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      }

      const { data: post, error: postErr } = await supabase.from('posts' as any).insert({
        user_id: userId,
        category,
        title: title.trim() || null,
        body: body.trim() || null,
        location: location.trim() || null,
        hashtags,
        music_url: musicUrl,
        music_title: musicFile ? (musicTitle.trim() || null) : null,
      }).select('id').single();
      if (postErr || !post) throw postErr || new Error('Failed to create post');
      const postId = (post as any).id as string;

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const ext = m.file.name.split('.').pop() || (m.kind === 'video' ? 'mp4' : 'jpg');
        const path = `${userId}/${postId}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, m.file, {
          contentType: m.file.type || undefined, upsert: false,
        });
        if (upErr) throw upErr;
        const url = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
        const { error: mErr } = await supabase.from('post_media' as any).insert({
          post_id: postId, url, kind: m.kind, sort_order: i,
        });
        if (mErr) throw mErr;
      }

      toast({ title: 'Posted!' });
      navigate(`/p/${postId}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Could not post', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 1 — pick a category
  if (!category) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
          </button>
          <h1 className="text-xl font-bold text-[#fafafa]">New post</h1>
        </div>
        <h2 className="text-2xl font-bold text-[#fafafa] mb-1">What are you posting about?</h2>
        <p className="text-sm text-[#a0a0a0] mb-5">Pick the closest one — takes one second</p>

        <div className="grid grid-cols-1 gap-3">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="text-left rounded-2xl bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-[#2a2a2a]/70 p-5 flex items-start gap-4 active:scale-[0.98] hover:border-[#ef4444]/50 transition-all shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
              >
                <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#fafafa] text-base leading-tight mb-1">{c.title}</p>
                  <p className="text-[13px] text-[#a0a0a0] leading-snug">{c.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#a0a0a0] mt-1 shrink-0" />
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] max-w-lg mx-auto px-4 pt-4 pb-32">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setCategory(null)} className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
          </button>
          <h1 className="text-xl font-bold text-[#fafafa]">New post</h1>
        </div>
        <h2 className="text-2xl font-bold text-[#fafafa] mb-1">What are you reviewing?</h2>
        <p className="text-sm text-[#a0a0a0] mb-5">Pick the closest one</p>

        <div className="grid grid-cols-1 gap-3">
          {REVIEW_SUBCATEGORIES.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setReviewSub(s.key)}
                className="text-left rounded-2xl bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-[#2a2a2a]/70 p-5 flex items-start gap-4 active:scale-[0.98] hover:border-[#ef4444]/50 transition-all shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
              >
                <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#fafafa] text-base leading-tight mb-1">{s.title}</p>
                  <p className="text-[13px] text-[#a0a0a0] leading-snug">{s.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#a0a0a0] mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

    );
  }


  // STEP 2 — fill in the post
  const Icon = selectedCategory!.icon;
  const goBackFromForm = () => {
    if (category === 'review') { setReviewSub(null); } else { setCategory(null); }
  };
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] max-w-lg mx-auto px-4 pt-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBackFromForm} className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
        </button>
        <h1 className="text-xl font-bold text-[#fafafa]">New post</h1>
      </div>




      {/* Media grid */}
      <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">Media</label>
      <div className="grid grid-cols-3 gap-2 mb-1">
        {media.map((m, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a]/60">
            {m.kind === 'video' ? (
              <video src={m.previewUrl} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
            <button onClick={() => removeMedia(i)} aria-label="Remove" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {media.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[#2a2a2a]/60 bg-[#161616] flex flex-col items-center justify-center text-[#a0a0a0] gap-1 hover:border-[#ef4444]/50 transition-colors"
          >
            <ImagePlus className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Add media</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      

      {/* Title */}
      <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">What are you sharing today?</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="A short and clear title helps more people discover your post" maxLength={140}
        className="w-full px-4 py-3 mb-4 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm" />

      {/* Body */}
      {(() => {
        const BODY_PLACEHOLDERS: Partial<Record<CategoryKey, string>> = {
          everyday_vibes: 'Example of things you can include:\n\n✨ Drop the unfiltered story behind the moment\n\n📅 What\u2019s a day in your life looking like lately?\n\n💭 Life updates, chaotic rants & random thoughts',
          showcase: 'Example of things you can include:\n\n🛠️ What are the items, products, or tools you used here?\n\n⏱️ How long did the entire process or setup take?\n\n🔄 What would you do differently if you were to build it again?',
          review: 'Example of things you can include:\n\n✨ What did you try? Highlight the must-tries or absolute skips.\n\n🪑 How was the seating or service? (e.g., ideal for dates, laptop work, group hangs).\n\n💰 How was the overall experience and did it justify the price?',
          real_talk: 'Example of things you can include:\n\n🧠 What is the exact context and situation one faces?\n\n🪜 What are the key steps to take or avoid?',
          hidden_gems: 'Example of things you can include:\n\n💎 What makes this feel special, underrated or genuinely useful?\n\n🔍 How did you discover it — and how can others find it too?\n\n✨ Any tips for someone planning to try or explore it?',
        };
        const REVIEW_SUB_PLACEHOLDERS: Partial<Record<ReviewSubKey, string>> = {
          trip: 'Example of things you can include:\n\n🛌 How was the comfort, cleanliness, views, and amenities?\n\n💡 Any insider tricks on free upgrades or things to not miss out on?\n\n📢 What would you tell someone who is just about to book this?',
          product: 'Example of things you can include:\n\n⏳ How long have you been using it — and how\u2019s it been?\n\n👍 What impressed you, and what fell short?\n\n💸 Was it worth the price?',
          media: 'Example of things you can include:\n\n🧠 What did you like or dislike the most about it?\n\n👥 What type of person would actually love this, and who should completely skip it?',
          activity: 'Example of things you can include:\n\n🎶 What was the energy and vibe actually like in person?\n\n💸 Looking back, did it feel worth the time and money?',
        };
        const subPh = category === 'review' && reviewSub ? REVIEW_SUB_PLACEHOLDERS[reviewSub] : undefined;
        const ph = subPh ?? BODY_PLACEHOLDERS[category!] ?? 'Tell people more...';
        const hasSuggestions = !!subPh || !!BODY_PLACEHOLDERS[category!];
        const BULLET = '• ';
        const handleBodyFocus = () => {
          if (!body) setBody(BULLET);
        };
        const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          let v = e.target.value;
          // If user wiped everything, leave it empty so placeholder shows again
          if (v.trim() === '' || v === '•' || v === BULLET.trim()) { setBody(''); return; }
          setBody(v);
        };
        const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const ta = e.currentTarget;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const before = body.slice(0, start);
            const after = body.slice(end);
            // If current line is an empty bullet, exit bullet mode (just newline)
            const lineStart = before.lastIndexOf('\n') + 1;
            const currentLine = before.slice(lineStart);
            const insert = currentLine.trim() === '•' ? '\n' : `\n${BULLET}`;
            const next = before + insert + after;
            setBody(next);
            requestAnimationFrame(() => {
              const pos = start + insert.length;
              ta.selectionStart = ta.selectionEnd = pos;
            });
          }
        };
        return (
          <>
            <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">Tell people more...</label>
            <textarea
              value={body}
              onChange={handleBodyChange}
              onFocus={handleBodyFocus}
              onKeyDown={handleBodyKeyDown}
              placeholder={ph}
              maxLength={2000}
              rows={hasSuggestions ? 7 : 5}
              className="w-full px-4 py-3 mb-4 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm resize-none"
            />
          </>
        );
      })()}



      {/* Location */}
      <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">Location</label>
      <div className="relative mb-4">
        <MapPin className="absolute left-4 top-[22px] -translate-y-1/2 w-4 h-4 text-[#a0a0a0]" />
        <input
          value={location}
          onChange={e => { setLocation(e.target.value); setLocOpen(true); }}
          onFocus={() => setLocOpen(true)}
          onBlur={() => setTimeout(() => setLocOpen(false), 150)}
          placeholder="e.g. Mumbai, Bandra"
          maxLength={100}
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
        />
        {locLoading && (
          <Loader2 className="absolute right-3 top-[22px] -translate-y-1/2 w-4 h-4 text-[#a0a0a0] animate-spin" />
        )}
        {locOpen && location.trim().length >= 2 && locSuggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {locSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  locJustPicked.current = true;
                  setLocation(s.display);
                  setLocOpen(false);
                  setLocSuggestions([]);
                }}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-[#161616] border border-[#2a2a2a]/60 transition-colors border-b border-[#2a2a2a]/60 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-[#a0a0a0] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#fafafa] truncate">{s.name}</p>
                  <p className="text-[11px] text-[#a0a0a0] truncate">{s.display}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Hashtags */}
      <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">Hashtags</label>
      <div className="px-3 py-2 mb-1 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex flex-wrap gap-1.5 items-center min-h-[44px]">
        {hashtags.map(h => (
          <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] text-xs font-semibold">
            #{h}
            <button onClick={() => setHashtags(prev => prev.filter(x => x !== h))} aria-label="Remove">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a0a0]" />
          <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} onKeyDown={handleHashtagKey} onBlur={commitHashtag}
            placeholder={hashtags.length ? '' : 'travel, foodie…'}
            className="w-full pl-7 pr-1 py-1 bg-transparent text-[#fafafa] placeholder:text-[#a0a0a0] focus:outline-none text-sm" />
        </div>
      </div>
      <p className="text-[10px] text-[#a0a0a0] mb-5">Press space, comma, or enter to add.</p>

      {/* Music */}
      <label className="text-xs font-semibold text-[#a0a0a0] mb-1 block">Music (optional)</label>
      {musicFile ? (
        <div className="mb-1 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <input value={musicTitle} onChange={e => setMusicTitle(e.target.value)} placeholder="Track title"
              className="w-full bg-transparent text-[#fafafa] text-sm font-semibold focus:outline-none truncate" />
            <p className="text-[10px] text-[#a0a0a0] truncate">{musicFile.name}</p>
          </div>
          <button onClick={() => { setMusicFile(null); setMusicTitle(''); }} aria-label="Remove music"
            className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
            <X className="w-4 h-4 text-[#fafafa]" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => audioRef.current?.click()}
          className="w-full mb-1 rounded-xl border-2 border-dashed border-[#2a2a2a]/60 bg-[#161616] p-4 flex items-center gap-3 text-[#a0a0a0] hover:border-[#ef4444]/50 transition-colors">
          <Music className="w-5 h-5" />
          <span className="text-sm font-semibold">Add a music track</span>
        </button>
      )}
      <input ref={audioRef} type="file" accept="audio/*" className="hidden"
        onChange={e => { handleAudio(e.target.files?.[0] || null); e.target.value = ''; }} />
      <p className="text-[10px] text-[#a0a0a0] mb-6">MP3 / M4A / WAV · max {MAX_AUDIO_MB}MB</p>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)]">
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Posting…' : 'Share post'}
      </button>

    </div>
  );
};

export default CreatePostPage;
