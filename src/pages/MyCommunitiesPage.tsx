import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Sparkles, Crown, CheckCircle2, ChevronRight } from 'lucide-react';

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
        .select(`
          id, status, tier_id, current_period_end,
          tier:tier_id ( id, name, kind, price_inr, billing_period_months ),
          communities:community_id (
            id, slug, name, description, cover_url, member_count, key_outcomes
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setRows((mems as any[]) || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const formatPlan = (t: any) => {
    if (!t) return null;
    if (t.kind === 'free') return 'Free plan';
    const price = Number(t.price_inr || 0);
    if (t.kind === 'paid_monthly') {
      const mo = t.billing_period_months || 1;
      return `${t.name} • ₹${price.toLocaleString('en-IN')}/${mo === 1 ? 'mo' : `${mo}mo`}`;
    }
    return `${t.name} • ₹${price.toLocaleString('en-IN')}`;
  };

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
            const t = r.tier;
            if (!c) return null;
            const outcomes: string[] = Array.isArray(c.key_outcomes) ? c.key_outcomes.slice(0, 3) : [];
            const planLabel = formatPlan(t);
            const isPaid = t?.kind && t.kind !== 'free';
            const expiresAt = r.current_period_end ? new Date(r.current_period_end) : null;
            return (
              <button key={r.id} onClick={() => navigate(`/c/${c.slug}/room`)}
                className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition">
                <div className="flex items-start gap-3 mb-3">
                  {c.cover_url ? (
                    <img src={c.cover_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center font-bold text-muted-foreground flex-shrink-0">{c.name[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground truncate">{c.name}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{c.member_count}</span>
                      <span className={`px-1.5 py-0.5 rounded capitalize ${
                        r.status === 'active' ? 'bg-success/10 text-success' :
                        r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-secondary'
                      }`}>{r.status}</span>
                    </div>
                  </div>
                </div>

                {planLabel && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${
                    isPaid ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground'
                  }`}>
                    <Crown className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold flex-1 truncate">{planLabel}</span>
                    {isPaid && expiresAt && (
                      <span className="text-[10px] opacity-80">
                        renews {expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                )}

                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                )}

                {outcomes.length > 0 && (
                  <div className="space-y-1">
                    {outcomes.map((o, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground line-clamp-1">{o}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCommunitiesPage;
