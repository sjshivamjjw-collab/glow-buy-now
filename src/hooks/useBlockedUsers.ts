import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBlockedUsers() {
  const { userId } = useAuth();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setBlocked(new Set()); setLoaded(true); return; }
    const { data } = await supabase.rpc('get_blocked_user_ids' as any, { _viewer: userId });
    setBlocked(new Set(((data as any[]) || []).map(r => (typeof r === 'string' ? r : r.get_blocked_user_ids))));
    setLoaded(true);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { blocked, loaded, refresh };
}
