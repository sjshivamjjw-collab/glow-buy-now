import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Film, Upload, X, ImagePlus, Plus, Loader2, Check,
  Calendar, MapPin, Sparkles, Wallet, ListChecks, MessageSquare, ChevronDown, ChevronUp, LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';

// ───────────────────────── State ─────────────────────────

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  caption: string;
};

type Insights = {
  best_memory: string;
  hidden_gem: string;
  unexpected: string;
  recommendation: string;
  overrated: string;
  mistake: string;
};

type ItineraryItem = { label: string; notes: string };

type State = {
  destination: string;
  tripTitle: string;
  durationLabel: string;
  durationDays: string;
  media: MediaItem[];
  costText: string;
  insights: Insights;
  itineraryEnabled: boolean;
  itineraryKind: 'day' | 'place';
  itinerary: ItineraryItem[];
  editorNotes: string;
};

const initialState: State = {
  destination: '',
  tripTitle: '',
  durationLabel: '',
  durationDays: '',
  media: [],
  costText: '',
  insights: { best_memory: '', hidden_gem: '', unexpected: '', recommendation: '', overrated: '', mistake: '' },
  itineraryEnabled: false,
  itineraryKind: 'day',
  itinerary: [{ label: 'Day 1', notes: '' }],
  editorNotes: '',
};

type Action =
  | { type: 'set'; key: keyof State; value: any }
  | { type: 'setInsight'; key: keyof Insights; value: string }
  | { type: 'addMedia'; items: MediaItem[] }
  | { type: 'removeMedia'; id: string }
  | { type: 'setCaption'; id: string; caption: string }
  | { type: 'setItinerary'; items: ItineraryItem[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set': return { ...state, [action.key]: action.value };
    case 'setInsight': return { ...state, insights: { ...state.insights, [action.key]: action.value } };
    case 'addMedia': return { ...state, media: [...state.media, ...action.items] };
    case 'removeMedia': {
      const item = state.media.find(m => m.id === action.id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return { ...state, media: state.media.filter(m => m.id !== action.id) };
    }
    case 'setCaption':
      return { ...state, media: state.media.map(m => m.id === action.id ? { ...m, caption: action.caption } : m) };
    case 'setItinerary': return { ...state, itinerary: action.items };
  }
}

// ───────────────────────── Page ─────────────────────────

const STEPS = ['Basics', 'Media', 'Insights', 'Itinerary', 'Notes'] as const;
type StepName = typeof STEPS[number];

const stepIcons: Record<StepName, any> = {
  Basics: MapPin, Media: ImagePlus, Insights: Sparkles, Itinerary: ListChecks, Notes: MessageSquare,
};

const DRAFT_KEY = 'reel-submission-draft-v1';

// Persisted draft excludes media (File objects can't be serialized)
type DraftState = Omit<State, 'media'>;

const loadDraft = (): DraftState | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftState;
  } catch { return null; }
};

