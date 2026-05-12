import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunityMembership } from '@/hooks/useCommunityMembership';
import { ArrowLeft, MessageSquare, Calendar, FileBox, Loader2, Sparkles, X, Crown } from 'lucide-react';
import { ChatPanel } from '@/components/community/ChatPanel';
import { EventsPanel } from '@/components/community/EventsPanel';
import { ResourcesPanel } from '@/components/community/ResourcesPanel';
import { PlansPanel } from '@/components/community/PlansPanel';

type Tab = 'chat' | 'events' | 'resources' | 'plans';

const CommunityRoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [community, setCommunity] = useState<{ id: string; name: string } | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const { isMember, isCreator, isModerator, loading: loadingMembership, tiers, tierLevel, currentTier, refresh: refreshMembership } = useCommunityMembership(community?.id);
  const initialTab = (searchParams.get('tab') as Tab) || 'chat';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoadingCommunity(true);
      const { data } = await supabase.from('communities' as any)
        .select('id, name').eq('slug', slug).maybeSingle();
      setCommunity(data as any);
      setLoadingCommunity(false);
    })();
  }, [slug]);

  useEffect(() => { setSearchParams({ tab }, { replace: true }); }, [tab]);

  // Throttle the upgrade nudge: show at most once per 24h per community
  const dismissKey = community ? `upgradeBannerSeen:${community.id}` : '';
  const [showUpgrade, setShowUpgrade] = useState(false);
  const upgradeTier = community && !isCreator
    ? tiers.filter(t => t.sort_order > tierLevel).sort((a, b) => a.sort_order - b.sort_order)[0]
    : null;
  useEffect(() => {
    if (!upgradeTier || !dismissKey) { setShowUpgrade(false); return; }
    const last = Number(localStorage.getItem(dismissKey) || 0);
    setShowUpgrade(Date.now() - last > 24 * 60 * 60 * 1000);
  }, [upgradeTier?.id, dismissKey]);

  const dismissUpgrade = () => {
    if (dismissKey) localStorage.setItem(dismissKey, String(Date.now()));
    setShowUpgrade(false);
  };

  // Auto-join free tier when a non-member lands here (e.g. from Discover)
  const { userId } = useAuth();
  const autoJoinRef = useRef(false);
  useEffect(() => {
    if (loadingCommunity || loadingMembership) return;
    if (!community || !userId || isMember || isCreator || autoJoinRef.current) return;
    const freeTier = tiers.find(t => t.kind === 'free');
    if (!freeTier) {
      navigate(`/c/${slug}`, { replace: true });
      return;
    }
    autoJoinRef.current = true;
    (async () => {
      const { error } = await supabase.from('memberships' as any).insert({
        user_id: userId, community_id: community.id, tier_id: freeTier.id,
        status: 'active', source: 'free', started_at: new Date().toISOString(),
      });
      if (error) {
        autoJoinRef.current = false;
        navigate(`/c/${slug}`, { replace: true });
        return;
      }
      await refreshMembership();
    })();
  }, [loadingCommunity, loadingMembership, community, userId, isMember, isCreator, tiers, slug]);

  const loading = loadingCommunity || loadingMembership;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-10 text-center">
        <p className="text-muted-foreground">Community not found.</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'resources', label: 'Resources', icon: FileBox },
    { key: 'plans', label: 'Plans', icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(`/c/${slug}`)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{community.name}</h1>
          <p className="text-xs text-muted-foreground">
            {isCreator ? 'You host this' : currentTier ? `${currentTier.name} member` : 'Member'}
          </p>
        </div>
      </div>

      {upgradeTier && showUpgrade && (
        <div className="w-full mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/15 to-pink-500/15 border border-amber-500/30">
          <button onClick={() => navigate(`/c/${slug}`)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">Upgrade to {upgradeTier.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {upgradeTier.kind === 'paid_monthly'
                  ? `₹${Number(upgradeTier.price_inr).toLocaleString()} / month`
                  : upgradeTier.kind === 'paid_one_time'
                  ? `₹${Number(upgradeTier.price_inr).toLocaleString()} one-time`
                  : 'Free'} · unlock premium channels & resources
              </div>
            </div>
          </button>
          <button onClick={dismissUpgrade} className="p-1.5 rounded-lg hover:bg-background/50 shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 p-1 bg-card border border-border rounded-2xl mb-5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatPanel communityId={community.id} isCreator={isCreator} isModerator={isModerator} tierLevel={tierLevel} tiers={tiers} slug={slug!} />}
      {tab === 'events' && <EventsPanel communityId={community.id} isCreator={isCreator} tierLevel={tierLevel} tiers={tiers} slug={slug!} />}
      {tab === 'resources' && <ResourcesPanel communityId={community.id} isCreator={isCreator} tierLevel={tierLevel} tiers={tiers} slug={slug!} />}
      {tab === 'plans' && <PlansPanel communityId={community.id} communityName={community.name} tiers={tiers} currentTier={currentTier} isCreator={isCreator} onJoined={refreshMembership} />}
    </div>
  );
};

export default CommunityRoomPage;
