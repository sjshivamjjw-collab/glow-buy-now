import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCommunityMembership = (communityId: string | null | undefined) => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (!communityId || !userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase.from('communities').select('creator_id').eq('id', communityId).maybeSingle(),
        supabase.from('memberships').select('id').eq('community_id', communityId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
      ]);
      if (cancelled) return;
      const creator = c?.creator_id === userId;
      setIsCreator(creator);
      setIsMember(creator || !!m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [communityId, userId]);

  return { isMember, isCreator, loading };
};
