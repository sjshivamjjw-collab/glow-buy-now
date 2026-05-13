import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Loader2, Users, IndianRupee, TrendingUp, Layers,
  UserPlus, Repeat, Crown, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

type Community = any;
type Tier = any;
type Membership = any;

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtMonth = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', '#f59e0b', '#22c55e', '#ef4444'];

const CreatorInsightsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityFilter, setCommunityFilter] = useState<string>('all');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: comms } = await supabase
        .from('communities' as any).select('*')
        .eq('creator_id', userId).order('created_at', { ascending: false });
      const commList = (comms as any[]) || [];
      const commIds = commList.map(c => c.id);

      let tierList: any[] = [];
      let memList: any[] = [];
      if (commIds.length) {
        const [{ data: t }, { data: m }] = await Promise.all([
          supabase.from('community_tiers' as any).select('*').in('community_id', commIds),
          supabase.from('memberships' as any).select('*').in('community_id', commIds)
            .order('created_at', { ascending: false }),
        ]);
        tierList = (t as any[]) || [];
        memList = (m as any[]) || [];
      }
      if (cancelled) return;
      setCommunities(commList);
      setTiers(tierList);
      setMemberships(memList);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const tiersById = useMemo(() => {
    const m: Record<string, Tier> = {};
    tiers.forEach(t => { m[t.id] = t; });
    return m;
  }, [tiers]);

  const filteredMems = useMemo(
    () => communityFilter === 'all' ? memberships : memberships.filter(m => m.community_id === communityFilter),
    [memberships, communityFilter],
  );

  const metrics = useMemo(() => {
    const active = filteredMems.filter(m => m.status === 'active');
    const paying = active.filter(m =>
      !!m.razorpay_payment_id || !!m.razorpay_subscription_id || !!m.razorpay_order_id);
    const lifetime = paying.reduce((s, m) => s + Number(tiersById[m.tier_id]?.price_inr || 0), 0);
    const mrr = paying.reduce((s, m) => {
      const t = tiersById[m.tier_id];
      if (!t || t.kind !== 'paid_monthly') return s;
      const months = Number(t.billing_period_months || 1);
      return s + Number(t.price_inr || 0) / Math.max(months, 1);
    }, 0);

    const now = Date.now();
    const last30 = active.filter(m => now - new Date(m.created_at).getTime() <= 30 * 86400_000).length;
    const prev30 = active.filter(m => {
      const age = now - new Date(m.created_at).getTime();
      return age > 30 * 86400_000 && age <= 60 * 86400_000;
    }).length;
    const growthPct = prev30 === 0 ? (last30 > 0 ? 100 : 0) : Math.round(((last30 - prev30) / prev30) * 100);

    const churned = filteredMems.filter(m => m.status === 'cancelled' || m.status === 'expired').length;
    const total = active.length + churned;
    const churnPct = total === 0 ? 0 : Math.round((churned / total) * 100);

    const liveCommunities = communities.filter(c => c.is_published && c.approval_status === 'approved').length;
    const pending = communities.filter(c => c.approval_status === 'pending').length;

    const arpu = paying.length === 0 ? 0 : lifetime / paying.length;

    return {
      totalMembers: active.length,
      payingMembers: paying.length,
      freeMembers: active.length - paying.length,
      lifetime, mrr, arpu, last30, growthPct, churnPct,
      liveCommunities, pending, totalCommunities: communities.length,
    };
  }, [filteredMems, tiersById, communities]);

  // 6-month signup trend
  const trend = useMemo(() => {
    const buckets: { key: string; label: string; signups: number; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: fmtMonth(d), signups: 0, revenue: 0 });
    }
    const idx = (d: Date) => buckets.findIndex(b => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    filteredMems.forEach(m => {
      const d = new Date(m.created_at);
      const i = idx(d);
      if (i < 0) return;
      buckets[i].signups += 1;
      const t = tiersById[m.tier_id];
      if (t && (m.razorpay_payment_id || m.razorpay_subscription_id)) {
        buckets[i].revenue += Number(t.price_inr || 0);
      }
    });
    return buckets;
  }, [filteredMems, tiersById]);

  // Tier distribution (active members)
  const tierBreakdown = useMemo(() => {
    const counts: Record<string, { name: string; value: number; price: number }> = {};
    filteredMems.filter(m => m.status === 'active').forEach(m => {
      const t = tiersById[m.tier_id];
      const name = t?.name || 'Unknown';
      counts[name] = counts[name] || { name, value: 0, price: Number(t?.price_inr || 0) };
      counts[name].value += 1;
    });
    return Object.values(counts).sort((a, b) => b.value - a.value);
  }, [filteredMems, tiersById]);

  // Community leaderboard (only when "all")
  const communityLeaderboard = useMemo(() => {
    if (communityFilter !== 'all') return [];
    return communities.map(c => {
      const cm = memberships.filter(m => m.community_id === c.id && m.status === 'active');
      const rev = cm.reduce((s, m) => {
        const t = tiersById[m.tier_id];
        if (!t || (!m.razorpay_payment_id && !m.razorpay_subscription_id)) return s;
        return s + Number(t.price_inr || 0);
      }, 0);
      return { id: c.id, name: c.name, members: cm.length, revenue: rev };
    }).sort((a, b) => b.revenue - a.revenue || b.members - a.members).slice(0, 5);
  }, [communities, memberships, tiersById, communityFilter]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/creator')}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Insights</h1>
          <p className="text-xs text-muted-foreground">Key metrics across your communities</p>
        </div>
      </div>

      {communities.length > 1 && (
        <select value={communityFilter} onChange={e => setCommunityFilter(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground">
          <option value="all">All communities</option>
          {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground font-semibold mb-1">No data yet</p>
          <p className="text-muted-foreground text-sm mb-4">Launch a community to start seeing insights.</p>
          <button onClick={() => navigate('/communities/new')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Create community
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Kpi icon={Users} label="Active members" value={metrics.totalMembers}
              hint={`${metrics.last30} new in 30d`}
              delta={metrics.growthPct} />
            <Kpi icon={IndianRupee} label="Lifetime revenue" value={inr(metrics.lifetime)}
              hint={`${metrics.payingMembers} paying members`} />
            <Kpi icon={Repeat} label="MRR" value={inr(metrics.mrr)}
              hint="from monthly tiers" />
            <Kpi icon={TrendingUp} label="ARPU" value={inr(metrics.arpu)}
              hint="avg per paying member" />
            <Kpi icon={Activity} label="Churn" value={`${metrics.churnPct}%`}
              hint="cancelled / expired" />
            <Kpi icon={Layers} label="Communities" value={metrics.liveCommunities}
              hint={`${metrics.pending} pending • ${metrics.totalCommunities} total`} />
          </div>

          {/* Trend chart */}
          <Card title="Signups & revenue (6 months)">
            <div className="h-48 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gSignups)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-32 -mx-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={36}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip formatter={(v: any) => inr(Number(v))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Tier breakdown */}
          {tierBreakdown.length > 0 && (
            <Card title="Members by tier">
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tierBreakdown} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2}>
                        {tierBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {tierBreakdown.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-foreground">{t.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {t.value} {t.price > 0 ? `· ${inr(t.price)}` : '· free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Community leaderboard */}
          {communityLeaderboard.length > 0 && (
            <Card title="Top communities">
              <div className="space-y-3">
                {communityLeaderboard.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                      {i === 0 ? <Crown className="w-3.5 h-3.5 text-yellow-500" /> : i + 1}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{inr(c.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.members} members</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Quick stats">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat icon={UserPlus} label="Free members" value={metrics.freeMembers} />
              <Stat icon={Crown} label="Paying members" value={metrics.payingMembers} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Card = ({ title, children }: any) => (
  <div className="p-4 rounded-2xl bg-card border border-border">
    <h2 className="font-bold text-foreground mb-3 text-sm">{title}</h2>
    {children}
  </div>
);

const Kpi = ({ icon: Icon, label, value, hint, delta }: any) => (
  <div className="p-4 rounded-2xl bg-card border border-border">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
      {typeof delta === 'number' && (
        <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
          {delta >= 0 ? '+' : ''}{delta}%
        </span>
      )}
    </div>
    {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
  </div>
);

const Stat = ({ icon: Icon, label, value }: any) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto font-bold text-foreground">{value}</span>
  </div>
);

export default CreatorInsightsPage;
