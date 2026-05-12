import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
}

const FALLBACK_IMAGES: Record<string, string> = {
  'Beauty & Personal Care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop',
  'Home Decor': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  'Kids & Baby': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=400&fit=crop',
  'Food & Beverage': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
};

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-6">Categories</h1>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => navigate(`/category/${encodeURIComponent(cat.slug)}`)}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden group"
          >
            <img
              src={cat.image_url || FALLBACK_IMAGES[cat.name] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop'}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-bold text-sm text-left leading-tight">{cat.name}</p>
              {cat.description && (
                <p className="text-white/70 text-[11px] mt-0.5 text-left">{cat.description}</p>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;
