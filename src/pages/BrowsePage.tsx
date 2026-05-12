import { useState } from 'react';
import { useShopperSearch, useDebounced } from '@/hooks/useShopperSearch';
import LivestreamCard from '@/components/LivestreamCard';
import { Search, X, SlidersHorizontal, ArrowUpDown, Radio, Calendar, Package, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type SortOption = 'viewers' | 'newest' | 'az';
type StatusFilter = 'all' | 'live' | 'scheduled';

const sortLabels: Record<SortOption, string> = {
  viewers: 'Most Viewers',
  newest: 'Newest',
  az: 'A–Z',
};

const BrowsePage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 150);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('viewers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { loading, categories, search } = useShopperSearch();
  const { streams, products, sellers } = search({
    query: debouncedQuery,
    category: selectedCategory,
    status: statusFilter,
    sort: sortBy,
  });

  const productMatches = debouncedQuery ? products.slice(0, 6) : [];
  const sellerMatches = debouncedQuery ? sellers.slice(0, 6) : [];
  const categoryNames = categories.map(c => c.name);
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (sortBy !== 'viewers' ? 1 : 0);
  const noResults = !loading && debouncedQuery && streams.length === 0 && productMatches.length === 0 && sellerMatches.length === 0;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <h1 className="text-xl font-bold text-foreground mb-4">Browse</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search streams, sellers, products..."
          className="w-full pl-12 pr-20 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button onClick={() => setQuery('')} className="p-1.5">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-xl transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Status</p>
                <div className="flex gap-2">
                  {([
                    { key: 'all', label: 'All', icon: null },
                    { key: 'live', label: 'Live', icon: Radio },
                    { key: 'scheduled', label: 'Upcoming', icon: Calendar },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setStatusFilter(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        statusFilter === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sort By</p>
                <div className="flex gap-2">
                  {(['viewers', 'newest', 'az'] as SortOption[]).map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        sortBy === opt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      {sortLabels[opt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          All
        </button>
        {categoryNames.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Seller matches */}
      {sellerMatches.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Sellers matching "{debouncedQuery}"</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {sellerMatches.map(seller => (
              <button key={seller.id} onClick={() => navigate(`/seller/${seller.id}`)}
                className="flex flex-col items-center gap-2 min-w-[80px]">
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

      {/* Product matches when searching */}
      {productMatches.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Products matching "{debouncedQuery}"</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {productMatches.map(product => (
              <motion.button key={product.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/checkout/${product.id}`, { state: { product } })}
                className="min-w-[140px] bg-card rounded-2xl overflow-hidden border border-border text-left active:scale-[0.97] transition-transform">
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

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">
          {streams.length} stream{streams.length !== 1 ? 's' : ''} found
        </p>
        {(query || selectedCategory || statusFilter !== 'all') && (
          <button onClick={() => { setQuery(''); setSelectedCategory(null); setStatusFilter('all'); }}
            className="text-xs text-primary font-semibold">
            Clear all
          </button>
        )}
      </div>

      {/* Stream results */}
      {noResults ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No results for "{debouncedQuery}"</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try a different search or filter</p>
        </div>
      ) : streams.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No streams found</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {streams.map((stream, i) => (
            <motion.div key={stream.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <LivestreamCard stream={stream} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowsePage;
