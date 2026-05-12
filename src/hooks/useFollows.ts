import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks the set of seller IDs the current user follows.
 * Realtime-subscribed so follow/unfollow from anywhere in the app reflects everywhere.
 */
export function useFollows() {
  const { userId, isAuthenticated } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setFollowedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('follows')
      .select('seller_id')
      .eq('follower_id', userId);
    setFollowedIds(new Set((data || []).map((r: any) => r.seller_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`follows-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  const follow = useCallback(
    async (sellerId: string) => {
      if (!userId) return { error: 'not-authenticated' as const };
      // Optimistic
      setFollowedIds(prev => new Set(prev).add(sellerId));
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: userId, seller_id: sellerId });
      if (error) {
        setFollowedIds(prev => {
          const n = new Set(prev);
          n.delete(sellerId);
          return n;
        });
      }
      return { error: error?.message || null };
    },
    [userId]
  );

  const unfollow = useCallback(
    async (sellerId: string) => {
      if (!userId) return { error: 'not-authenticated' as const };
      setFollowedIds(prev => {
        const n = new Set(prev);
        n.delete(sellerId);
        return n;
      });
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('seller_id', sellerId);
      if (error) {
        setFollowedIds(prev => new Set(prev).add(sellerId));
      }
      return { error: error?.message || null };
    },
    [userId]
  );

  const toggle = useCallback(
    (sellerId: string) =>
      followedIds.has(sellerId) ? unfollow(sellerId) : follow(sellerId),
    [followedIds, follow, unfollow]
  );

  return {
    loading,
    followedIds,
    isFollowing: (sellerId: string) => followedIds.has(sellerId),
    follow,
    unfollow,
    toggle,
    canFollow: isAuthenticated,
    refresh: load,
  };
}

/**
 * Returns the follower count for a single seller. Lightweight, polls on mount + realtime.
 */
export function useFollowerCount(sellerId: string | null | undefined) {
  const [count, setCount] = useState<number>(0);

  const load = useCallback(async () => {
    if (!sellerId) return;
    const { count: c } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);
    setCount(c || 0);
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sellerId) return;
    const ch = supabase
      .channel(`follower-count-${sellerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows', filter: `seller_id=eq.${sellerId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sellerId, load]);

  return count;
}
