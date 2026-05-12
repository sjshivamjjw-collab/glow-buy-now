import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Users, Check, Globe, Play, Camera } from 'lucide-react';

const loadRazorpay = (): Promise<boolean> => new Promise(resolve => {
  if ((window as any).Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const CommunityDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { userId, userName, phone } = useAuth();
  const { toast } = useToast();

  const [community, setCommunity] = useState<any | null>(null);
  const [creator, setCreator] = useState<any | null>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [membership, setMembership] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from('communities' as any)
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!c) { setLoading(false); return; }
      setCommunity(c);

      const [{ data: t }, { data: prof }, { data: mem }] = await Promise.all([
        supabase.from('community_tiers' as any).select('*').eq('community_id', (c as any).id).eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('id, name, username, avatar_url').eq('id', (c as any).creator_id).maybeSingle(),
        userId
          ? supabase.from('memberships' as any).select('*').eq('community_id', (c as any).id).eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setTiers((t as any[]) || []);
      setCreator(prof);
      setMembership(mem);
      setLoading(false);

      // If the viewer is already an active member, take them straight into the community room.
      if (mem && (mem as any).status === 'active') {
        navigate(`/c/${(c as any).slug}/room`, { replace: true });
      }
    };
    load();
  }, [slug, userId, navigate]);

  const refresh = async () => {
    if (!community || !userId) return;
    const { data } = await supabase.from('memberships' as any).select('*')
      .eq('community_id', community.id).eq('user_id', userId).maybeSingle();
    setMembership(data);
  };

  const handleJoin = async (tier: any) => {
    if (!userId) { navigate('/auth'); return; }
    setJoining(tier.id);
    try {
      if (tier.kind === 'free') {
        const { error } = await supabase.from('memberships' as any).insert({
          user_id: userId,
          community_id: community.id,
          tier_id: tier.id,
          status: 'active',
          source: 'free',
          started_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast({ title: `Welcome to ${community.name}!` });
        await refresh();
      } else {
        const ok = await loadRazorpay();
        if (!ok) { toast({ title: 'Could not load checkout', variant: 'destructive' }); return; }
        const { data, error } = await supabase.functions.invoke('create-membership-checkout', {
          body: { tier_id: tier.id },
        });
        if (error || !data) throw error || new Error('No data');
        const rzp = new (window as any).Razorpay({
          key: data.key_id,
          name: community.name,
          description: tier.name,
          ...(data.subscription_id
            ? { subscription_id: data.subscription_id }
            : { order_id: data.order_id, amount: data.amount, currency: 'INR' }),
          prefill: { name: userName || '', contact: phone || '' },
          theme: { color: '#dc2626' },
          handler: async (resp: any) => {
            const { error: vErr } = await supabase.functions.invoke('verify-membership-payment', {
              body: {
                membership_id: data.membership_id,
                ...(data.subscription_id
                  ? {
                      razorpay_payment_id: resp.razorpay_payment_id,
                      razorpay_subscription_id: data.subscription_id,
                      razorpay_signature: resp.razorpay_signature,
                    }
                  : {
                      razorpay_payment_id: resp.razorpay_payment_id,
                      razorpay_order_id: data.order_id,
                      razorpay_signature: resp.razorpay_signature,
                    }),
              },
            });
            if (vErr) {
              toast({ title: 'Payment verification failed', description: vErr.message, variant: 'destructive' });
              return;
            }
            toast({ title: `You're in!`, description: `Welcome to ${community.name}.` });
            await refresh();
          },
          modal: { ondismiss: () => setJoining(null) },
        });
        rzp.open();
      }
    } catch (e: any) {
      toast({ title: 'Could not join', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setJoining(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Community not found</div>
    );
  }

  const social = community.social_links || {};
  const isMember = membership?.status === 'active';
  const currentTier = isMember ? tiers.find((t: any) => t.id === membership.tier_id) : null;
  const currentLevel = currentTier?.sort_order ?? -1;
  const upgradeTiers = isMember ? tiers.filter((t: any) => t.sort_order > currentLevel) : [];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-24">
      <div className="relative">
        {community.cover_url ? (
          <div className="aspect-[16/9] bg-secondary overflow-hidden">
            <img src={community.cover_url} alt={community.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-primary/30 via-accent/20 to-secondary flex items-center justify-center">
            <span className="text-5xl font-extrabold text-primary/40">{community.name[0]}</span>
          </div>
        )}
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-xl bg-card/90 backdrop-blur border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-center gap-3 mb-3">
          {creator?.avatar_url ? (
            <img src={creator.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary" />
          )}
          <div>
            <p className="text-sm text-muted-foreground">By {creator?.name || creator?.username || 'Creator'}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{community.member_count} member{community.member_count === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-foreground mb-2">{community.name}</h1>
        {community.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">{community.description}</p>
        )}

        {community.intro_video_url && (
          <div className="aspect-video rounded-2xl overflow-hidden bg-black mb-5">
            <video src={community.intro_video_url} controls className="w-full h-full" />
          </div>
        )}

        {community.key_outcomes?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">What you'll get</h2>
            <ul className="space-y-2">
              {community.key_outcomes.map((o: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(social.youtube || social.instagram || social.x || social.website) && (
          <div className="flex items-center gap-2 mb-6">
            {social.youtube && <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-secondary text-xs font-bold"><Play className="w-4 h-4" /></a>}
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-secondary"><Camera className="w-4 h-4" /></a>}
            {social.x && <a href={social.x} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-secondary text-xs font-bold">X</a>}
            {social.website && <a href={social.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-secondary"><Globe className="w-4 h-4" /></a>}
          </div>
        )}

        {isMember && (
          <button onClick={() => navigate(`/c/${community.slug}/room`)}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold mb-4">
            Enter community
          </button>
        )}

        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
            {isMember ? (upgradeTiers.length ? 'Upgrade your tier' : 'Your tier') : 'Choose a tier'}
          </h2>
          {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tiers available yet.</p>}
          {tiers.map((t: any) => {
            const isCurrent = isMember && t.id === membership.tier_id;
            const isLower = isMember && t.sort_order < currentLevel;
            return (
              <div key={t.id} className={`p-4 rounded-2xl border ${isCurrent ? 'bg-primary/5 border-primary' : 'bg-card border-border'} ${isLower ? 'opacity-50' : ''}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-bold text-foreground">{t.name} {isCurrent && <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Current</span>}</h3>
                  <span className="font-extrabold text-foreground">
                    {t.kind === 'free' ? 'Free' : `₹${Number(t.price_inr).toLocaleString()}`}
                    {t.kind === 'paid_monthly' && <span className="text-xs font-normal text-muted-foreground"> / mo</span>}
                  </span>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
                {!isCurrent && !isLower && (
                  <button onClick={() => handleJoin(t)} disabled={joining === t.id}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                    {joining === t.id ? 'Processing…' : isMember ? `Upgrade to ${t.name}` : t.kind === 'free' ? 'Join free' : t.kind === 'paid_monthly' ? 'Subscribe' : 'Buy access'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommunityDetailPage;
