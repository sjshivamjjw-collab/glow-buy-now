import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Users, Eye, EyeOff, Pencil, IndianRupee, TrendingUp, Layers } from 'lucide-react';
import { formatCount } from '@/lib/utils';

type Community = any;
type Tier = any;
type Membership = any;
type Profile = { id: string; name: string | null; username: string | null; avatar_url: string | null };

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [tab, setTab] = useState<'overview' | 'communities' | 'members'>('overview');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

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

      let profMap: Record<string, Profile> = {};
      const userIds = Array.from(new Set(memList.map(m => m.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase.rpc('get_chat_author_names' as any, { _user_ids: userIds });
        ((profs as any[]) || []).forEach(p => { profMap[p.id] = p; });
      }

      if (cancelled) return;
      setCommunities(commList);
      setTiers(tierList);
      setMemberships(memList);
      setProfilesById(profMap);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const tiersById = useMemo(() => {
    const m: Record<string, Tier> = {};
    tiers.forEach(t => { m[t.id] = t; });
    return m;
  }, [tiers]);

  const commById = useMemo(() => {
    const m: Record<string, Community> = {};
    communities.forEach(c => { m[c.id] = c; });
    return m;
  }, [communities]);

  const metrics = useMemo(() => {
    const active = memberships.filter(m => m.status === 'active');
    const totalMembers = active.length;
    // A "paying" member = active membership with an actual Razorpay payment/subscription id recorded
    const paying = active.filter(m =>
      !!m.razorpay_payment_id || !!m.razorpay_subscription_id || !!m.razorpay_order_id
    );
    let lifetime = 0;
    paying.forEach(m => {
      const t = tiersById[m.tier_id];
      if (!t) return;
      lifetime += Number(t.price_inr || 0);
    });
    const liveCommunities = communities.filter(c => c.is_published && c.approval_status === 'approved').length;
    const pending = communities.filter(c => c.approval_status === 'pending').length;
    return { totalMembers, payingMembers: paying.length, lifetime, liveCommunities, pending, totalCommunities: communities.length };
  }, [memberships, tiersById, communities]);

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

      <div className="flex gap-1 p-1 mb-4 rounded-xl bg-secondary">
        {(['overview', 'communities', 'members'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition ${
              tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tab === 'overview' ? (
        <OverviewTab metrics={metrics} memberships={memberships} commById={commById}
          tiersById={tiersById} profilesById={profilesById} />
      ) : tab === 'communities' ? (
        <CommunitiesTab communities={communities} onTogglePublish={togglePublish} navigate={navigate} />
      ) : (
        <MembersTab memberships={memberships} commById={commById} tiersById={tiersById} profilesById={profilesById} />
      )}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, hint }: any) => (
  <div className="p-4 rounded-2xl bg-card border border-border">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
    <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const OverviewTab = ({ metrics, memberships, commById, tiersById, profilesById }: any) => {
  const recent = memberships.filter((m: any) => m.status === 'active').slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={Users} label="Total members" value={metrics.totalMembers} hint="active across all communities" />
        <MetricCard icon={IndianRupee} label="Paying members" value={metrics.payingMembers} hint="on a paid tier" />
        <MetricCard icon={TrendingUp} label="Total revenue" value={`₹${metrics.lifetime.toLocaleString('en-IN')}`} hint="from paid memberships" />
        <MetricCard icon={Layers} label="Communities" value={metrics.liveCommunities}
          hint={`${metrics.pending} pending • ${metrics.totalCommunities} total`} />
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border">
        <h2 className="font-bold text-foreground mb-3">Recent members</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet. Share your community to get the first signups.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((m: any) => {
              const p = profilesById[m.user_id];
              const c = commById[m.community_id];
              const t = tiersById[m.tier_id];
              return (
                <div key={m.id} className="flex items-center gap-3">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {(p?.name || p?.username || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p?.name || p?.username || 'Member'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c?.name || 'Community'} • {t?.name || 'Tier'}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const CommunitiesTab = ({ communities, onTogglePublish, navigate }: any) => {
  if (communities.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground font-semibold mb-1">No communities yet</p>
        <p className="text-muted-foreground text-sm mb-4">Launch your first community to start earning.</p>
        <button onClick={() => navigate('/communities/new')}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Create community
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {communities.map((c: any) => (
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
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              c.approval_status === 'approved' ? 'bg-success/10 text-success' :
              c.approval_status === 'rejected' ? 'bg-destructive/10 text-destructive' :
              'bg-yellow-500/10 text-yellow-600'
            }`}>
              {c.approval_status === 'approved' ? (c.is_published ? 'LIVE' : 'DRAFT') :
               c.approval_status === 'rejected' ? 'REJECTED' : 'IN REVIEW'}
            </span>
          </div>
          {c.approval_status === 'rejected' && c.rejection_reason && (
            <div className="mb-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-[10px] font-semibold text-destructive mb-0.5">Reason</p>
              <p className="text-xs text-foreground">{c.rejection_reason}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => navigate(`/c/${c.slug}`)}
              className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold">View</button>
            <button onClick={() => navigate(`/communities/${c.id}/edit`)}
              className="px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Edit
            </button>
            {c.approval_status === 'approved' && (
              <button onClick={() => onTogglePublish(c)}
                className="px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center gap-1">
                {c.is_published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const MembersTab = ({ memberships, commById, tiersById, profilesById }: any) => {
  const [filter, setFilter] = useState<string>('all');
  const communityOptions = Object.values(commById) as any[];
  const filtered = memberships.filter((m: any) => filter === 'all' || m.community_id === filter);

  if (memberships.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground font-semibold mb-1">No members yet</p>
        <p className="text-muted-foreground text-sm">Members will appear here once people join your communities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select value={filter} onChange={e => setFilter(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground">
        <option value="all">All communities</option>
        {communityOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No members in this community yet.</p>
      ) : filtered.map((m: any) => {
        const p = profilesById[m.user_id];
        const c = commById[m.community_id];
        const t = tiersById[m.tier_id];
        return (
          <div key={m.id} className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3">
            {p?.avatar_url ? (
              <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                {(p?.name || p?.username || '?')[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p?.name || p?.username || 'Member'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {c?.name} • {t?.name}{t?.price_inr ? ` • ₹${Number(t.price_inr).toLocaleString('en-IN')}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                m.status === 'active' ? 'bg-success/10 text-success' :
                m.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                'bg-muted text-muted-foreground'
              }`}>
                {m.status.toUpperCase()}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreatorDashboard;
