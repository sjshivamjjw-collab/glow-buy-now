import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2, Trash2, Paperclip, Image as ImageIcon, BarChart3, X, Plus, Check, FileText, Download, Hash, Lock, Settings, Sparkles, Shield, ShieldCheck, Search, UserPlus, Pencil, MessageCircle } from 'lucide-react';
import { SignedImage, SignedLink } from '@/components/SignedMedia';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import type { TierInfo } from '@/hooks/useCommunityMembership';
import { TierLockOverlay } from './TierLockOverlay';
import { DMPanel } from './DMPanel';

type MsgKind = 'text' | 'image' | 'file' | 'poll';
interface Msg {
  id: string;
  user_id: string;
  channel_id: string;
  body: string | null;
  created_at: string;
  kind: MsgKind;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  poll: { question: string; options: string[] } | null;
  author?: { name: string | null; username: string | null; avatar_url: string | null } | null;
}
interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  required_tier_level: number;
  sort_order: number;
  post_permission: 'all_members' | 'admins' | 'creator_only';
}
interface PollVote { message_id: string; user_id: string; option_index: number }

const colorFor = (id: string) => {
  const palette = ['hsl(330 80% 60%)','hsl(200 80% 55%)','hsl(150 60% 45%)','hsl(35 90% 55%)','hsl(265 70% 60%)','hsl(0 75% 60%)','hsl(180 60% 45%)'];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
const formatSize = (b?: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
const dayLabel = (d: Date) => isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);

interface Props {
  communityId: string;
  isCreator: boolean;
  isAdmin: boolean;
  tierLevel: number;
  tiers: TierInfo[];
  slug: string;
  dmsEnabled?: boolean;
}

export const ChatPanel = ({ communityId, isCreator, isAdmin, tierLevel, tiers, slug, dmsEnabled = true }: Props) => {
  const { userId, userName, userAvatar, isAdmin: isPlatformAdmin } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmParam = dmsEnabled ? searchParams.get('dm') : null;
  const dmInitialUser = dmParam && dmParam !== 'inbox' ? dmParam : null;
  const [dmMode, setDmMode] = useState<boolean>(!!dmParam);
  useEffect(() => { if (dmParam) setDmMode(true); else setDmMode(false); }, [dmParam]);

  const setDmUserParam = (uid: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (uid) next.set('dm', uid); else next.delete('dm');
    setSearchParams(next, { replace: true });
  };

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showChannelMgr, setShowChannelMgr] = useState(false);
  const [showAdminMgr, setShowAdminMgr] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId) || null;
  const canAccessActive = !activeChannel || isCreator || isPlatformAdmin || tierLevel >= activeChannel.required_tier_level;

  // Posting permission for the active channel
  const canPostInActive = !activeChannel ? false : (
    isCreator || isPlatformAdmin
      ? true
      : activeChannel.post_permission === 'creator_only'
        ? false
        : activeChannel.post_permission === 'admins'
          ? isAdmin
          : true
  );
  const postRestrictionLabel = !activeChannel ? '' : (
    activeChannel.post_permission === 'creator_only'
      ? 'Only the creator can post in this channel.'
      : activeChannel.post_permission === 'admins'
        ? 'Only admins can post in this channel.'
        : ''
  );

  // Load channels
  const loadChannels = async () => {
    const { data } = await supabase.from('community_channels' as any)
      .select('*').eq('community_id', communityId).order('sort_order').order('created_at');
    const list = ((data as any[]) || []) as Channel[];
    setChannels(list);
    if (list.length && !list.find(c => c.id === activeChannelId)) {
      setActiveChannelId(list[0].id);
    }
  };

  useEffect(() => { loadChannels(); }, [communityId]);

  const fetchAuthors = async (userIds: string[]) => {
    if (!userIds.length) return {};
    const { data } = await supabase.rpc('get_chat_author_names' as any, { _user_ids: userIds });
    const map: Record<string, any> = {};
    ((data as any[]) || []).forEach((p: any) => { map[p.id] = p; });
    return map;
  };

  // Load creator + admin ids so we can badge them in chat
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from('communities' as any).select('creator_id').eq('id', communityId).maybeSingle(),
        supabase.from('community_admins' as any).select('user_id').eq('community_id', communityId),
      ]);
      setCreatorId((c as any)?.creator_id || null);
      setAdminIds(new Set(((a as any[]) || []).map(r => r.user_id)));
    })();
  }, [communityId]);


  // Load messages for active channel
  useEffect(() => {
    if (!activeChannelId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!canAccessActive) { setMessages([]); setLoading(false); return; }
      const { data } = await supabase
        .from('community_chat_messages' as any)
        .select('*')
        .eq('community_id', communityId)
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (cancelled) return;
      const rows = (data as any[]) || [];
      const authors = await fetchAuthors([...new Set(rows.map(r => r.user_id))]);
      setMessages(rows.map(r => ({ ...r, author: authors[r.user_id] || null })));

      const pollIds = rows.filter(r => r.kind === 'poll').map(r => r.id);
      if (pollIds.length) {
        const { data: v } = await supabase.from('community_chat_poll_votes' as any).select('*').in('message_id', pollIds);
        if (!cancelled) setVotes((v as any) || []);
      } else {
        setVotes([]);
      }
      setLoading(false);
    })();

    if (!canAccessActive) return;

    const ch = supabase
      .channel(`community-chat-${communityId}-${activeChannelId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_chat_messages', filter: `channel_id=eq.${activeChannelId}` },
        async (payload: any) => {
          const row = payload.new;
          const authors = await fetchAuthors([row.user_id]);
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, { ...row, author: authors[row.user_id] || null }]);
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_chat_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload: any) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_chat_poll_votes' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setVotes(prev => prev.filter(v => !(v.message_id === payload.old.message_id && v.user_id === payload.old.user_id)));
          } else {
            const row = payload.new;
            setVotes(prev => {
              const others = prev.filter(v => !(v.message_id === row.message_id && v.user_id === row.user_id));
              return [...others, row];
            });
          }
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeChannelId, canAccessActive, communityId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !userId || !activeChannelId) return;
    if (!canPostInActive) { toast({ title: 'Posting disabled', description: postRestrictionLabel, variant: 'destructive' }); return; }
    setSending(true);
    const { error } = await supabase.from('community_chat_messages' as any).insert({
      community_id: communityId, channel_id: activeChannelId, user_id: userId, body, kind: 'text',
    });
    setSending(false);
    if (error) { toast({ title: 'Could not send', description: error.message, variant: 'destructive' }); return; }
    setText('');
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('community_chat_messages' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
  };

  const uploadAndSend = async (file: File, kind: 'image' | 'file') => {
    if (!userId || !activeChannelId) return;
    if (file.size > 25 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 25 MB', variant: 'destructive' }); return; }
    setUploading(true); setShowAttach(false);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `chat/${communityId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('community-media').upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); return; }
    // Store the storage path; readers resolve a short-lived signed URL on demand.
    const { error } = await supabase.from('community_chat_messages' as any).insert({
      community_id: communityId, channel_id: activeChannelId, user_id: userId, kind,
      attachment_url: path, attachment_name: file.name, attachment_mime: file.type, attachment_size: file.size,
    });
    setUploading(false);
    if (error) toast({ title: 'Could not send', description: error.message, variant: 'destructive' });
  };

  const sendPoll = async (question: string, options: string[]) => {
    if (!userId || !activeChannelId) return;
    const { error } = await supabase.from('community_chat_messages' as any).insert({
      community_id: communityId, channel_id: activeChannelId, user_id: userId, kind: 'poll',
      poll: { question, options },
    });
    if (error) toast({ title: 'Could not create poll', description: error.message, variant: 'destructive' });
    else setShowPoll(false);
  };

  const vote = async (messageId: string, optionIndex: number) => {
    if (!userId) return;
    const existing = votes.find(v => v.message_id === messageId && v.user_id === userId);
    if (existing && existing.option_index === optionIndex) {
      await supabase.from('community_chat_poll_votes' as any).delete().eq('message_id', messageId).eq('user_id', userId);
    } else if (existing) {
      await supabase.from('community_chat_poll_votes' as any).update({ option_index: optionIndex }).eq('message_id', messageId).eq('user_id', userId);
    } else {
      await supabase.from('community_chat_poll_votes' as any).insert({ message_id: messageId, user_id: userId, option_index: optionIndex });
    }
  };

  const grouped = useMemo(() => {
    const out: Array<{ type: 'day'; label: string } | { type: 'msg'; msg: Msg; showHeader: boolean }> = [];
    let lastDay = ''; let lastUser = ''; let lastTime = 0;
    messages.forEach(m => {
      const d = new Date(m.created_at);
      const day = format(d, 'yyyy-MM-dd');
      if (day !== lastDay) {
        out.push({ type: 'day', label: dayLabel(d) });
        lastDay = day; lastUser = ''; lastTime = 0;
      }
      const t = d.getTime();
      const showHeader = m.user_id !== lastUser || t - lastTime > 5 * 60 * 1000;
      out.push({ type: 'msg', msg: m, showHeader });
      lastUser = m.user_id; lastTime = t;
    });
    return out;
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
      {dmMode ? (
        <DMPanel
          communityId={communityId}
          initialUserId={dmInitialUser}
          onClose={() => { setDmMode(false); setDmUserParam(null); }}
          onOpenChange={(uid) => setDmUserParam(uid)}
        />
      ) : (
      <>
      {/* Channel pills */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin">
        {channels.map(c => {
          const locked = !isCreator && tierLevel < c.required_tier_level;
          const active = c.id === activeChannelId;
          return (
            <button key={c.id} onClick={() => setActiveChannelId(c.id)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                active ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
              {locked ? <Lock className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
              {c.name}
              {c.required_tier_level > 0 && <Sparkles className="w-3 h-3 text-amber-500" />}
            </button>
          );
        })}
        {isCreator && (
          <>
            <button onClick={() => setShowChannelMgr(true)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-card border border-dashed border-border text-muted-foreground">
              <Settings className="w-3 h-3" /> Channels
            </button>
            <button onClick={() => setShowAdminMgr(true)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-card border border-dashed border-border text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> Mods
            </button>
          </>
        )}
      </div>

      {!canAccessActive && activeChannel ? (
        <div className="flex-1 flex items-center justify-center">
          <TierLockOverlay
            requiredLevel={activeChannel.required_tier_level}
            tiers={tiers} slug={slug}
            label={`#${activeChannel.name} is for higher-tier members.`}
          />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-1">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">Be the first to say hi 👋</div>
            ) : grouped.map((item, idx) => {
              if (item.type === 'day') {
                return (
                  <div key={`day-${idx}`} className="flex items-center gap-2 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">{item.label}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                );
              }
              const m = item.msg;
              const mine = m.user_id === userId;
              const name = mine ? (userName || 'You') : (m.author?.name || m.author?.username || 'Member');
              const avatar = mine ? userAvatar : m.author?.avatar_url;
              const canDelete = mine || isCreator;
              const time = format(new Date(m.created_at), 'h:mm a');
              const accent = colorFor(m.user_id);

              return (
                <div key={m.id} className={`flex gap-2.5 group px-1 ${item.showHeader ? 'pt-2' : 'pt-0.5'}`}>
                  <div className="w-9 shrink-0">
                    {item.showHeader ? (
                      <button
                        onClick={() => { if (!mine && dmsEnabled) { setDmUserParam(m.user_id); setDmMode(true); } }}
                        disabled={mine || !dmsEnabled}
                        className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-background shadow-sm ${mine || !dmsEnabled ? '' : 'cursor-pointer hover:ring-primary'}`}
                        style={{ background: accent }} title={mine || !dmsEnabled ? '' : `Message ${name}`}>
                        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> :
                          <span className="text-xs font-bold text-white">{name.slice(0,1).toUpperCase()}</span>}
                      </button>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground block text-right pr-1 pt-1">{time}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.showHeader && (
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        {mine || !dmsEnabled ? (
                          <span className="text-sm font-semibold" style={{ color: mine ? undefined : accent }}>{name}</span>
                        ) : (
                          <button onClick={() => { setDmUserParam(m.user_id); setDmMode(true); }}
                            className="text-sm font-semibold hover:underline focus:underline focus:outline-none" style={{ color: accent }}
                            title={`Message ${name}`}>{name}</button>
                        )}
                        {mine && <span className="text-[10px] uppercase tracking-wide text-primary font-bold">You</span>}
                        {(m.user_id === creatorId || adminIds.has(m.user_id)) && (
                          <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 inline-flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{time}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 max-w-[85%]">
                        {m.kind === 'text' && (
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{m.body}</div>
                        )}
                        {m.kind === 'image' && m.attachment_url && (
                          <SignedLink bucket="community-media" src={m.attachment_url}
                            className="block rounded-xl overflow-hidden border border-border max-w-xs hover:opacity-90 transition">
                            <SignedImage bucket="community-media" src={m.attachment_url}
                              alt={m.attachment_name || 'image'} className="w-full h-auto object-cover max-h-80" />
                          </SignedLink>
                        )}
                        {m.kind === 'file' && m.attachment_url && (
                          <SignedLink bucket="community-media" src={m.attachment_url} download={m.attachment_name || undefined}
                            className="inline-flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border hover:bg-muted transition max-w-sm">
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
                        {m.kind === 'poll' && m.poll && (
                          <PollCard message={m} votes={votes.filter(v => v.message_id === m.id)} userId={userId} onVote={(i) => vote(m.id, i)} />
                        )}
                      </div>
                      {canDelete && (
                        <button onClick={() => remove(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!canPostInActive ? (
            <div className="pt-3 mt-2 border-t border-border">
              <div className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{postRestrictionLabel || 'You cannot post in this channel.'}</span>
              </div>
            </div>
          ) : (
          <div className="pt-3 mt-2 border-t border-border">
            <div className="flex items-end gap-2">
              <div className="relative">
                <button onClick={() => setShowAttach(v => !v)} disabled={uploading}
                  className="w-11 h-11 rounded-full bg-muted hover:bg-muted/70 text-foreground flex items-center justify-center disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className={`w-5 h-5 transition-transform ${showAttach ? 'rotate-45' : ''}`} />}
                </button>
                {showAttach && (
                  <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-2xl shadow-lg p-1.5 w-48 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <button onClick={() => imageRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center"><ImageIcon className="w-4 h-4" /></div>
                      Photo
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Paperclip className="w-4 h-4" /></div>
                      File
                    </button>
                    <button onClick={() => { setShowAttach(false); setShowPoll(true); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-sm text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                      Poll
                    </button>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, 'image'); e.currentTarget.value=''; }} />
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, 'file'); e.currentTarget.value=''; }} />

              <div className="flex-1 flex items-end bg-card border border-border rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary">
                <textarea value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={activeChannel ? `Message #${activeChannel.name}…` : 'Message…'}
                  maxLength={2000} rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none resize-none max-h-32 leading-6" />
              </div>
              <button onClick={send} disabled={sending || !text.trim()}
                className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition shadow-md">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          )}
        </>
      )}

      {showPoll && <PollDialog onClose={() => setShowPoll(false)} onSubmit={sendPoll} />}
      {showChannelMgr && (
        <ChannelManager
          communityId={communityId} channels={channels} tiers={tiers}
          onClose={() => setShowChannelMgr(false)}
          onChanged={loadChannels}
        />
      )}
      {showAdminMgr && (
        <AdminManager
          communityId={communityId}
          onClose={() => setShowAdminMgr(false)}
        />
      )}
      </>
      )}
    </div>
  );
};

const ChannelManager = ({ communityId, channels, tiers, onClose, onChanged }: {
  communityId: string; channels: Channel[]; tiers: TierInfo[];
  onClose: () => void; onChanged: () => void;
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [requiredLevel, setRequiredLevel] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('community_channels' as any).insert({
      community_id: communityId,
      name: name.trim(),
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 5)}`,
      required_tier_level: requiredLevel,
      sort_order: channels.length,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not add channel', description: error.message, variant: 'destructive' }); return; }
    setName(''); setRequiredLevel(0);
    onChanged();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this channel? All its messages will be removed.')) return;
    await supabase.from('community_chat_messages' as any).delete().eq('channel_id', id);
    const { error } = await supabase.from('community_channels' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    else onChanged();
  };

  const setTier = async (id: string, lvl: number) => {
    const { error } = await supabase.from('community_channels' as any).update({ required_tier_level: lvl }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else onChanged();
  };

  const setPerm = async (id: string, perm: Channel['post_permission']) => {
    const { error } = await supabase.from('community_channels' as any).update({ post_permission: perm }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else onChanged();
  };

  const rename = async (id: string, currentName: string) => {
    const next = window.prompt('Rename channel', currentName)?.trim();
    if (!next || next === currentName) return;
    const { error } = await supabase.from('community_channels' as any).update({ name: next }).eq('id', id);
    if (error) toast({ title: 'Rename failed', description: error.message, variant: 'destructive' });
    else onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Channels</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2">
          {channels.map(c => (
            <div key={c.id} className="p-3 rounded-xl bg-background border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-semibold text-foreground truncate">{c.name}</span>
                <button onClick={() => rename(c.id, c.name)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Rename">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {channels.length > 1 && (
                  <button onClick={() => remove(c.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold col-span-2 -mb-1">Visible to</label>
                <select value={c.required_tier_level} onChange={e => setTier(c.id, Number(e.target.value))}
                  className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs col-span-2">
                  <option value={0}>All members</option>
                  {tiers.filter(t => t.sort_order > 0).map(t => (
                    <option key={t.id} value={t.sort_order}>{t.name} and above</option>
                  ))}
                </select>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold col-span-2 -mb-1 mt-1">Who can post</label>
                <select value={c.post_permission} onChange={e => setPerm(c.id, e.target.value as Channel['post_permission'])}
                  className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs col-span-2">
                  <option value="all_members">Everyone in this channel</option>
                  <option value="admins">Admins only</option>
                  <option value="creator_only">Creator only (announcements)</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Add channel</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium VIP"
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
          <select value={requiredLevel} onChange={e => setRequiredLevel(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm">
            <option value={0}>Open to all members</option>
            {tiers.filter(t => t.sort_order > 0).map(t => (
              <option key={t.id} value={t.sort_order}>{t.name} and above</option>
            ))}
          </select>
          <button onClick={add} disabled={saving || !name.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {saving ? 'Adding…' : 'Add channel'}
          </button>
          {tiers.filter(t => t.sort_order > 0).length === 0 && (
            <p className="text-[11px] text-muted-foreground">Add paid tiers to your community to gate channels.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PollCard = ({ message, votes, userId, onVote }: {
  message: Msg; votes: PollVote[]; userId: string | null; onVote: (i: number) => void;
}) => {
  const total = votes.length;
  const myVote = votes.find(v => v.user_id === userId);
  const counts = (message.poll!.options).map((_, i) => votes.filter(v => v.option_index === i).length);
  return (
    <div className="rounded-2xl border border-border bg-card p-3 max-w-sm w-full">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-emerald-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Poll</span>
      </div>
      <div className="text-sm font-semibold text-foreground mb-3">{message.poll!.question}</div>
      <div className="space-y-1.5">
        {message.poll!.options.map((opt, i) => {
          const c = counts[i];
          const pct = total ? Math.round((c / total) * 100) : 0;
          const selected = myVote?.option_index === i;
          return (
            <button key={i} onClick={() => onVote(i)}
              className={`relative w-full text-left rounded-lg border overflow-hidden transition ${selected ? 'border-primary' : 'border-border hover:border-foreground/30'}`}>
              <div className="absolute inset-y-0 left-0 bg-primary/15 transition-all" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <span className="text-sm text-foreground truncate">{opt}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground shrink-0">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">{total} {total === 1 ? 'vote' : 'votes'} · tap your choice to change or remove</div>
    </div>
  );
};

const PollDialog = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (q: string, opts: string[]) => void }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const valid = question.trim().length > 0 && options.filter(o => o.trim()).length >= 2;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-t-3xl md:rounded-3xl border border-border w-full max-w-md p-5 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Create poll</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question…" maxLength={200}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3" />
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e => setOptions(opts => opts.map((x, idx) => idx === i ? e.target.value : x))}
                placeholder={`Option ${i + 1}`} maxLength={80}
                className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              {options.length > 2 && (
                <button onClick={() => setOptions(opts => opts.filter((_, idx) => idx !== i))} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button onClick={() => setOptions(opts => [...opts, ''])} className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-medium">
            <Plus className="w-4 h-4" /> Add option
          </button>
        )}
        <button onClick={() => onSubmit(question.trim(), options.map(o => o.trim()).filter(Boolean))} disabled={!valid}
          className="mt-5 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          Post poll
        </button>
      </div>
    </div>
  );
};

interface MemberRow {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

const AdminManager = ({ communityId, onClose }: { communityId: string; onClose: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: mems }, { data: mods }] = await Promise.all([
      supabase.from('memberships' as any).select('user_id').eq('community_id', communityId).eq('status', 'active'),
      supabase.from('community_admins' as any).select('user_id').eq('community_id', communityId),
    ]);
    const memberIds = Array.from(new Set(((mems as any[]) || []).map(m => m.user_id)));
    const modIds = new Set(((mods as any[]) || []).map(m => m.user_id));
    if (!memberIds.length) { setMembers([]); setLoading(false); return; }
    const { data: profs } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', memberIds);
    const rows: MemberRow[] = (profs || []).map((p: any) => ({
      user_id: p.id, name: p.name, username: p.username, avatar_url: p.avatar_url, is_admin: modIds.has(p.id),
    }));
    rows.sort((a, b) => (Number(b.is_admin) - Number(a.is_admin)) || (a.name || a.username || '').localeCompare(b.name || b.username || ''));
    setMembers(rows);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [communityId]);

  const toggleAdmin = async (m: MemberRow) => {
    setBusy(m.user_id);
    if (m.is_admin) {
      const { error } = await supabase.from('community_admins' as any).delete()
        .eq('community_id', communityId).eq('user_id', m.user_id);
      if (error) toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase.from('community_admins' as any).insert({
        community_id: communityId, user_id: m.user_id,
      });
      if (error) toast({ title: 'Could not promote', description: error.message, variant: 'destructive' });
    }
    setBusy(null);
    await load();
  };

  const filtered = members.filter(m => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Admins
            </h3>
            <p className="text-xs text-muted-foreground">Promote members to post in admin-only channels.</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-sm" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No members yet.</p>
          ) : filtered.map(m => {
            const display = m.name || m.username || 'Member';
            return (
              <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl bg-background border border-border">
                {m.avatar_url ? (
                  <img src={m.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {display.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                    {display}
                    {m.is_admin && <Shield className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  {m.username && <div className="text-[11px] text-muted-foreground truncate">@{m.username}</div>}
                </div>
                <button onClick={() => toggleAdmin(m)} disabled={busy === m.user_id}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                    m.is_admin
                      ? 'bg-muted text-foreground hover:bg-muted/70'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}>
                  {busy === m.user_id ? '…' : m.is_admin ? 'Remove' : (<span className="inline-flex items-center gap-1"><UserPlus className="w-3 h-3" />Make admin</span>)}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
