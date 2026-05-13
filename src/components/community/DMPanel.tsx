import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Loader2, Paperclip, Image as ImageIcon, Plus, FileText, Download, Trash2, Search, MessageSquarePlus, Users } from 'lucide-react';
import { SignedImage, SignedLink } from '@/components/SignedMedia';
import { format, isToday, isYesterday } from 'date-fns';

const colorFor = (id: string) => {
  const palette = ['hsl(330 80% 60%)','hsl(200 80% 55%)','hsl(150 60% 45%)','hsl(35 90% 55%)','hsl(265 70% 60%)','hsl(0 75% 60%)','hsl(180 60% 45%)'];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
const formatSize = (b?: number | null) => !b ? '' : b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`;
const dayLabel = (d: Date) => isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');

interface Author { id: string; name: string | null; username: string | null; avatar_url: string | null; }
interface Thread { id: string; user_a: string; user_b: string; last_message_at: string | null; other?: Author; lastPreview?: string; }
type DmKind = 'text' | 'image' | 'file';
interface DM {
  id: string; thread_id: string; sender_id: string; recipient_id: string;
  kind: DmKind; body: string | null; created_at: string;
  attachment_url: string | null; attachment_name: string | null; attachment_mime: string | null; attachment_size: number | null;
}

interface Props {
  communityId: string;
  initialUserId?: string | null;
  onClose: () => void;
  onOpenChange?: (otherUserId: string | null) => void;
}

export const DMPanel = ({ communityId, initialUserId, onClose, onOpenChange }: Props) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeThread, setActiveThread] = useState<{ thread: Thread; other: Author } | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Load threads + other user info
  const loadThreads = async () => {
    if (!userId) return;
    setLoadingThreads(true);
    const { data } = await supabase.from('community_dm_threads' as any)
      .select('*')
      .eq('community_id', communityId)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);
    const rows = (data as any[]) || [];
    const otherIds = rows.map(t => t.user_a === userId ? t.user_b : t.user_a);
    const authors = await fetchAuthors(otherIds);
    // last message previews
    const ids = rows.map(t => t.id);
    let previews: Record<string, string> = {};
    if (ids.length) {
      const { data: ms } = await supabase.from('community_dm_messages' as any)
        .select('thread_id, kind, body, attachment_name, created_at')
        .in('thread_id', ids).order('created_at', { ascending: false }).limit(ids.length * 5);
      ((ms as any[]) || []).forEach((m: any) => {
        if (previews[m.thread_id]) return;
        previews[m.thread_id] = m.kind === 'text' ? (m.body || '') : m.kind === 'image' ? '📷 Photo' : `📎 ${m.attachment_name || 'File'}`;
      });
    }
    setThreads(rows.map(t => ({
      ...t,
      other: authors[t.user_a === userId ? t.user_b : t.user_a],
      lastPreview: previews[t.id] || '',
    })));
    setLoadingThreads(false);
  };

  useEffect(() => { loadThreads(); }, [communityId, userId]);

  // Auto-open initial DM
  useEffect(() => {
    if (!initialUserId || !userId || initialUserId === userId) return;
    (async () => { await openWith(initialUserId); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, userId]);

  const openWith = async (otherUserId: string) => {
    if (!userId) return;
    const { data: tid, error } = await supabase.rpc('get_or_create_dm_thread' as any, {
      _community_id: communityId, _other_user_id: otherUserId,
    });
    if (error) { toast({ title: 'Cannot start DM', description: error.message, variant: 'destructive' }); return; }
    const author = (await fetchAuthors([otherUserId]))[otherUserId];
    if (!author) { toast({ title: 'User not found', variant: 'destructive' }); return; }
    const a = userId < otherUserId ? userId : otherUserId;
    const b = userId < otherUserId ? otherUserId : userId;
    setActiveThread({ thread: { id: String(tid), user_a: a, user_b: b, last_message_at: null }, other: author });
    onOpenChange?.(otherUserId);
  };

  const closeThread = () => { setActiveThread(null); onOpenChange?.(null); loadThreads(); };

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
      {!activeThread ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={onClose} className="p-2 rounded-xl bg-card border border-border" aria-label="Back to channels">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <h3 className="flex-1 text-base font-bold text-foreground">Direct messages</h3>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
              <MessageSquarePlus className="w-4 h-4" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {loadingThreads ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : threads.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No conversations yet. Tap <span className="font-semibold text-foreground">New</span> to message a member.
              </div>
            ) : threads.map(t => {
              if (!t.other) return null;
              const accent = colorFor(t.other.id);
              const name = t.other.name || t.other.username || 'Member';
              return (
                <button key={t.id} onClick={() => { setActiveThread({ thread: t, other: t.other! }); onOpenChange?.(t.other!.id); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/50 transition text-left">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: accent }}>
                    {t.other.avatar_url
                      ? <img src={t.other.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-bold text-white">{name.slice(0,1).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                      {t.last_message_at && (
                        <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                          {format(new Date(t.last_message_at), isToday(new Date(t.last_message_at)) ? 'h:mm a' : 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t.lastPreview || 'No messages yet'}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {showNew && (
            <NewDMDialog communityId={communityId} myId={userId!} onClose={() => setShowNew(false)}
              onPick={(uid) => { setShowNew(false); openWith(uid); }} />
          )}
        </>
      ) : (
        <DMThreadView thread={activeThread.thread} other={activeThread.other} communityId={communityId}
          onBack={closeThread} />
      )}
    </div>
  );
};

const fetchAuthors = async (userIds: string[]): Promise<Record<string, Author>> => {
  if (!userIds.length) return {};
  const ids = [...new Set(userIds)];
  const { data } = await supabase.rpc('get_chat_author_names' as any, { _user_ids: ids });
  const map: Record<string, Author> = {};
  ((data as any[]) || []).forEach((p: any) => { map[p.id] = p; });
  return map;
};

const DMThreadView = ({ thread, other, communityId, onBack }: {
  thread: Thread; other: Author; communityId: string; onBack: () => void;
}) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('community_dm_messages' as any)
        .select('*').eq('thread_id', thread.id).order('created_at', { ascending: true }).limit(500);
      if (!cancelled) { setMessages(((data as any[]) || []) as DM[]); setLoading(false); }
    })();

    // Use a private Realtime topic so realtime.messages RLS can verify
    // the subscriber is one of the two thread participants.
    const ch = supabase.channel(`dm:${thread.id}`, { config: { private: true } })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_dm_messages', filter: `thread_id=eq.${thread.id}` },
        (payload: any) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new as DM]))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_dm_messages', filter: `thread_id=eq.${thread.id}` },
        (payload: any) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [thread.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !userId) return;
    setSending(true);
    const { error } = await supabase.from('community_dm_messages' as any).insert({
      thread_id: thread.id, community_id: communityId, sender_id: userId, recipient_id: other.id,
      kind: 'text', body,
    });
    setSending(false);
    if (error) toast({ title: 'Could not send', description: error.message, variant: 'destructive' });
    else setText('');
  };

  const upload = async (file: File, kind: 'image' | 'file') => {
    if (!userId) return;
    if (file.size > 25 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 25 MB', variant: 'destructive' }); return; }
    setUploading(true); setShowAttach(false);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `dm/${communityId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('community-media').upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); return; }
    const { error } = await supabase.from('community_dm_messages' as any).insert({
      thread_id: thread.id, community_id: communityId, sender_id: userId, recipient_id: other.id, kind,
      attachment_url: path, attachment_name: file.name, attachment_mime: file.type, attachment_size: file.size,
      body: null,
    });
    setUploading(false);
    if (error) toast({ title: 'Could not send', description: error.message, variant: 'destructive' });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('community_dm_messages' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
  };

  const grouped = useMemo(() => {
    const out: Array<{ type: 'day'; label: string } | { type: 'msg'; m: DM }> = [];
    let lastDay = '';
    messages.forEach(m => {
      const d = new Date(m.created_at);
      const day = format(d, 'yyyy-MM-dd');
      if (day !== lastDay) { out.push({ type: 'day', label: dayLabel(d) }); lastDay = day; }
      out.push({ type: 'msg', m });
    });
    return out;
  }, [messages]);

  const accent = colorFor(other.id);
  const name = other.name || other.username || 'Member';

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-card border border-border" aria-label="Back to inbox">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: accent }}>
          {other.avatar_url
            ? <img src={other.avatar_url} alt={name} className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-white">{name.slice(0,1).toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{name}</div>
          <div className="text-[11px] text-muted-foreground">Direct message</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Say hi to {name} 👋</div>
        ) : grouped.map((it, idx) => {
          if (it.type === 'day') return (
            <div key={`d-${idx}`} className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">{it.label}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          );
          const m = it.m;
          const mine = m.sender_id === userId;
          const time = format(new Date(m.created_at), 'h:mm a');
          return (
            <div key={m.id} className={`flex gap-2 group ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {m.kind === 'text' && (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>{m.body}</div>
                )}
                {m.kind === 'image' && m.attachment_url && (
                  <SignedLink bucket="community-media" src={m.attachment_url}
                    className="block rounded-2xl overflow-hidden border border-border max-w-xs">
                    <SignedImage bucket="community-media" src={m.attachment_url}
                      alt={m.attachment_name || 'image'} className="w-full h-auto object-cover max-h-72" />
                  </SignedLink>
                )}
                {m.kind === 'file' && m.attachment_url && (
                  <SignedLink bucket="community-media" src={m.attachment_url} download={m.attachment_name || undefined}
                    className={`inline-flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border hover:bg-muted transition max-w-xs ${mine ? 'bg-primary/10' : 'bg-card'}`}>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{m.attachment_name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatSize(m.attachment_size)}</div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </SignedLink>
                )}
                <div className="flex items-center gap-1.5 mt-0.5 px-1">
                  <span className="text-[10px] text-muted-foreground">{time}</span>
                  {mine && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-2 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="relative">
            <button onClick={() => setShowAttach(v => !v)} disabled={uploading}
              className="w-11 h-11 rounded-full bg-muted hover:bg-muted/70 text-foreground flex items-center justify-center disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className={`w-5 h-5 transition-transform ${showAttach ? 'rotate-45' : ''}`} />}
            </button>
            {showAttach && (
              <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-2xl shadow-lg p-1.5 w-44 z-10">
                <button onClick={() => imageRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div>
                  Photo
                </button>
                <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Paperclip className="w-4 h-4" /></div>
                  File
                </button>
              </div>
            )}
          </div>
          <input ref={imageRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'image'); e.currentTarget.value=''; }} />
          <input ref={fileRef} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'file'); e.currentTarget.value=''; }} />
          <div className="flex-1 flex items-end bg-card border border-border rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary">
            <textarea value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${name}…`} maxLength={2000} rows={1}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none resize-none max-h-32 leading-6" />
          </div>
          <button onClick={send} disabled={sending || !text.trim()}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition shadow-md">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
};

const NewDMDialog = ({ communityId, myId, onClose, onPick }: {
  communityId: string; myId: string; onClose: () => void; onPick: (uid: string) => void;
}) => {
  const [members, setMembers] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ms } = await supabase.from('memberships' as any)
        .select('user_id').eq('community_id', communityId).eq('status', 'active').limit(500);
      const ids = [...new Set(((ms as any[]) || []).map(r => r.user_id).filter(id => id !== myId))];
      // Add the creator too (creators bypass memberships)
      const { data: c } = await supabase.from('communities' as any).select('creator_id').eq('id', communityId).maybeSingle();
      if ((c as any)?.creator_id && (c as any).creator_id !== myId) ids.push((c as any).creator_id);
      const authors = await fetchAuthors(ids);
      setMembers(Object.values(authors));
      setLoading(false);
    })();
  }, [communityId, myId]);

  const filtered = members.filter(m => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (m.name || '').toLowerCase().includes(s) || (m.username || '').toLowerCase().includes(s);
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-foreground flex-1">Message a member</h3>
          <button onClick={onClose} className="text-muted-foreground text-xs">Close</button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
        </div>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No members found.</div>
          ) : filtered.map(m => {
            const accent = colorFor(m.id);
            const name = m.name || m.username || 'Member';
            return (
              <button key={m.id} onClick={() => onPick(m.id)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 text-left">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: accent }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt={name} className="w-full h-full object-cover" /> :
                    <span className="text-xs font-bold text-white">{name.slice(0,1).toUpperCase()}</span>}
                </div>
                <div className="text-sm font-medium text-foreground truncate">{name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
