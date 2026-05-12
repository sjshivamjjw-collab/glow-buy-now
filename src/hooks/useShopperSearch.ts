import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Livestream } from '@/types';

export interface ShopperProduct {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[];
  category_id: string | null;
  categoryName: string;
  sellerName: string;
}

export interface ShopperSeller {
  id: string;
  name: string;
  avatar: string | null;
  storeName: string;
  productCount: number;
  categories: string[];
}

export interface ShopperCategory {
  id: string;
  name: string;
}

export interface SearchOptions {
  query?: string;
  category?: string | null;
  status?: 'all' | 'live' | 'scheduled';
  sort?: 'viewers' | 'newest' | 'az';
}

export interface SearchResult {
  streams: Livestream[];
  products: ShopperProduct[];
  sellers: ShopperSeller[];
}

const tokenize = (q: string) =>
  q.toLowerCase().trim().split(/\s+/).filter(Boolean);

const matchesAllTokens = (haystack: string, tokens: string[]) => {
  if (tokens.length === 0) return true;
  const lower = haystack.toLowerCase();
  return tokens.every(t => lower.includes(t));
};

export function useShopperSearch() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ShopperProduct[]>([]);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [sellers, setSellers] = useState<ShopperSeller[]>([]);
  const [categories, setCategories] = useState<ShopperCategory[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, streamRes, catRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, seller_id, title, description, price, compare_at_price, images, category_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('livestreams')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (streamRes.error) throw streamRes.error;
      if (catRes.error) throw catRes.error;

      const sellerIdSet = Array.from(new Set([
        ...((prodRes.data as any[]) || []).map((p: any) => p.seller_id),
        ...((streamRes.data as any[]) || []).map((s: any) => s.seller_id),
      ].filter(Boolean)));
      const profileRes = sellerIdSet.length
        ? await supabase.rpc('get_seller_public_profiles', { _ids: sellerIdSet })
        : { data: [] as any[] };

      const cats: ShopperCategory[] = catRes.data || [];
      const catById = new Map(cats.map(c => [c.id, c.name]));
      const profilesById = new Map(
        ((profileRes.data as any[]) || []).map((p: any) => [p.id, p])
      );

      const enrichedProducts: ShopperProduct[] = (prodRes.data || []).map((p: any) => {
        const seller = profilesById.get(p.seller_id);
        return {
          id: p.id,
          seller_id: p.seller_id,
          title: p.title,
          description: p.description,
          price: Number(p.price),
          compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
          images: p.images || [],
          category_id: p.category_id,
          categoryName: p.category_id ? catById.get(p.category_id) || '' : '',
          sellerName: seller?.name || seller?.username || 'Seller',
        };
      });

      const productsById = new Map(enrichedProducts.map(p => [p.id, p]));

      // A live stream is considered actually-on-air only if its updated_at
      // (heartbeat) is recent. Otherwise the seller's tab is gone — treat as ended.
      const STALE_MS = 60_000;
      const now = Date.now();
      const staleIds: string[] = [];

      // Map DB livestreams into the existing Livestream shape used by LivestreamCard
      const dbStreams: Livestream[] = (streamRes.data || []).map((s: any) => {
        const seller = profilesById.get(s.seller_id);
        const streamProducts = (s.product_ids || [])
          .map((id: string) => productsById.get(id))
          .filter(Boolean)
          .map((p: ShopperProduct) => ({
            id: p.id,
            sellerId: p.seller_id,
            title: p.title,
            description: p.description || '',
            price: p.price,
            originalPrice: p.compare_at_price || undefined,
            inventory: 0,
            images: p.images,
            category: p.categoryName,
            createdAt: '',
          }));

        let effectiveStatus = s.status as Livestream['status'];
        if (effectiveStatus === 'live') {
          const updatedAt = s.updated_at ? new Date(s.updated_at).getTime() : 0;
          if (now - updatedAt > STALE_MS) {
            effectiveStatus = 'ended';
            staleIds.push(s.id);
          }
        }

        return {
          id: s.id,
          sellerId: s.seller_id,
          sellerName: seller?.name || seller?.username || 'Seller',
          sellerAvatar:
            seller?.avatar_url ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
          title: s.title,
          description: s.description || '',
          thumbnailUrl:
            s.thumbnail_url ||
            'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=900&fit=crop',
          status: effectiveStatus,
          viewerCount: s.viewer_count || 0,
          scheduledAt: s.scheduled_at || undefined,
          startedAt: s.started_at || undefined,
          products: streamProducts,
          category: s.category || '',
        } as Livestream;
      });

      // Best-effort: clean up stale rows in the DB so other clients see the
      // correct status too. RLS blocks shoppers from updating others' streams,
      // but the seller themselves will succeed and end-listeners fire.
      if (staleIds.length > 0) {
        supabase
          .from('livestreams')
          .update({ status: 'ended', ended_at: new Date().toISOString(), viewer_count: 0 })
          .in('id', staleIds)
          .then(() => {});
      }

      // Real DB streams only (mock fallback removed)
      const mergedStreams: Livestream[] = dbStreams;

      // Build seller list from profiles that own at least one product
      const productCountBySeller = new Map<string, number>();
      const categoriesBySeller = new Map<string, Set<string>>();
      enrichedProducts.forEach(p => {
        productCountBySeller.set(p.seller_id, (productCountBySeller.get(p.seller_id) || 0) + 1);
        if (p.categoryName) {
          if (!categoriesBySeller.has(p.seller_id)) categoriesBySeller.set(p.seller_id, new Set());
          categoriesBySeller.get(p.seller_id)!.add(p.categoryName);
        }
      });

      const sellerList: ShopperSeller[] = Array.from(productCountBySeller.keys()).map(sid => {
        const profile: any = profilesById.get(sid);
        return {
          id: sid,
          name: profile?.name || profile?.username || 'Seller',
          avatar: profile?.avatar_url || null,
          storeName: profile?.username || profile?.name || 'Store',
          productCount: productCountBySeller.get(sid) || 0,
          categories: Array.from(categoriesBySeller.get(sid) || []),
        };
      });

      setProducts(enrichedProducts);
      setStreams(mergedStreams);
      setSellers(sellerList);
      setCategories(cats);
    } catch (e: any) {
      console.error('useShopperSearch load failed', e);
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const search = useMemo(() => {
    return (opts: SearchOptions = {}): SearchResult => {
      const { query = '', category = null, status = 'all', sort = 'viewers' } = opts;
      const tokens = tokenize(query);

      let s = streams.filter(stream => {
        if (category && stream.category !== category) return false;
        if (status !== 'all' && stream.status !== status) return false;
        if (tokens.length === 0) return true;
        const text = [
          stream.title,
          stream.description,
          stream.category,
          stream.sellerName,
          ...(stream.products || []).map(p => p.title),
        ].join(' ');
        return matchesAllTokens(text, tokens);
      });

      s = [...s].sort((a, b) => {
        if (sort === 'viewers') return (b.viewerCount || 0) - (a.viewerCount || 0);
        if (sort === 'newest') {
          return (
            new Date(b.startedAt || b.scheduledAt || 0).getTime() -
            new Date(a.startedAt || a.scheduledAt || 0).getTime()
          );
        }
        return a.title.localeCompare(b.title);
      });

      const p = products.filter(prod => {
        if (category && prod.categoryName !== category) return false;
        if (tokens.length === 0) return true;
        const text = [prod.title, prod.description || '', prod.categoryName, prod.sellerName].join(' ');
        return matchesAllTokens(text, tokens);
      });

      const sl = sellers.filter(seller => {
        if (category && !seller.categories.includes(category)) return false;
        if (tokens.length === 0) return true;
        const text = [seller.name, seller.storeName, ...seller.categories].join(' ');
        return matchesAllTokens(text, tokens);
      });

      return { streams: s, products: p, sellers: sl };
    };
  }, [streams, products, sellers]);

  return { loading, error, categories, sellers, search, refresh: load };
}

// Small debounce helper for inputs
export function useDebounced<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
