import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown, ChevronUp, Film, MapPin, Calendar, Wallet, Sparkles, ListChecks, MessageSquare, Upload, Download, CheckCircle2, Trash2 } from 'lucide-react';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';

type Submission = {
  id: string;
  user_id: string;
  destination: string;
  trip_title: string;
  duration_label: string;
  duration_days: number | null;
  cost_text: string | null;
  insights: Record<string, string>;
  itinerary_enabled: boolean;
  itinerary_kind: 'day' | 'place' | null;
  itinerary: { label: string; notes: string }[];
  editor_notes: string | null;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  created_at: string;
  delivered_file_path: string | null;
  delivered_file_name: string | null;
  delivered_at: string | null;
};

type MediaRow = { id: string; submission_id: string; storage_path: string; kind: 'image' | 'video'; caption: string | null; sort_order: number };

const STATUS_OPTIONS: Submission['status'][] = ['pending', 'in_progress', 'delivered', 'cancelled'];

const STATUS_STYLE: Record<Submission['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const INSIGHT_LABELS: Record<string, { emoji: string; label: string }> = {
  best_memory: { emoji: '⭐', label: 'Best Memory' },
  hidden_gem: { emoji: '💎', label: 'Hidden Gem' },
  unexpected: { emoji: '🎁', label: 'Most Unexpected' },
  recommendation: { emoji: '✅', label: 'Recommendation' },
  overrated: { emoji: '👎', label: 'Overrated' },
  mistake: { emoji: '❌', label: 'Biggest Mistake' },
};

const AdminReelsTab = () => {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [authors, setAuthors] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('reel_submissions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { toast({ title: 'Could not load reels', description: error.message, variant: 'destructive' }); setLoading(false); return; }
      const rows = (data as any[] as Submission[]) || [];
      setSubs(rows);
      const uids = Array.from(new Set(rows.map(r => r.user_id)));
      if (uids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, name, phone, email').in('id', uids);
        const map: Record<string, any> = {};
        (profs || []).forEach(p => { map[p.id] = p; });
        setAuthors(map);
      }
      setLoading(false);
    };
    load();
  }, [toast]);

  const patchSubmission = (id: string, patch: Partial<Submission>) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const updateStatus = async (id: string, status: Submission['status']) => {
    const { error } = await supabase.from('reel_submissions' as any).update({ status }).eq('id', id);
    if (error) { toast({ title: 'Failed to update', description: error.message, variant: 'destructive' }); return; }
    patchSubmission(id, { status });
    toast({ title: `Marked as ${status.replace('_', ' ')}` });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (subs.length === 0) return <p className="text-center text-muted-foreground py-8">No reel submissions yet.</p>;

  return (
    <div className="space-y-3">
      {subs.map(s => (
        <SubmissionCard
          key={s.id}
          submission={s}
          author={authors[s.user_id]}
          onStatusChange={(st) => updateStatus(s.id, st)}
          onPatch={(patch) => patchSubmission(s.id, patch)}
        />
      ))}
    </div>
  );
};

export default AdminReelsTab;

const SubmissionCard = ({ submission: s, author, onStatusChange, onPatch }: {
  submission: Submission; author: any; onStatusChange: (st: Submission['status']) => void; onPatch: (p: Partial<Submission>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<(MediaRow & { signedUrl?: string })[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDelivery, setDeletingDelivery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && media.length === 0) {
      setLoadingMedia(true);
      const { data } = await supabase
        .from('reel_submission_media' as any)
        .select('*')
        .eq('submission_id', s.id)
        .order('sort_order');
      const rows = (data as any[] as MediaRow[]) || [];
      // Sign URLs in parallel
      const signed = await Promise.all(rows.map(async r => {
        const { data: sig } = await supabase.storage.from('reel-submissions').createSignedUrl(r.storage_path, 60 * 60);
        return { ...r, signedUrl: sig?.signedUrl };
      }));
      setMedia(signed);
      setLoadingMedia(false);
    }
  };

  const insightEntries = Object.entries(s.insights || {}).filter(([, v]) => v && String(v).trim());
  const itinerary = s.itinerary_enabled ? (s.itinerary || []).filter(i => i.label || i.notes) : [];

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button onClick={toggle} className="w-full flex items-start gap-3 p-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-[#ef4444]/15 flex items-center justify-center shrink-0">
          <Film className="w-5 h-5 text-[#ef4444]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{s.trip_title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {author?.name || author?.phone || 'Unknown'} · {s.destination} · {s.duration_label}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[s.status]}`}>
              {s.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Status changer */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(st => (
              <button
                key={st}
                onClick={() => onStatusChange(st)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                  s.status === st ? STATUS_STYLE[st] : 'bg-card border-border text-muted-foreground'
                }`}
              >{st.replace('_', ' ')}</button>
            ))}
          </div>

          <DetailRow icon={MapPin} label="Destination" value={s.destination} />
          <DetailRow icon={Calendar} label="Duration" value={`${s.duration_label}${s.duration_days ? ` (${s.duration_days} days)` : ''}`} />
          {s.cost_text && <DetailRow icon={Wallet} label="Cost" value={s.cost_text} />}

          {/* Media */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Media</p>
            {loadingMedia ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
              <div className="grid grid-cols-3 gap-2">
                {media.map(m => (
                  <div key={m.id} className="space-y-1">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#1a1a1a]">
                      {m.signedUrl ? (
                        m.kind === 'video'
                          ? <LazyVideoThumbnail src={m.signedUrl} className="w-full h-full object-cover" />
                          : <img src={m.signedUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    {m.caption && <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{m.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {insightEntries.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Insights
              </p>
              <div className="space-y-1.5">
                {insightEntries.map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="font-semibold text-foreground">{INSIGHT_LABELS[k]?.emoji} {INSIGHT_LABELS[k]?.label || k}: </span>
                    <span className="text-muted-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {itinerary.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <ListChecks className="w-3 h-3" /> Itinerary ({s.itinerary_kind === 'day' ? 'day-wise' : 'place-wise'})
              </p>
              <div className="space-y-2">
                {itinerary.map((it, i) => (
                  <div key={i} className="rounded-lg bg-background border border-border p-2">
                    <p className="text-xs font-bold text-foreground">{it.label || `Item ${i + 1}`}</p>
                    {it.notes && <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{it.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.editor_notes && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Notes for editor
              </p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{s.editor_notes}</p>
            </div>
          )}

          {(author?.phone || author?.email) && (
            <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
              Contact: {author.phone || author.email}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2 text-xs">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    <span className="font-semibold text-foreground">{label}:</span>
    <span className="text-muted-foreground">{value}</span>
  </div>
);
