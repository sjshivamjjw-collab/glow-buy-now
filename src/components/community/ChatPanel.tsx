import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Msg {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { name: string | null; username: string | null; avatar_url: string | null } | null;
}

export const ChatPanel = ({ communityId, isCreator }: { communityId: string; isCreator: boolean }) => {
  const { userId, userName, userAvatar } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAuthors = async (userIds: string[]) => {
    if (!userIds.length) return {};
    const { data } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', userIds);
    const map: Record<string, any> = {};
    (data || []).forEach((p: any) => { map[p.id] = p; });
    return map;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('community_chat_messages' as any)
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (cancelled) return;
      const rows = (data as any[]) || [];
      const authors = await fetchAuthors([...new Set(rows.map(r => r.user_id))]);
      setMessages(rows.map(r => ({ ...r, author: authors[r.user_id] || null })));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`community-chat-${communityId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_chat_messages',
        filter: `community_id=eq.${communityId}`,
      }, async (payload: any) => {
        const row = payload.new;
        const authors = await fetchAuthors([row.user_id]);
        setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, { ...row, author: authors[row.user_id] || null }]);
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'community_chat_messages',
        filter: `community_id=eq.${communityId}`,
      }, (payload: any) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [communityId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !userId) return;
    setSending(true);
    const { error } = await supabase.from('community_chat_messages' as any).insert({
      community_id: communityId, user_id: userId, body,
    });
    setSending(false);
    if (error) { toast({ title: 'Could not send', description: error.message, variant: 'destructive' }); return; }
    setText('');
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('community_chat_messages' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">Be the first to say hi 👋</div>
        ) : messages.map(m => {
          const mine = m.user_id === userId;
          const name = mine ? (userName || 'You') : (m.author?.name || m.author?.username || 'Member');
          const avatar = mine ? userAvatar : m.author?.avatar_url;
          const canDelete = mine || isCreator;
          return (
            <div key={m.id} className={`flex gap-2 group ${mine ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> :
                  <span className="text-xs font-bold text-muted-foreground">{name.slice(0,1).toUpperCase()}</span>}
              </div>
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <span className="text-[11px] text-muted-foreground px-1 mb-0.5">{name}</span>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                  mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'
                }`}>{m.body}</div>
              </div>
              {canDelete && (
                <button onClick={() => remove(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1 rounded text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="pt-3 mt-2 border-t border-border flex gap-2">
        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          maxLength={2000}
          className="flex-1 px-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
