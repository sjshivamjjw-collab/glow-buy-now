import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches composite seller ratings (0-5) from the seller_ratings view.
 * Returns a map of seller_id -> rating. Sellers with no orders are absent;
 * fall back to a neutral default in the UI.
 */
export function useSellerRatings() {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('seller_ratings' as any)
        .select('seller_id, rating');
      if (cancelled || error || !data) return;
      const map: Record<string, number> = {};
      (data as any[]).forEach(r => {
        if (r.seller_id != null && r.rating != null) {
          map[r.seller_id] = Number(r.rating);
        }
      });
      setRatings(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ratings;
}

export const DEFAULT_SELLER_RATING = 4.0;
