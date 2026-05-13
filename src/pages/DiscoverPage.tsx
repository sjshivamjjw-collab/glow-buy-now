import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Sparkles, Users, Loader2 } from 'lucide-react';

interface CommunityCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  member_count: number;
  creator_id: string;
}

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<CommunityCard[]>([]);
  const [creators, setCreators] = useState<Record<string, { name: string | null; username: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('communities' as any)
        .select('id, slug, name, description, cover_url, member_count, creator_id')
        .eq('is_published', true)
        .eq('approval_status', 'approved')
        .order('member_count', { ascending: false })
        .limit(50);
      const list = (data as any[] | null) ?? [];
      setCommunities(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map(c => c.creator_id)));
        const { data: profs } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        setCreators(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = communities.filter(c => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Discover</h1>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search communities…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">No communities yet</p>
          <p className="text-muted-foreground text-sm">Be the first to launch one.</p>
          <button onClick={() => navigate('/profile')}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Become a creator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(c => {
            const creator = creators[c.creator_id];
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/c/${c.slug}/room`)}
                className="w-full text-left rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors"
              >
                {c.cover_url ? (
                  <div className="aspect-square bg-secondary overflow-hidden">
                    <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
                    <span className="text-3xl font-extrabold text-primary/40">{c.name[0]}</span>
                  </div>
                )}
                <div className="p-2.5">
                  <h3 className="font-bold text-foreground text-sm mb-0.5 line-clamp-1">{c.name}</h3>
                  {c.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      {creator?.avatar_url ? (
                        <img src={creator.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-secondary shrink-0" />
                      )}
                      <span className="truncate">{creator?.name || creator?.username || 'Creator'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Users className="w-3 h-3" />
                      <span>{c.member_count}</span>
                    </div>
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

export default DiscoverPage;
