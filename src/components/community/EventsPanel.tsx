import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Plus, MapPin, Loader2, Trash2, Pencil, X, ExternalLink, Sparkles, Video, User, Check, ChevronDown } from 'lucide-react';
import type { TierInfo } from '@/hooks/useCommunityMembership';
import { TierLockOverlay } from './TierLockOverlay';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  audience_user_ids: string[] | null;
}

interface MemberOpt { id: string; name: string; avatar_url: string | null; }

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

interface Props {
  communityId: string; isCreator: boolean; tierLevel: number; tiers: TierInfo[]; slug: string;
}

// time options every 15 min
const pad2 = (n: number) => String(n).padStart(2, '0');
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4); const m = (i % 4) * 15;
  return `${pad2(h)}:${pad2(m)}`;
});
const fmt12 = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
};

const splitDate = (iso?: string | null): { date?: Date; time: string } => {
  if (!iso) return { date: undefined, time: '' };
  const d = new Date(iso);
  return { date: d, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
};
const combine = (date?: Date, time?: string): string => {
  if (!date || !time) return '';
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(date); d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

export const EventsPanel = ({ communityId, isCreator, tierLevel, tiers, slug }: Props) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<MemberOpt[]>([]);
  const [form, setForm] = useState<{
    title: string; description: string;
    startDate?: Date; startTime: string;
    endDate?: Date; endTime: string;
    location_url: string;
    audience_mode: 'tier' | 'individual';
    required_tier_level: number;
    audience_user_ids: string[];
  }>({
    title: '', description: '',
    startDate: undefined, startTime: '',
    endDate: undefined, endTime: '',
    location_url: '',
    audience_mode: 'tier', required_tier_level: 0, audience_user_ids: [],
  });
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

  const loadMembers = async () => {
    if (!isCreator) return;
    const { data: ms } = await supabase.from('memberships')
      .select('user_id').eq('community_id', communityId).eq('status', 'active');
    const ids = Array.from(new Set(((ms as any[]) || []).map(m => m.user_id))).filter(id => id !== userId);
    if (!ids.length) { setMembers([]); return; }
    const { data: profs } = await supabase.rpc('get_chat_author_names', { _user_ids: ids });
    setMembers(((profs as any[]) || []).map(p => ({ id: p.id, name: p.name || p.username || 'Member', avatar_url: p.avatar_url })));
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', startDate: undefined, startTime: '', endDate: undefined, endTime: '', location_url: '', audience_mode: 'tier', required_tier_level: 0, audience_user_ids: [] });
    setShowForm(true); loadMembers();
  };
  const openEdit = (e: EventRow) => {
    setEditing(e);
    const s = splitDate(e.starts_at); const en = splitDate(e.ends_at);
    const audience = e.audience_user_ids || [];
    setForm({
      title: e.title, description: e.description || '',
      startDate: s.date, startTime: s.time,
      endDate: en.date, endTime: en.time,
      location_url: e.location_url || '',
      audience_mode: audience.length > 0 ? 'individual' : 'tier',
      required_tier_level: e.required_tier_level || 0,
      audience_user_ids: audience,
    });
    setShowForm(true); loadMembers();
  };

  const save = async () => {
    if (!form.title.trim() || !form.startDate || !form.startTime) {
      toast({ title: 'Title, start date and time required', variant: 'destructive' }); return;
    }
    if (form.audience_mode === 'individual' && form.audience_user_ids.length === 0) {
      toast({ title: 'Select at least one member', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload: any = {
      community_id: communityId, created_by: userId,
      title: form.title.trim(), description: form.description.trim() || null,
      starts_at: combine(form.startDate, form.startTime),
      ends_at: form.endDate && form.endTime ? combine(form.endDate, form.endTime) : null,
      location_url: form.location_url.trim() || null,
      required_tier_level: form.audience_mode === 'individual' ? 0 : form.required_tier_level,
      audience_user_ids: form.audience_mode === 'individual' ? form.audience_user_ids : [],
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
    const isOneOnOne = (e.audience_user_ids?.length || 0) > 0;
    return (
      <EventCard key={e.id} e={e} rsvp={rsvps[e.id]} setRsvp={setRsvp}
        isCreator={isCreator} onEdit={() => openEdit(e)} onDelete={() => remove(e.id)}
        past={past} locked={locked} tiers={tiers} slug={slug} isOneOnOne={isOneOnOne} />
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
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
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
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{editing ? 'Edit event' : 'New event'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Event title" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What's it about?" rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm resize-none" />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Starts</label>
              <DateTimePicker date={form.startDate} time={form.startTime}
                onDate={d => setForm({ ...form, startDate: d })} onTime={t => setForm({ ...form, startTime: t })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Ends (optional)</label>
              <DateTimePicker date={form.endDate} time={form.endTime}
                onDate={d => setForm({ ...form, endDate: d })} onTime={t => setForm({ ...form, endTime: t })} />
            </div>

            <div>
              <input value={form.location_url} onChange={e => setForm({ ...form, location_url: e.target.value })}
                placeholder="Meeting link or location URL (optional)"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
              <button
                type="button"
                onClick={() => {
                  const slug = `livecart-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;
                  setForm({ ...form, location_url: `https://meet.jit.si/${slug}` });
                  toast({ title: 'Meeting link generated', description: 'Anyone with the link can join — no account needed.' });
                }}
                className="mt-2 w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-secondary/80">
                <Video className="w-3.5 h-3.5" /> Generate instant video meeting link
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Who can attend?</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, audience_mode: 'tier' })}
                  className={cn('py-2 rounded-xl text-xs font-semibold border', form.audience_mode === 'tier' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border')}>
                  By tier
                </button>
                <button type="button" onClick={() => setForm({ ...form, audience_mode: 'individual' })}
                  className={cn('py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1', form.audience_mode === 'individual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border')}>
                  <User className="w-3 h-3" /> 1-on-1 / select
                </button>
              </div>
              {form.audience_mode === 'tier' ? (
                <select value={form.required_tier_level} onChange={e => setForm({ ...form, required_tier_level: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm">
                  <option value={0}>All members</option>
                  {tiers.filter(t => t.sort_order > 0).map(t => (
                    <option key={t.id} value={t.sort_order}>{t.name} and above</option>
                  ))}
                </select>
              ) : (
                <MemberPicker members={members} selected={form.audience_user_ids}
                  onChange={ids => setForm({ ...form, audience_user_ids: ids })} />
              )}
              {form.audience_mode === 'individual' && (
                <p className="text-[11px] text-muted-foreground">Only the selected members will see this event.</p>
              )}
            </div>

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

const DateTimePicker = ({ date, time, onDate, onTime }: {
  date?: Date; time: string; onDate: (d?: Date) => void; onTime: (t: string) => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <Popover>
      <PopoverTrigger asChild>
        <button type="button"
          className={cn('flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-background border border-border text-sm', !date && 'text-muted-foreground')}>
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="w-4 h-4 shrink-0" />
            {date ? format(date, 'd MMM yyyy') : 'Pick date'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onDate} initialFocus
          className={cn('p-3 pointer-events-auto')} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
      </PopoverContent>
    </Popover>
    <select value={time} onChange={e => onTime(e.target.value)}
      className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm">
      <option value="">Pick time</option>
      {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  </div>
);

const MemberPicker = ({ members, selected, onChange }: {
  members: MemberOpt[]; selected: string[]; onChange: (ids: string[]) => void;
}) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() =>
    members.filter(m => m.name.toLowerCase().includes(q.toLowerCase())), [members, q]);
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  return (
    <div className="rounded-xl border border-border bg-background">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members…"
        className="w-full px-3 py-2 bg-transparent border-b border-border text-sm outline-none" />
      <div className="max-h-48 overflow-y-auto">
        {members.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">No members yet</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">No match</div>
        ) : filtered.map(m => {
          const on = selected.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => toggle(m.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-left">
              {m.avatar_url
                ? <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{m.name[0]?.toUpperCase()}</div>}
              <span className="flex-1 truncate text-foreground">{m.name}</span>
              {on && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground">
          {selected.length} selected
        </div>
      )}
    </div>
  );
};

const EventCard = ({ e, rsvp, setRsvp, isCreator, onEdit, onDelete, past, locked, tiers, slug, isOneOnOne }: {
  e: EventRow; rsvp?: string; setRsvp: (id: string, s: 'going'|'maybe'|'declined') => void;
  isCreator: boolean; onEdit: () => void; onDelete: () => void; past?: boolean; locked: boolean;
  tiers: TierInfo[]; slug: string; isOneOnOne: boolean;
}) => (
  <div className={`p-4 rounded-2xl bg-card border border-border space-y-3 ${locked ? 'relative overflow-hidden' : ''}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-semibold text-foreground">{e.title}</h4>
          {isOneOnOne && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
              <User className="w-2.5 h-2.5" /> 1-on-1
            </span>
          )}
          {!isOneOnOne && e.required_tier_level > 0 && (
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
