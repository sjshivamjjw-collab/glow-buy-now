import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TierInfo {
  id: string;
  name: string;
  description: string | null;
  kind: 'free' | 'paid_monthly' | 'paid_one_time';
  price_inr: number | null;
  sort_order: number;
}

export const useCommunityMembership = (communityId: string | null | undefined) => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [tierLevel, setTierLevel] = useState<number>(-1); // -1 = no membership; creators get Infinity
  const [currentTier, setCurrentTier] = useState<TierInfo | null>(null);

  const refresh = async () => {
    if (!communityId || !userId) { setLoading(false); return; }
    const [{ data: c }, { data: t }, { data: m }, { data: mod }] = await Promise.all([
      supabase.from('communities' as any).select('creator_id').eq('id', communityId).maybeSingle(),
      supabase.from('community_tiers' as any).select('id, name, description, kind, price_inr, sort_order')
        .eq('community_id', communityId).eq('is_active', true).order('sort_order'),
      supabase.from('memberships' as any)
        .select('tier_id, status, razorpay_payment_id, razorpay_subscription_id, current_period_end')
        .eq('community_id', communityId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
      supabase.from('community_moderators' as any).select('id')
        .eq('community_id', communityId).eq('user_id', userId).maybeSingle(),
    ]);
    const tierList = ((t as any[]) || []) as TierInfo[];
    setTiers(tierList);
    const creator = (c as any)?.creator_id === userId;
    setIsCreator(creator);
    setIsModerator(creator || !!mod);

    // Mirror DB-side gating in is_active_community_member: a paid tier requires
    // a verified Razorpay payment/subscription and an unexpired period.
    let validMembership = false;
    let memTier: TierInfo | null = null;
    if (m) {
      memTier = tierList.find(x => x.id === (m as any).tier_id) || null;
      const periodOk = !(m as any).current_period_end || new Date((m as any).current_period_end) > new Date();
      const paidOk = !!(m as any).razorpay_payment_id || !!(m as any).razorpay_subscription_id;
      const isFree = memTier?.kind === 'free';
      validMembership = periodOk && (isFree || paidOk);
    }

    setIsMember(creator || validMembership);
    if (creator) {
      setTierLevel(Number.POSITIVE_INFINITY);
      setCurrentTier(null);
    } else if (validMembership && memTier) {
      setCurrentTier(memTier);
      setTierLevel(memTier.sort_order);
    } else {
      setTierLevel(-1);
      setCurrentTier(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Stay in loading state until we have both ids AND a fetch has completed.
    // Setting loading=false too early causes consumers to race on isMember=false.
    if (!communityId || !userId) return;
    setLoading(true);
    let cancelled = false;
    (async () => { if (!cancelled) await refresh(); })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, userId]);

  return { isMember, isCreator, isModerator, loading, tiers, tierLevel, currentTier, refresh };
};
