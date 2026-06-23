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
  publish_on_ripple: boolean | null;
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

  const handleUploadDelivery = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
      const path = `${s.user_id}/deliveries/${s.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('reel-submissions')
        .upload(path, file, { upsert: false, contentType: file.type || 'video/mp4' });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from('reel_submissions' as any)
        .update({
          delivered_file_path: path,
          delivered_file_name: file.name,
          delivered_at: new Date().toISOString(),
          status: 'delivered',
        })
        .eq('id', s.id);
      if (updErr) throw updErr;
      onPatch({
        delivered_file_path: path,
        delivered_file_name: file.name,
        delivered_at: new Date().toISOString(),
        status: 'delivered',
      });
      toast({ title: 'Reel delivered', description: 'The user can now download it from My Reels.' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDelivery = async () => {
    if (!s.delivered_file_path) return;
    if (!confirm('Remove the delivered reel file?')) return;
    setDeletingDelivery(true);
    try {
      await supabase.storage.from('reel-submissions').remove([s.delivered_file_path]);
      const { error } = await supabase
        .from('reel_submissions' as any)
        .update({ delivered_file_path: null, delivered_file_name: null, delivered_at: null })
        .eq('id', s.id);
      if (error) throw error;
      onPatch({ delivered_file_path: null, delivered_file_name: null, delivered_at: null });
      toast({ title: 'Delivery removed' });
    } catch (e: any) {
      toast({ title: 'Failed to remove', description: e?.message, variant: 'destructive' });
    } finally {
      setDeletingDelivery(false);
    }
  };


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
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[s.status]}`}>
              {s.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.publish_on_ripple ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}`}>
              {s.publish_on_ripple ? 'PUBLISH ON RIPPLE' : 'PRIVATE'}
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

          {/* Delivered reel file */}
          <div className="rounded-xl bg-background border border-border p-3 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Film className="w-3 h-3" /> Delivered reel file
            </p>
            {s.delivered_file_path ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-semibold truncate">{s.delivered_file_name || 'Reel file'}</span>
                </div>
                {s.delivered_at && (
                  <p className="text-[10px] text-muted-foreground">Delivered {new Date(s.delivered_at).toLocaleString()}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-[11px] font-semibold text-foreground disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Replace file
                  </button>
                  <button
                    onClick={handleRemoveDelivery}
                    disabled={deletingDelivery}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] font-semibold text-red-400 disabled:opacity-50"
                  >
                    {deletingDelivery ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-xs font-bold disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload reel & mark delivered'}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadDelivery(f);
              }}
            />
          </div>

          <DetailRow icon={MapPin} label="Destination" value={s.destination} />
          <DetailRow icon={Calendar} label="Duration" value={`${s.duration_label}${s.duration_days ? ` (${s.duration_days} days)` : ''}`} />
          {s.cost_text && <DetailRow icon={Wallet} label="Cost" value={s.cost_text} />}

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Media ({media.length})</p>
              {media.length > 0 && (
                <button
                  onClick={async () => {
                    for (const m of media) {
                      const filename = m.storage_path.split('/').pop() || `media-${m.id}`;
                      const { data: sig } = await supabase.storage
                        .from('reel-submissions')
                        .createSignedUrl(m.storage_path, 60 * 60, { download: filename });
                      if (sig?.signedUrl) {
                        const a = document.createElement('a');
                        a.href = sig.signedUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        await new Promise(r => setTimeout(r, 300));
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-border text-[10px] font-semibold text-foreground"
                >
                  <Download className="w-3 h-3" /> Download all
                </button>
              )}
            </div>
            {loadingMedia ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
              <div className="grid grid-cols-3 gap-2">
                {media.map(m => (
                  <div key={m.id} className="space-y-1">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1a1a] group">
                      {m.signedUrl ? (
                        m.kind === 'video'
                          ? <LazyVideoThumbnail src={m.signedUrl} className="w-full h-full object-cover" />
                          : <img src={m.signedUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                      <button
                        onClick={async () => {
                          const filename = m.storage_path.split('/').pop() || `media-${m.id}`;
                          const { data: sig } = await supabase.storage
                            .from('reel-submissions')
                            .createSignedUrl(m.storage_path, 60 * 60, { download: filename });
                          if (sig?.signedUrl) {
                            const a = document.createElement('a');
                            a.href = sig.signedUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                          }
                        }}
                        className="absolute bottom-1 right-1 p-1.5 rounded-md bg-black/70 text-white opacity-90 hover:opacity-100"
                        title="Download original"
                      >
                        <Download className="w-3 h-3" />
                      </button>
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
