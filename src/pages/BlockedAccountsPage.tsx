import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Ban, ShieldOff } from 'lucide-react';

interface BlockedRow {
  blocked_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const BlockedAccountsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) { navigate('/auth'); return; }
    setLoading(true);
    const { data } = await supabase.from('user_blocks' as any).select('blocked_id').eq('blocker_id', userId);
    const ids = ((data as any[]) || []).map(r => r.blocked_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: ids });
    const map: Record<string, any> = {};
    ((profs as any[]) || []).forEach(p => { map[p.id] = p; });
    setRows(ids.map(id => ({ blocked_id: id, name: map[id]?.name ?? null, username: map[id]?.username ?? null, avatar_url: map[id]?.avatar_url ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const unblock = async (id: string) => {
    if (!userId) return;
    await supabase.from('user_blocks' as any).delete().eq('blocker_id', userId).eq('blocked_id', id);
    toast({ title: 'Unblocked' });
    setRows(prev => prev.filter(r => r.blocked_id !== id));
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Blocked accounts</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Ban className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">No blocked accounts</p>
          <p className="text-sm text-muted-foreground">People you block will appear here.</p>
        </div>
      ) : (
        <ul className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
          {rows.map(r => {
            const display = r.name || r.username || 'User';
            return (
              <li key={r.blocked_id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => navigate(`/u/${r.blocked_id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={display} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">{display[0]?.toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{display}</p>
                    {r.username && r.name && <p className="text-xs text-muted-foreground truncate">@{r.username}</p>}
                  </div>
                </button>
                <button
                  onClick={() => unblock(r.blocked_id)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold flex items-center gap-1"
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Unblock
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default BlockedAccountsPage;
