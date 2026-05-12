import { useState } from 'react';
import { useShopperSearch, useDebounced } from '@/hooks/useShopperSearch';
import { useSellerRatings, DEFAULT_SELLER_RATING } from '@/hooks/useSellerRatings';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import LivestreamCard from '@/components/LivestreamCard';
import { Bell, Search, X, Loader2, Package, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const HomeFeed = () => {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const sellerRatings = useSellerRatings();
  const { isFollowing } = useFollows();
  const { unreadCount } = useNotifications();
  const ratingFor = (sellerId: string) => sellerRatings[sellerId] ?? DEFAULT_SELLER_RATING;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 150);

  const { loading, categories, search } = useShopperSearch();
  const { streams, products, sellers } = search({
    query: debouncedQuery,
    category: selectedCategory,
  });

  const isSearching = debouncedQuery.trim().length > 0;
  const categoryNames = categories.map(c => c.name);

  // Followed sellers currently live
  const liveStreams = streams.filter(s => s.status === 'live');
  const followedLive = liveStreams.filter(s => isFollowing(s.sellerId));
  const otherLive = liveStreams.filter(s => !isFollowing(s.sellerId));
  const upcomingStreams = streams.filter(s => s.status === 'scheduled');

  const filteredProducts = products.slice(0, isSearching ? 8 : 6);
  const matchedSellers = isSearching ? sellers : [];

  const noResults =
    isSearching &&
    streams.length === 0 &&
    filteredProducts.length === 0 &&
    matchedSellers.length === 0;

  return (
    <div className="px-4 pt-14 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="text-2xl font-extrabold text-foreground">{userName?.split(' ')[0] || 'Shopper'} 👋</h1>
        </div>
        <button onClick={() => navigate('/notifications')} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center relative">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-live text-[10px] font-bold text-live-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search streams, sellers, products..."
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {['All', ...categoryNames].map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              (cat === 'All' && !selectedCategory) || selectedCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Search results summary */}
      {isSearching && !noResults && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground font-medium">
            Results for "{debouncedQuery}"
          </p>
          <button onClick={() => { setQuery(''); setSelectedCategory(null); }}
            className="text-xs text-primary font-semibold">Clear</button>
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No results for "{debouncedQuery}"</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Matched sellers when searching */}
      {matchedSellers.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Sellers</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {matchedSellers.map(seller => (
              <button key={seller.id} onClick={() => navigate(`/seller/${seller.id}`)} className="flex flex-col items-center gap-2 min-w-[80px]">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/20 bg-secondary">
                  {seller.avatar ? (
                    <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground font-bold">
                      {seller.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground text-center leading-tight">{seller.name.split(' ')[0]}</span>
                <span className="text-[10px] text-muted-foreground">{seller.productCount} items</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Products – shown FIRST when actively searching */}
      {isSearching && filteredProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Products</h2>
            <span className="text-muted-foreground text-sm">({filteredProducts.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <motion.button key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/checkout/${product.id}`, { state: { product } })}
                className="bg-card rounded-2xl overflow-hidden border border-border text-left active:scale-[0.97] transition-transform">
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-secondary" />
                )}
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{product.title}</p>
                  {product.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-primary">₹{Math.round(product.price)}</span>
                    {product.compare_at_price && product.compare_at_price > 0 && (
                      <span className="text-[11px] text-muted-foreground line-through">₹{Math.round(product.compare_at_price)}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Followed Sellers Live */}
      {followedLive.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            <h2 className="text-lg font-bold text-foreground">Sellers You Follow</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {followedLive.map((stream, i) => (
              <motion.div key={stream.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <LivestreamCard stream={stream} sellerRating={ratingFor(stream.sellerId)} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Live Now */}
      {otherLive.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            <h2 className="text-lg font-bold text-foreground">Live Now</h2>
            <span className="text-muted-foreground text-sm">({otherLive.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {otherLive.map((stream, i) => (
              <motion.div key={stream.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <LivestreamCard stream={stream} sellerRating={ratingFor(stream.sellerId)} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products strip (browse mode only — search shows products at the top) */}
      {!isSearching && filteredProducts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Featured Products</h2>
            </div>
            <button onClick={() => navigate('/shop')} className="text-xs font-semibold text-primary">
              See all →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {filteredProducts.slice(0, 6).map(product => (
              <motion.button key={product.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/checkout/${product.id}`, { state: { product } })}
                className="min-w-[140px] max-w-[140px] bg-card rounded-2xl overflow-hidden border border-border text-left active:scale-[0.97] transition-transform">
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-secondary" />
                )}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{product.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-primary">₹{Math.round(product.price)}</span>
                    {product.compare_at_price && product.compare_at_price > 0 && (
                      <span className="text-[10px] text-muted-foreground line-through">₹{Math.round(product.compare_at_price)}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Coming Up */}
      {upcomingStreams.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Coming Up</h2>
          <div className="grid grid-cols-2 gap-3">
            {upcomingStreams.map(stream => (
              <LivestreamCard key={stream.id} stream={stream} sellerRating={ratingFor(stream.sellerId)} />
            ))}
          </div>
        </section>
      )}

      {/* Top Sellers (only when not searching) */}
      {!isSearching && sellers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Top Sellers</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {sellers.slice(0, 10).map(seller => (
              <button key={seller.id} onClick={() => navigate(`/seller/${seller.id}`)} className="flex flex-col items-center gap-2 min-w-[80px]">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/20 bg-secondary">
                  {seller.avatar ? (
                    <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground font-bold">
                      {seller.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground text-center leading-tight">{seller.name.split(' ')[0]}</span>
                <span className="text-[10px] text-muted-foreground">{seller.productCount} items</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeFeed;
