import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, IndianRupee, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type SizePreset = 'clothing' | 'footwear_uk' | 'custom';
const SIZE_PRESETS: Record<Exclude<SizePreset, 'custom'>, string[]> = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  footwear_uk: ['5', '6', '7', '8', '9', '10', '11'],
};
interface VariantRow { label: string; stock: string; }

const CreateProductPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { userId, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [sizePreset, setSizePreset] = useState<SizePreset>('clothing');
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const toggleSizeChip = (label: string) => {
    setVariants(prev => {
      const exists = prev.find(v => v.label === label);
      if (exists) return prev.filter(v => v.label !== label);
      return [...prev, { label, stock: '' }];
    });
  };
  const addCustomVariant = () => {
    const l = customLabel.trim();
    if (!l) return;
    if (variants.some(v => v.label.toLowerCase() === l.toLowerCase())) {
      toast({ title: 'Size already added', variant: 'destructive' });
      return;
    }
    setVariants(prev => [...prev, { label: l, stock: '' }]);
    setCustomLabel('');
  };
  const updateVariantStock = (label: string, stock: string) =>
    setVariants(prev => prev.map(v => v.label === label ? { ...v, stock } : v));
  const removeVariant = (label: string) =>
    setVariants(prev => prev.filter(v => v.label !== label));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title || !price || !categoryId || !userId) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (comparePrice && parseInt(price, 10) >= parseInt(comparePrice, 10)) {
      toast({ title: 'Invalid pricing', description: 'Selling Price must be less than MRP', variant: 'destructive' });
      return;
    }

    if (!hasVariants && !inventory) {
      toast({ title: 'Stock required', description: 'Enter stock quantity or enable sizes', variant: 'destructive' });
      return;
    }

    if (hasVariants) {
      if (variants.length === 0) {
        toast({ title: 'Add at least one size', variant: 'destructive' });
        return;
      }
      if (variants.some(v => v.stock === '' || isNaN(parseInt(v.stock, 10)) || parseInt(v.stock, 10) < 0)) {
        toast({ title: 'Enter stock for every size', variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Verify a real Supabase session exists (storage RLS uses auth.uid())
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast({ title: 'Session expired', description: 'Please sign in again to continue', variant: 'destructive' });
        setSubmitting(false);
        logout();
        navigate('/auth');
        return;
      }
      const authUserId = session.user.id;

      // Upload images — folder must match auth.uid() per storage RLS
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop();
        const path = `${authUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('product-images').upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrls.push(publicUrl);
      }

      const totalStock = hasVariants
        ? variants.reduce((s, v) => s + (parseInt(v.stock, 10) || 0), 0)
        : (inventory ? parseInt(inventory) : 0);

      const { data: created, error } = await supabase.from('products').insert({
        seller_id: authUserId,
        title,
        description: description || null,
        price: parseInt(price, 10),
        compare_at_price: comparePrice ? parseInt(comparePrice, 10) : null,
        stock_quantity: totalStock,
        category_id: categoryId,
        images: imageUrls,
      }).select('id').single();

      if (error) throw error;

      if (hasVariants && created) {
        const rows = variants.map((v, i) => ({
          product_id: created.id,
          size_label: v.label,
          stock_quantity: parseInt(v.stock, 10) || 0,
          sort_order: i,
        }));
        const { error: vErr } = await supabase.from('product_variants').insert(rows);
        if (vErr) throw vErr;
      }

      toast({ title: 'Product created!', description: `${title} has been added to your store` });
      navigate(returnTo || '/products');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to create product', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">New Product</h1>
      </div>

      <div className="space-y-4">
        {/* Image upload */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
        {imagePreviews.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative min-w-[100px] w-[100px] h-[100px] rounded-xl overflow-hidden">
                <img src={src} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="min-w-[100px] w-[100px] h-[100px] rounded-xl bg-secondary border-2 border-dashed border-border flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-2xl bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-semibold">Add Photos</span>
          </button>
        )}

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product name"
            className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product..." rows={3}
            className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Selling Price (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0" type="number" step="1"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">MRP</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="0" type="number" step="1"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        {/* Variants toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">This product has sizes</p>
            <p className="text-xs text-muted-foreground">Enable for clothing, footwear, etc.</p>
          </div>
          <button
            type="button"
            onClick={() => setHasVariants(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors border ${hasVariants ? 'bg-primary border-primary' : 'bg-muted border-border'}`}
            aria-pressed={hasVariants}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-md transition-transform ${hasVariants ? 'translate-x-5 bg-primary-foreground' : 'bg-foreground/70'}`} />
          </button>
        </div>

        {!hasVariants ? (
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Stock/Inventory *</label>
            <input value={inventory} onChange={e => setInventory(e.target.value)} placeholder="Qty" type="number"
              className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Size type</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: 'clothing', l: 'Clothing (XS–XXL)' },
                  { v: 'footwear_uk', l: 'Footwear UK (5–11)' },
                  { v: 'custom', l: 'Custom' },
                ] as { v: SizePreset; l: string }[]).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setSizePreset(opt.v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${sizePreset === opt.v ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {sizePreset !== 'custom' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tap sizes you sell</label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_PRESETS[sizePreset].map(s => {
                    const selected = variants.some(v => v.label === s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSizeChip(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold min-w-[44px] ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sizePreset === 'custom' && (
              <div className="flex gap-2">
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. 250ml, Free Size"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomVariant(); } }}
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <button type="button" onClick={addCustomVariant}
                  className="px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            )}

            {variants.length > 0 && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-muted-foreground block">Stock per size *</label>
                {variants.map(v => (
                  <div key={v.label} className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-lg bg-secondary text-foreground font-bold text-sm min-w-[56px] text-center">{v.label}</span>
                    <input type="number" min="0" value={v.stock}
                      onChange={e => updateVariantStock(v.label, e.target.value)}
                      placeholder="Qty"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                    <button type="button" onClick={() => removeVariant(v.label)}
                      className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Category *</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${categoryId === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? 'Creating…' : 'Create Product'}
        </button>
      </div>
    </div>
  );
};

export default CreateProductPage;
