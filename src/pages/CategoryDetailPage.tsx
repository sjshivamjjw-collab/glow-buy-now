import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LivestreamCard from '@/components/LivestreamCard';
import { useSellerRatings, DEFAULT_SELLER_RATING } from '@/hooks/useSellerRatings';
import { ArrowLeft, Search, X, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Livestream } from '@/types';

interface Product {
  id: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  images: string[];
}

const CategoryDetailPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const slug = decodeURIComponent(name || '');
  const [categoryName, setCategoryName] = useState(slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const sellerRatings = useSellerRatings();
  const ratingFor = (sellerId: string) => sellerRatings[sellerId] ?? DEFAULT_SELLER_RATING;

  useEffect(() => {
    const load = async () => {
      const { data: cat } = await supabase.from('categories').select('id, name').eq('slug', slug).maybeSingle();
      if (!cat) return;
      setCategoryName(cat.name);

      const [prodsRes, streamsRes] = await Promise.all([
        supabase.from('products').select('id, title, price, compare_at_price, images')
          .eq('category_id', cat.id).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('livestreams').select('*').eq('category', cat.name).order('created_at', { ascending: false }),
      ]);

      if (prodsRes.data) setProducts(prodsRes.data);

      const sellerIds = Array.from(new Set((streamsRes.data || []).map((s: any) => s.seller_id)));
      const profilesRes = sellerIds.length
        ? await supabase.rpc('get_seller_public_profiles', { _ids: sellerIds })
        : { data: [] as any[] };
      const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

      const mapped: Livestream[] = (streamsRes.data || []).map((s: any) => {
        const seller = profilesById.get(s.seller_id);
        return {
          id: s.id,
          sellerId: s.seller_id,
          sellerName: seller?.name || seller?.username || 'Seller',
          sellerAvatar: seller?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
          title: s.title,
          description: s.description || '',
          thumbnailUrl: s.thumbnail_url || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=900&fit=crop',
          status: s.status,
          viewerCount: s.viewer_count || 0,
          scheduledAt: s.scheduled_at || undefined,
          startedAt: s.started_at || undefined,
          products: [],
          category: s.category || '',
        } as Livestream;
      });
      setStreams(mapped);
    };
    load();
  }, [slug]);

  const filtered = streams.filter(s => {
    const matchesQuery = !query || s.title.toLowerCase().includes(query.toLowerCase()) || s.sellerName.toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  });

  const liveStreams = filtered.filter(s => s.status === 'live');
  const upcomingStreams = filtered.filter(s => s.status === 'scheduled');

  const filteredProducts = products.filter(p => !query || p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/categories')} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{categoryName}</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search in ${categoryName}...`}
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {liveStreams.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            <h2 className="text-lg font-bold text-foreground">Live Now</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {liveStreams.map(stream => (<LivestreamCard key={stream.id} stream={stream} sellerRating={ratingFor(stream.sellerId)} />))}
          </div>
        </section>
      )}

      {filteredProducts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Products</h2>
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl overflow-hidden border border-border">
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-secondary flex items-center justify-center"><Package className="w-8 h-8 text-muted-foreground" /></div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{product.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-primary">₹{Math.round(product.price)}</span>
                    {product.compare_at_price && <span className="text-[11px] text-muted-foreground line-through">₹{Math.round(product.compare_at_price)}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {upcomingStreams.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Coming Up</h2>
          <div className="grid grid-cols-2 gap-3">
            {upcomingStreams.map(stream => (<LivestreamCard key={stream.id} stream={stream} sellerRating={ratingFor(stream.sellerId)} />))}
          </div>
        </section>
      )}

      {filtered.length === 0 && filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">Nothing in {categoryName} yet</p>
        </div>
      )}
    </div>
  );
};

export default CategoryDetailPage;
