import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Package, Loader2, Trash2, X, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Variant { id: string; size_label: string; stock_quantity: number; sort_order: number; }
interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  variants?: Variant[];
}

const ProductsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', compare_at_price: '', stock_quantity: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: prods, error } = await supabase
        .from('products')
        .select('id, title, description, price, compare_at_price, stock_quantity, images, is_active')
        .eq('seller_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) console.error(error);
      const list = prods || [];
      if (list.length > 0) {
        const ids = list.map(p => p.id);
        const { data: vars } = await supabase
          .from('product_variants')
          .select('id, product_id, size_label, stock_quantity, sort_order')
          .in('product_id', ids)
          .order('sort_order', { ascending: true });
        const byProduct = new Map<string, Variant[]>();
        (vars || []).forEach((v: any) => {
          const arr = byProduct.get(v.product_id) || [];
          arr.push({ id: v.id, size_label: v.size_label, stock_quantity: v.stock_quantity, sort_order: v.sort_order });
          byProduct.set(v.product_id, arr);
        });
        setProducts(list.map(p => ({ ...p, variants: byProduct.get(p.id) || [] })));
      } else {
        setProducts([]);
      }
      setLoading(false);
    })();
  }, [userId]);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !current }).eq('id', id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
      toast({ title: !current ? 'Product activated' : 'Product deactivated' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    // Try hard delete first
    const { error } = await supabase.from('products').delete().eq('id', confirmDeleteId);

    if (error && error.code === '23503') {
      // Product is referenced by past orders — soft delete (archive) instead
      const { error: softErr } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', confirmDeleteId);
      setDeleting(false);
      if (softErr) {
        toast({ title: 'Error deleting product', description: softErr.message, variant: 'destructive' });
        return;
      }
      setProducts(prev => prev.filter(p => p.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast({ title: 'Product archived', description: 'It was hidden from the store. Past orders kept their record.' });
      return;
    }

    setDeleting(false);
    if (error) {
      toast({ title: 'Error deleting product', description: error.message, variant: 'destructive' });
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    toast({ title: 'Product deleted' });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description || '',
      price: String(Math.round(product.price)),
      compare_at_price: product.compare_at_price ? String(Math.round(product.compare_at_price)) : '',
      stock_quantity: String(product.stock_quantity),
    });
    const map: Record<string, string> = {};
    (product.variants || []).forEach(v => { map[v.id] = String(v.stock_quantity); });
    setVariantStocks(map);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editForm.title || !editForm.price) {
      toast({ title: 'Title and price are required', variant: 'destructive' });
      return;
    }
    if (editForm.compare_at_price && parseInt(editForm.price, 10) >= parseInt(editForm.compare_at_price, 10)) {
      toast({ title: 'Invalid pricing', description: 'Selling Price must be less than MRP', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const hasVars = (editingProduct.variants?.length || 0) > 0;
    const newVariantStocks: Variant[] = [];
    let totalStock = parseInt(editForm.stock_quantity, 10) || 0;
    if (hasVars) {
      totalStock = 0;
      for (const v of editingProduct.variants!) {
        const n = parseInt(variantStocks[v.id] ?? '0', 10) || 0;
        newVariantStocks.push({ ...v, stock_quantity: n });
        totalStock += n;
      }
    }
    const updates = {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      price: parseInt(editForm.price, 10),
      compare_at_price: editForm.compare_at_price ? parseInt(editForm.compare_at_price, 10) : null,
      stock_quantity: totalStock,
    };
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id);
    if (!error && hasVars) {
      // Update each variant's stock individually
      await Promise.all(newVariantStocks.map(v =>
        supabase.from('product_variants').update({ stock_quantity: v.stock_quantity }).eq('id', v.id)
      ));
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Error updating product', variant: 'destructive' });
    } else {
      setProducts(prev => prev.map(p => p.id === editingProduct.id
        ? { ...p, ...updates, variants: hasVars ? newVariantStocks : p.variants }
        : p));
      setEditingProduct(null);
      toast({ title: 'Product updated' });
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">My Products</h1>
        </div>
        <button onClick={() => navigate('/products/new')} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No products yet</p>
          <button onClick={() => navigate('/products/new')} className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {products.map(product => (
            <div key={product.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                <p className="text-primary font-extrabold">₹{Math.round(product.price)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-xs">
                    {product.variants && product.variants.length > 0
                      ? `${product.variants.reduce((s, v) => s + v.stock_quantity, 0)} in stock · ${product.variants.length} sizes`
                      : `${product.stock_quantity} in stock`}
                  </p>
                  {!product.is_active && <span className="text-xs text-warning font-semibold">Inactive</span>}
                </div>
                {product.variants && product.variants.length > 0 && (
                  <p className="text-muted-foreground/80 text-[10px] truncate mt-0.5">
                    {product.variants.map(v => `${v.size_label}:${v.stock_quantity}`).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActive(product.id, product.is_active)}
                  className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
                  title={product.is_active ? 'Deactivate' : 'Activate'}>
                  {product.is_active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(product)}
                  className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
                  title="Edit">
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => setConfirmDeleteId(product.id)}
                  className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
                  title="Delete">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDeleteId(null)}>
          <div className="w-full max-w-sm bg-background rounded-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">Delete this product?</h2>
            <p className="text-sm text-muted-foreground">This cannot be undone. The product will be permanently removed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setEditingProduct(null)}>
          <div
            className="w-full max-w-lg bg-background rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title *</label>
              <input
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="1"
                  value={editForm.price}
                  onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">MRP</label>
                <input
                  type="number"
                  step="1"
                  value={editForm.compare_at_price}
                  onChange={e => setEditForm(f => ({ ...f, compare_at_price: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
            </div>

            {editingProduct.variants && editingProduct.variants.length > 0 ? (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Stock per size</label>
                <div className="space-y-2">
                  {editingProduct.variants.map(v => (
                    <div key={v.id} className="flex items-center gap-2">
                      <span className="px-3 py-2 rounded-lg bg-secondary text-foreground font-bold text-sm min-w-[56px] text-center">{v.size_label}</span>
                      <input
                        type="number"
                        min="0"
                        value={variantStocks[v.id] ?? ''}
                        onChange={e => setVariantStocks(s => ({ ...s, [v.id]: e.target.value }))}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Stock Quantity</label>
                <input
                  type="number"
                  step="1"
                  value={editForm.stock_quantity}
                  onChange={e => setEditForm(f => ({ ...f, stock_quantity: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
            )}

            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;