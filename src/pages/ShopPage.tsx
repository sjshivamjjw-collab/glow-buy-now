import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, Loader2, Package, ArrowUpDown } from 'lucide-react';
import { useShopperSearch, useDebounced } from '@/hooks/useShopperSearch';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

const ShopPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 150);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  const { loading, categories, search } = useShopperSearch();
  const { products } = search({ query: debouncedQuery, category: selectedCategory });

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    // 'newest' is the natural order returned by the hook
    return list;
  }, [products, sort]);

  const isSearching = debouncedQuery.trim().length > 0;
  const categoryNames = categories.map(c => c.name);

  return (
    <div className="px-4 pt-14 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-sm">Browse</p>
          <h1 className="text-2xl font-extrabold text-foreground">Shop 🛍️</h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {['All', ...categoryNames].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              (cat === 'All' && !selectedCategory) || selectedCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sort + count */}
      <div className="flex items-center justify-between mb-4 relative">
        <p className="text-xs text-muted-foreground font-medium">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
          {isSearching && ` for "${debouncedQuery}"`}
        </p>
        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {SORT_LABELS[sort]}
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setSort(opt); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                      sort === opt ? 'text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {SORT_LABELS[opt]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && sortedProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">
            {isSearching ? `No products for "${debouncedQuery}"` : 'No products available'}
          </p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try a different filter</p>
        </div>
      )}

      {/* Grid */}
      {sortedProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {sortedProducts.map((product, i) => (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
              onClick={() => navigate(`/checkout/${product.id}`, { state: { product } })}
              className="bg-card rounded-2xl overflow-hidden border border-border text-left active:scale-[0.97] transition-transform"
            >
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.title} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-secondary" />
              )}
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground line-clamp-1">{product.title}</p>
                {product.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold text-primary">₹{Math.round(product.price)}</span>
                  {product.compare_at_price && product.compare_at_price > 0 && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      ₹{Math.round(product.compare_at_price)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-primary font-semibold mt-1.5">Buy Now →</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
