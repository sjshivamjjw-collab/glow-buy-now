import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, MapPin, Loader2, Trash2, Pencil, X, ExternalLink, Lock, Sparkles } from 'lucide-react';
import type { TierInfo } from '@/hooks/useCommunityMembership';
import { TierLockOverlay } from './TierLockOverlay';

interface EventRow {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location_url: string | null;
  cover_url: string | null;
  required_tier_level: number;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props {
  communityId: string; isCreator: boolean; tierLevel: number; tiers: TierInfo[]; slug: string;
}

export const EventsPanel = ({ communityId, isCreator, tierLevel, tiers, slug }: Props) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '', starts_at: '', ends_at: '', location_url: '', required_tier_level: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('community_events' as any).select('*')
      .eq('community_id', communityId).order('starts_at', { ascending: true });
    const rows = (data as any as EventRow[]) || [];
    setEvents(rows);
    if (userId && rows.length) {
      const { data: r } = await supabase.from('community_event_rsvps' as any)
        .select('event_id, status').eq('user_id', userId).in('event_id', rows.map(e => e.id));
      const map: Record<string, string> = {};
      ((r as any[]) || []).forEach(x => { map[x.event_id] = x.status; });
      setRsvps(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [communityId, userId]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', starts_at: '', ends_at: '', location_url: '', required_tier_level: 0 });
    setShowForm(true);
  };
  const openEdit = (e: EventRow) => {
    setEditing(e);
    setForm({
      title: e.title, description: e.description || '',
      starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at),
      location_url: e.location_url || '',
      required_tier_level: e.required_tier_level || 0,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.starts_at) { toast({ title: 'Title and start time required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload: any = {
      community_id: communityId, created_by: userId,
      title: form.title.trim(), description: form.description.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location_url: form.location_url.trim() || null,
      required_tier_level: form.required_tier_level,
    };
    const { error } = editing
      ? await supabase.from('community_events' as any).update(payload).eq('id', editing.id)
      : await supabase.from('community_events' as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supabase.from('community_events' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    else load();
  };

  const setRsvp = async (eventId: string, status: 'going' | 'maybe' | 'declined') => {
    if (!userId) return;
    const current = rsvps[eventId];
    if (current === status) {
      await supabase.from('community_event_rsvps' as any).delete().eq('event_id', eventId).eq('user_id', userId);
      setRsvps(prev => { const n = { ...prev }; delete n[eventId]; return n; });
      return;
    }
    const { error } = await supabase.from('community_event_rsvps' as any)
      .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' });
    if (error) toast({ title: 'Could not RSVP', description: error.message, variant: 'destructive' });
    else setRsvps(prev => ({ ...prev, [eventId]: status }));
  };

  const now = Date.now();
  const upcoming = events.filter(e => new Date(e.starts_at).getTime() >= now);
  const past = events.filter(e => new Date(e.starts_at).getTime() < now);

  const renderCard = (e: EventRow, past?: boolean) => {
    const locked = !isCreator && tierLevel < (e.required_tier_level || 0);
    return (
      <EventCard key={e.id} e={e} rsvp={rsvps[e.id]} setRsvp={setRsvp}
        isCreator={isCreator} onEdit={() => openEdit(e)} onDelete={() => remove(e.id)}
        past={past} locked={locked} tiers={tiers} slug={slug} />
    );
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <button onClick={openNew}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Schedule event
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No events yet.
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming</h3>
              {upcoming.map(e => renderCard(e))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3 opacity-60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Past</h3>
              {past.map(e => renderCard(e, true))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{editing ? 'Edit event' : 'New event'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Event title" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What's it about?" rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Starts<input type="datetime-local" value={form.starts_at}
                onChange={e => setForm({ ...form, starts_at: e.target.value })}
                className="w-full mt-1 px-2 py-2 rounded-xl bg-background border border-border text-sm" /></label>
              <label className="text-xs text-muted-foreground">Ends (optional)<input type="datetime-local" value={form.ends_at}
                onChange={e => setForm({ ...form, ends_at: e.target.value })}
                className="w-full mt-1 px-2 py-2 rounded-xl bg-background border border-border text-sm" /></label>
            </div>
            <input value={form.location_url} onChange={e => setForm({ ...form, location_url: e.target.value })}
              placeholder="Meeting link or location URL (optional)"
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
            <label className="block text-xs text-muted-foreground">
              Who can attend?
              <select value={form.required_tier_level} onChange={e => setForm({ ...form, required_tier_level: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-background border border-border text-sm">
                <option value={0}>All members</option>
                {tiers.filter(t => t.sort_order > 0).map(t => (
                  <option key={t.id} value={t.sort_order}>{t.name} and above</option>
                ))}
              </select>
            </label>
            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : (editing ? 'Save changes' : 'Schedule event')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EventCard = ({ e, rsvp, setRsvp, isCreator, onEdit, onDelete, past, locked, tiers, slug }: {
  e: EventRow; rsvp?: string; setRsvp: (id: string, s: 'going'|'maybe'|'declined') => void;
  isCreator: boolean; onEdit: () => void; onDelete: () => void; past?: boolean; locked: boolean;
  tiers: TierInfo[]; slug: string;
}) => (
  <div className={`p-4 rounded-2xl bg-card border border-border space-y-3 ${locked ? 'relative overflow-hidden' : ''}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-foreground">{e.title}</h4>
          {e.required_tier_level > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
              <Sparkles className="w-2.5 h-2.5" /> Premium
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{fmt(e.starts_at)}{e.ends_at ? ` → ${fmt(e.ends_at)}` : ''}</p>
      </div>
      {isCreator && (
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
    {e.description && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{e.description}</p>}

    {locked ? (
      <TierLockOverlay compact requiredLevel={e.required_tier_level} tiers={tiers} slug={slug}
        label="RSVP & link" />
    ) : (
      <>
        {e.location_url && (
          <a href={e.location_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold">
            <MapPin className="w-3.5 h-3.5" /> Join / Location <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {!past && (
          <div className="flex gap-2 pt-1">
            {(['going','maybe','declined'] as const).map(s => (
              <button key={s} onClick={() => setRsvp(e.id, s)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border ${
                  rsvp === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border'
                }`}>{s === 'declined' ? "Can't go" : s}</button>
            ))}
          </div>
        )}
      </>
    )}
  </div>
);
