import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Sparkles, Users, Loader2, Check } from 'lucide-react';

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
  const { userId } = useAuth();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<CommunityCard[]>([]);
  const [creators, setCreators] = useState<Record<string, { name: string | null; username: string | null; avatar_url: string | null }>>({});
  const [freeTiers, setFreeTiers] = useState<Record<string, string>>({}); // community_id -> free tier id
  const [memberOf, setMemberOf] = useState<Record<string, boolean>>({}); // community_id -> active member
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

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
        const ids = list.map(c => c.id);
        const creatorIds = Array.from(new Set(list.map(c => c.creator_id)));
        const [{ data: profs }, { data: tiers }, memRes] = await Promise.all([
          supabase.from('profiles').select('id, name, username, avatar_url').in('id', creatorIds),
          supabase.from('community_tiers' as any).select('id, community_id, kind, sort_order').in('community_id', ids).eq('is_active', true).eq('kind', 'free'),
          userId
            ? supabase.from('memberships' as any).select('community_id, status').eq('user_id', userId).eq('status', 'active').in('community_id', ids)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        setCreators(map);
        const ftMap: Record<string, string> = {};
        ((tiers as any[]) || []).forEach((t: any) => {
          // pick lowest sort_order free tier
          if (!ftMap[t.community_id]) ftMap[t.community_id] = t.id;
        });
        setFreeTiers(ftMap);
        const mMap: Record<string, boolean> = {};
        (((memRes as any).data as any[]) || []).forEach((m: any) => { mMap[m.community_id] = true; });
        setMemberOf(mMap);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleJoin = async (c: CommunityCard) => {
    if (!userId) { navigate('/auth'); return; }
    const freeTierId = freeTiers[c.id];
    if (!freeTierId) {
      // No free tier — go to detail page to pick a paid plan
      navigate(`/c/${c.slug}`);
      return;
    }
    setJoining(c.id);
    try {
      const { data: existing } = await supabase.from('memberships' as any)
        .select('id').eq('user_id', userId).eq('community_id', c.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('memberships' as any).update({
          tier_id: freeTierId,
          status: 'active',
          source: 'free',
          started_at: new Date().toISOString(),
          razorpay_payment_id: null,
          razorpay_subscription_id: null,
          razorpay_order_id: null,
          current_period_end: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('memberships' as any).insert({
          user_id: userId,
          community_id: c.id,
          tier_id: freeTierId,
          status: 'active',
          source: 'free',
          started_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      toast({ title: `Welcome to ${c.name}!` });
      setMemberOf(prev => ({ ...prev, [c.id]: true }));
      navigate(`/c/${c.slug}/room`);
    } catch (e: any) {
      toast({ title: 'Could not join', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setJoining(null);
    }
  };

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
            const isMember = !!memberOf[c.id];
            const isOwn = userId === c.creator_id;
            return (
              <div
                key={c.id}
                className="w-full text-left rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors flex flex-col"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/c/${c.slug}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/c/${c.slug}`); }}
                  className="cursor-pointer"
                >
                  {c.cover_url ? (
                    <div className="aspect-[16/10] bg-secondary overflow-hidden">
                      <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover object-top" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
                      <span className="text-3xl font-extrabold text-primary/40">{c.name[0]}</span>
                    </div>
                  )}
                  <div className="p-2.5">
                    <h3 className="font-bold text-foreground text-sm mb-1 line-clamp-2 leading-snug">{c.name}</h3>
                    {c.description && <p className="text-[11px] text-muted-foreground line-clamp-3 mb-2 leading-snug">{c.description}</p>}
                    <div className="flex items-center justify-between text-[11px] mb-2">
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
                </div>
                <div className="px-2.5 pb-2.5 mt-auto">
                  {isOwn || isMember ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/c/${c.slug}/room`); }}
                      className="w-full py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Joined
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJoin(c); }}
                      disabled={joining === c.id}
                      className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                    >
                      {joining === c.id ? 'Joining…' : freeTiers[c.id] ? 'Join now' : 'View plans'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
