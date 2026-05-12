import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Users, Eye, EyeOff } from 'lucide-react';

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from('communities' as any).select('*').eq('creator_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        setCommunities((data as any[]) || []);
        setLoading(false);
      });
  }, [userId]);

  const togglePublish = async (c: any) => {
    const { error } = await supabase.from('communities' as any).update({ is_published: !c.is_published }).eq('id', c.id);
    if (!error) setCommunities(prev => prev.map(x => x.id === c.id ? { ...x, is_published: !c.is_published } : x));
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Creator</h1>
        <button onClick={() => navigate('/communities/new')}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : communities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground font-semibold mb-1">No communities yet</p>
          <p className="text-muted-foreground text-sm mb-4">Launch your first community to start earning.</p>
          <button onClick={() => navigate('/communities/new')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Create community
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {communities.map(c => (
            <div key={c.id} className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-start gap-3 mb-3">
                {c.cover_url ? (
                  <img src={c.cover_url} className="w-14 h-14 rounded-xl object-cover" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                    {c.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{c.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Users className="w-3 h-3" />
                    <span>{c.member_count} members</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.is_published ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                  {c.is_published ? 'LIVE' : 'DRAFT'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/c/${c.slug}`)}
                  className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold">View</button>
                <button onClick={() => togglePublish(c)}
                  className="px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center gap-1">
                  {c.is_published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorDashboard;
