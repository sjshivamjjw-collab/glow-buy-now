import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Sparkles } from 'lucide-react';

const MyCommunitiesPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: mems } = await supabase
        .from('memberships' as any)
        .select('id, status, tier_id, current_period_end, communities:community_id(id, slug, name, cover_url, member_count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setRows((mems as any[]) || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-5">My communities</h1>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">You haven't joined any community yet</p>
          <p className="text-muted-foreground text-sm mb-4">Find one you love.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Discover communities
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const c = r.communities;
            if (!c) return null;
            return (
              <button key={r.id} onClick={() => navigate(`/c/${c.slug}/room`)}
                className="w-full text-left p-4 rounded-2xl bg-card border border-border flex items-center gap-3">
                {c.cover_url ? (
                  <img src={c.cover_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-muted-foreground">{c.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{c.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Users className="w-3 h-3" /><span>{c.member_count}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-secondary capitalize">{r.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCommunitiesPage;
