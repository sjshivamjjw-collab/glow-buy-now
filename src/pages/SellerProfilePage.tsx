import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Star, Package, Loader2, Users } from 'lucide-react';
import LivestreamCard from '@/components/LivestreamCard';
import { useSellerRatings, DEFAULT_SELLER_RATING } from '@/hooks/useSellerRatings';
import FollowButton from '@/components/FollowButton';
import { useFollowerCount } from '@/hooks/useFollows';
import type { Livestream } from '@/types';

interface SellerProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
}

const SellerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const sellerRatings = useSellerRatings();
  const followerCount = useFollowerCount(id);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, productsRes, streamsRes, appRes] = await Promise.all([
        supabase.rpc('get_seller_public_profile', { _seller_id: id }).maybeSingle(),
        supabase.from('products').select('id, title, price, images').eq('seller_id', id).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('livestreams').select('*').eq('seller_id', id).order('created_at', { ascending: false }),
        supabase.from('seller_applications').select('store_name, description').eq('user_id', id).eq('status', 'approved').maybeSingle(),
      ]);

      if (profileRes.data) setSeller(profileRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (appRes.data) {
        setStoreName(appRes.data.store_name || '');
        setBio(appRes.data.description || '');
      }

      const mapped: Livestream[] = (streamsRes.data || []).map((s: any) => ({
        id: s.id,
        sellerId: s.seller_id,
        sellerName: profileRes.data?.name || profileRes.data?.username || 'Seller',
        sellerAvatar: profileRes.data?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
        title: s.title,
        description: s.description || '',
        thumbnailUrl: s.thumbnail_url || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=900&fit=crop',
        status: s.status,
        viewerCount: s.viewer_count || 0,
        scheduledAt: s.scheduled_at || undefined,
        startedAt: s.started_at || undefined,
        products: [],
        category: s.category || '',
      }));
      setStreams(mapped);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Seller not found</div>;
  }

  const displayName = seller.name || seller.username || 'Seller';
  const displayStore = storeName || displayName;
  const rating = sellerRatings[seller.id] ?? DEFAULT_SELLER_RATING;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-8">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <div className="flex items-center gap-4 mb-6">
        {seller.avatar_url ? (
          <img src={seller.avatar_url} alt={displayName} className="w-20 h-20 rounded-2xl object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-foreground font-bold text-2xl">
            {displayName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold text-foreground">{displayStore}</h1>
          <p className="text-muted-foreground text-sm">{displayName}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-warning text-warning" />
              {rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              {products.length} items
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <FollowButton sellerId={seller.id} />
      </div>

      {bio && <p className="text-muted-foreground mb-6">{bio}</p>}

      {streams.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Streams</h2>
          <div className="grid grid-cols-2 gap-3">
            {streams.map(stream => (
              <LivestreamCard key={stream.id} stream={stream} sellerRating={rating} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Products</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No products yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <button key={product.id} onClick={() => navigate(`/checkout/${product.id}`)} className="rounded-2xl bg-card border border-border overflow-hidden text-left active:scale-[0.98] transition-transform">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                  <p className="text-primary font-extrabold mt-1">₹{Math.round(Number(product.price))}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SellerProfilePage;