const CreateReelPage = () => {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    const draft = loadDraft();
    return draft ? { ...init, ...draft, media: [] } : init;
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  // Persist draft (excluding media) whenever state changes
  useEffect(() => {
    if (done) return;
    try {
      const { media, ...rest } = state;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch { /* ignore quota errors */ }
  }, [state, done]);

  const handleTopBack = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    else navigate(-1);
  };

  const step = STEPS[stepIdx];

  const canContinue = (): boolean => {
    if (step === 'Basics') {
      return !!state.destination.trim() && !!state.tripTitle.trim() && (!!state.durationLabel || !!state.durationDays);
    }
    if (step === 'Media') {
      const imageCount = state.media.filter(m => m.kind === 'image').length;
      return imageCount >= 5;
    }
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      if (step === 'Media') toast({ title: 'Add at least 5 photos', description: 'Videos are optional but you need at least 5 images.', variant: 'destructive' });
      else toast({ title: 'Please fill the required fields', variant: 'destructive' });
      return;
    }
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
    else handleSubmit();
  };

  const back = () => { if (stepIdx > 0) setStepIdx(stepIdx - 1); };

  const handleSubmit = async () => {
    if (!userId) { toast({ title: 'Please sign in', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      // 1. Insert submission row
      const { data: sub, error: subErr } = await supabase
        .from('reel_submissions' as any)
        .insert({
          user_id: userId,
          destination: state.destination.trim(),
          trip_title: state.tripTitle.trim(),
          duration_label: state.durationLabel || (state.durationDays ? `${state.durationDays} Days` : ''),
          duration_days: state.durationDays ? parseInt(state.durationDays, 10) : null,
          cost_text: state.costText.trim() || null,
          insights: state.insights,
          itinerary_enabled: state.itineraryEnabled,
          itinerary_kind: state.itineraryEnabled ? state.itineraryKind : null,
          itinerary: state.itineraryEnabled ? state.itinerary.filter(i => i.label.trim() || i.notes.trim()) : [],
          editor_notes: state.editorNotes.trim() || null,
        })
        .select('id')
        .single();
      if (subErr || !sub) throw subErr || new Error('Submission failed');
      const submissionId = (sub as any).id as string;

      // 2. Upload media one by one
      const mediaRows: any[] = [];
      for (let i = 0; i < state.media.length; i++) {
        const m = state.media[i];
        const ext = m.file.name.split('.').pop() || (m.kind === 'video' ? 'mp4' : 'jpg');
        const path = `${userId}/${submissionId}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('reel-submissions').upload(path, m.file, {
          contentType: m.file.type, upsert: false,
        });
        if (upErr) throw upErr;
        mediaRows.push({
          submission_id: submissionId,
          storage_path: path,
          kind: m.kind,
          caption: m.caption.trim() || null,
          sort_order: i,
        });
      }
      if (mediaRows.length) {
        const { error: mErr } = await supabase.from('reel_submission_media' as any).insert(mediaRows);
        if (mErr) throw mErr;
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone(true);
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return <SuccessScreen onDone={() => navigate('/reels/mine')} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] max-w-lg mx-auto pb-48">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a] px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={handleTopBack} aria-label={stepIdx > 0 ? 'Previous step' : 'Go back'} className="p-2 -ml-2 rounded-xl text-[#fafafa]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#ef4444]" />
              <h1 className="text-base font-bold text-[#fafafa]">Create Travel Reel</h1>
            </div>
            <p className="text-[11px] text-[#a0a0a0]">Step {stepIdx + 1} of {STEPS.length} · {step}</p>
          </div>
          <button
            onClick={() => navigate('/reels/mine')}
            aria-label="My reel requests"
            className="p-2 -mr-1 rounded-xl bg-[#161616] border border-[#2a2a2a] text-[#fafafa]"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIdx ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'}`} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-5">
        {step === 'Basics' && <StepBasics state={state} dispatch={dispatch} />}
        {step === 'Media' && <StepMedia state={state} dispatch={dispatch} />}
        {step === 'Insights' && <StepInsights state={state} dispatch={dispatch} />}
        {step === 'Itinerary' && <StepItinerary state={state} dispatch={dispatch} />}
        {step === 'Notes' && <StepNotes state={state} dispatch={dispatch} />}
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-[64px] inset-x-0 z-40 mx-auto w-full max-w-lg bg-[#0a0a0a]/95 backdrop-blur border-t border-[#2a2a2a] px-4 pt-3 pb-3 flex gap-2">
        {stepIdx > 0 && (
          <button
            onClick={back}
            disabled={submitting}
            className="px-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a] text-[#fafafa] text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          onClick={next}
          disabled={submitting}
          className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.6)] disabled:opacity-60"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> :
            stepIdx === STEPS.length - 1 ? <><Upload className="w-4 h-4" /> Send my reel request</> :
            <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
};

export default CreateReelPage;

// ───────────────────────── Step components ─────────────────────────

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-wide mb-2">
    {children} {required && <span className="text-[#ef4444]">*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/80 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/80 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm resize-none"
  />
);

// Step 1 — Basics
const DURATION_PRESETS = ['Weekend', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days+'];

const StepBasics = ({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) => (
  <div className="space-y-5">
    <Intro icon={MapPin} title="Trip basics" subtitle="Where did you go, and what should we call this reel?" />
    <div>
      <Label required>Destination</Label>
      <Input placeholder="Lonavala, Goa, Vietnam…" value={state.destination} onChange={e => dispatch({ type: 'set', key: 'destination', value: e.target.value })} />
    </div>
    <div>
      <Label required>Trip title</Label>
      <Input placeholder="How I travelled Vietnam solo under 50K" value={state.tripTitle} onChange={e => dispatch({ type: 'set', key: 'tripTitle', value: e.target.value })} />
      <p className="text-[11px] text-[#6b6b6b] mt-1.5">Make it catchy — this becomes the reel headline.</p>
    </div>
    <div>
      <Label required>Duration</Label>
      <div className="flex flex-wrap gap-2 mb-3">
        {DURATION_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => dispatch({ type: 'set', key: 'durationLabel', value: state.durationLabel === p ? '' : p })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              state.durationLabel === p
                ? 'bg-[#ef4444] border-[#ef4444] text-white'
                : 'bg-[#161616] border-[#2a2a2a] text-[#a0a0a0]'
            }`}
          >{p}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#6b6b6b]" />
        <Input
          type="number" min={1} placeholder="…or enter # of days"
          value={state.durationDays}
          onChange={e => dispatch({ type: 'set', key: 'durationDays', value: e.target.value.replace(/[^0-9]/g, '') })}
        />
      </div>
    </div>
  </div>
);

// Step 2 — Media
const StepMedia = ({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageCount = state.media.filter(m => m.kind === 'image').length;
  const videoCount = state.media.filter(m => m.kind === 'video').length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const items: MediaItem[] = Array.from(files).map(file => {
      const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind,
        caption: '',
      };
    });
    dispatch({ type: 'addMedia', items });
  };

  return (
    <div className="space-y-5">
      <Intro icon={ImagePlus} title="Upload your trip media" subtitle="Add at least 5 photos." />

      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ''; }} />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full py-4 rounded-2xl bg-[#161616] border-2 border-dashed border-[#2a2a2a] hover:border-[#ef4444]/50 text-[#fafafa] font-semibold text-sm flex flex-col items-center justify-center gap-1.5 transition-colors"
      >
        <Upload className="w-5 h-5 text-[#ef4444]" />
        Tap to add photos & videos
        <span className="text-[11px] text-[#6b6b6b] font-normal">You can pick multiple at once</span>
      </button>

      <div className="flex items-center gap-2 text-xs">
        <span className={`px-2.5 py-1 rounded-full font-semibold ${imageCount >= 5 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#161616] text-[#a0a0a0] border border-[#2a2a2a]'}`}>
          {imageCount >= 5 ? <Check className="w-3 h-3 inline mr-1" /> : null}
          {imageCount} / 5 photos
        </span>
        {videoCount > 0 && <span className="px-2.5 py-1 rounded-full bg-[#161616] border border-[#2a2a2a] text-[#a0a0a0] font-semibold">{videoCount} video{videoCount > 1 ? 's' : ''}</span>}
      </div>

      {state.media.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wide">Add a short tag (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            {state.media.map(m => (
              <div key={m.id} className="space-y-1.5">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a]">
                  {m.kind === 'video'
                    ? <LazyVideoThumbnail src={m.previewUrl} className="w-full h-full object-cover" />
                    : <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />}
                  <button
                    onClick={() => dispatch({ type: 'removeMedia', id: m.id })}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    aria-label="Remove"
                  ><X className="w-3.5 h-3.5" /></button>
                  {m.kind === 'video' && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-bold">VIDEO</span>
                  )}
                </div>
                <input
                  value={m.caption}
                  onChange={e => dispatch({ type: 'setCaption', id: m.id, caption: e.target.value })}
                  placeholder="Sunset Point from Goa Beach"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#2a2a2a] text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-1 focus:ring-[#ef4444]/40 text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Step 3 — Cost + Insights (combined)
const INSIGHT_FIELDS: { key: keyof Insights; emoji: string; label: string; placeholder: string }[] = [
  { key: 'best_memory', emoji: '⭐', label: 'Best Memories', placeholder: 'That one moment you won\'t forget…' },
  { key: 'hidden_gem', emoji: '💎', label: 'Hidden Gems', placeholder: 'A spot most people miss' },
  
  { key: 'recommendation', emoji: '✅', label: 'Trip Recommendation', placeholder: 'Must-do for anyone visiting' },
  { key: 'overrated', emoji: '👎', label: 'Things Overrated', placeholder: 'Skip-able in your opinion' },
  { key: 'mistake', emoji: '❌', label: 'Biggest Mistake', placeholder: 'Don\'t do what I did…' },
];

const StepInsights = ({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) => (
  <div className="space-y-6">
    {/* Cost block */}
    <div className="space-y-5">
      <Intro icon={Wallet} title="Approximate trip cost (optional)" subtitle="Helps your viewers know what to budget." />
      <div>
        <Label>Total cost</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a0a0a0] font-semibold text-sm">₹</span>
          <input
            value={state.costText}
            onChange={e => dispatch({ type: 'set', key: 'costText', value: e.target.value })}
            placeholder="65,000"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/80 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
          />
        </div>
        <p className="text-[11px] text-[#6b6b6b] mt-1.5">You can include a note like "for 2 people" — free text.</p>
      </div>
    </div>

    {/* Divider */}
    <div className="h-px bg-[#2a2a2a]" />

    {/* Insights block */}
    <div className="space-y-5">
      <Intro icon={Sparkles} title="Travel insights" subtitle="Optional. Share the bits that make your reel real." />
      <div className="space-y-3">
        {INSIGHT_FIELDS.map(f => (
          <div key={f.key} className="rounded-2xl bg-[#161616] border border-[#2a2a2a]/80 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{f.emoji}</span>
              <span className="text-sm font-bold text-[#fafafa]">{f.label}</span>
            </div>
            <Textarea
              rows={2}
              placeholder={f.placeholder}
              value={state.insights[f.key]}
              onChange={e => dispatch({ type: 'setInsight', key: f.key, value: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Step 5 — Itinerary
const StepItinerary = ({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) => {
  const setItems = (items: ItineraryItem[]) => dispatch({ type: 'setItinerary', items });
  const switchKind = (kind: 'day' | 'place') => {
    dispatch({ type: 'set', key: 'itineraryKind', value: kind });
    setItems(kind === 'day'
      ? [{ label: 'Day 1', notes: '' }]
      : [{ label: '', notes: '' }]);
  };
  const addRow = () => {
    const next = state.itineraryKind === 'day' ? `Day ${state.itinerary.length + 1}` : '';
    setItems([...state.itinerary, { label: next, notes: '' }]);
  };
  const updateRow = (i: number, patch: Partial<ItineraryItem>) => {
    setItems(state.itinerary.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeRow = (i: number) => setItems(state.itinerary.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <Intro icon={ListChecks} title="Detailed itinerary (optional)" subtitle="Helps the team add a structured breakdown." />
      <button
        onClick={() => dispatch({ type: 'set', key: 'itineraryEnabled', value: !state.itineraryEnabled })}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors ${
          state.itineraryEnabled ? 'bg-[#ef4444]/10 border-[#ef4444]/40' : 'bg-[#161616] border-[#2a2a2a]'
        }`}
      >
        <span className="text-sm font-bold text-[#fafafa]">Add detailed itinerary</span>
        <span className={`relative w-11 h-6 rounded-full transition-colors ${state.itineraryEnabled ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${state.itineraryEnabled ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      {state.itineraryEnabled && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(['day', 'place'] as const).map(k => (
              <button
                key={k}
                onClick={() => switchKind(k)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  state.itineraryKind === k ? 'bg-[#ef4444] border-[#ef4444] text-white' : 'bg-[#161616] border-[#2a2a2a] text-[#a0a0a0]'
                }`}
              >{k === 'day' ? 'Day-wise' : 'Place-wise'}</button>
            ))}
          </div>

          <div className="space-y-3">
            {state.itinerary.map((it, i) => (
              <div key={i} className="rounded-2xl bg-[#161616] border border-[#2a2a2a]/80 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={state.itineraryKind === 'day' ? `Day ${i + 1}` : 'Place name (e.g. Hoi An)'}
                    value={it.label}
                    onChange={e => updateRow(i, { label: e.target.value })}
                  />
                  {state.itinerary.length > 1 && (
                    <button onClick={() => removeRow(i)} className="p-2 rounded-lg bg-[#1f1f1f] text-[#a0a0a0]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Textarea rows={2} placeholder="Short notes — what you did, where you stayed…"
                  value={it.notes} onChange={e => updateRow(i, { notes: e.target.value })} />
              </div>
            ))}
            <button onClick={addRow} className="w-full py-2.5 rounded-xl bg-[#161616] border border-dashed border-[#2a2a2a] text-[#a0a0a0] text-sm font-semibold flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add {state.itineraryKind === 'day' ? 'another day' : 'another place'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Step 6 — Notes
const StepNotes = ({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) => (
  <div className="space-y-5">
    <Intro icon={MessageSquare} title="Notes for the reel editor" subtitle="Anything you'd like them to know? Vibe, music style, what to highlight…" />
    <Textarea
      rows={6}
      placeholder="e.g. Please use chill lofi music, highlight the beach shots, and don't include the airport photos."
      value={state.editorNotes}
      onChange={e => dispatch({ type: 'set', key: 'editorNotes', value: e.target.value })}
    />
    <div className="rounded-2xl bg-[#ef4444]/5 border border-[#ef4444]/20 p-4">
      <p className="text-xs font-bold text-[#ef4444] mb-1">Almost there!</p>
      <p className="text-[12px] text-[#a0a0a0] leading-relaxed">
        Tap <strong className="text-[#fafafa]">Send my reel request</strong> below and our team will update you within 24 hours
      </p>
    </div>
  </div>
);

const Intro = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-xl bg-[#ef4444]/15 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-[#ef4444]" />
    </div>
    <div>
      <h2 className="text-base font-bold text-[#fafafa]">{title}</h2>
      <p className="text-xs text-[#a0a0a0] mt-0.5 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

// ───────────────────────── Success ─────────────────────────

const SuccessScreen = ({ onDone }: { onDone: () => void }) => (
  <div className="min-h-screen bg-[#0a0a0a] max-w-lg mx-auto px-6 flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center mb-6 shadow-[0_12px_40px_-8px_rgba(239,68,68,0.6)]">
      <Check className="w-10 h-10 text-white" strokeWidth={3} />
    </div>
    <h1 className="text-2xl font-bold text-[#fafafa] mb-3">We've got your trip! 🎬</h1>
    <p className="text-sm text-[#a0a0a0] leading-relaxed max-w-xs mb-8">
      Our team will reach out within 24&nbsp;hours&nbsp;
    </p>
    <button
      onClick={onDone}
      className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-bold shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)]"
    >
      Back to Discover
    </button>
  </div>
);
