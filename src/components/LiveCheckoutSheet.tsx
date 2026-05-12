import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, MapPin, Loader2, Plus, Star, Banknote, CreditCard, X, Play } from 'lucide-react';
import type { Address as SavedAddress } from '@/pages/AddressesPage';

declare global {
  interface Window { Razorpay: any }
}

interface CheckoutProduct {
  id: string;
  title: string;
  price: number;
  images?: string[];
}

interface Props {
  open: boolean;
  product: CheckoutProduct | null;
  onClose: () => void;
  /** Called when user taps "Continue watching" after successful order. */
  onContinueWatching?: () => void;
}

const LiveCheckoutSheet = ({ open, product, onClose, onContinueWatching }: Props) => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'review' | 'confirmed'>('review');
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [address, setAddress] = useState({ name: '', street: '', city: '', state: '', zip: '', phone: '' });

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [codMax, setCodMax] = useState<number>(5000);

  const [variants, setVariants] = useState<{ id: string; size_label: string; stock_quantity: number }[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(true);

  // Reset when reopening for a new product
  useEffect(() => {
    if (open) {
      setStep('review');
      setQuantity(1);
      setSelectedVariantId(null);
    }
  }, [open, product?.id]);

  useEffect(() => {
    if (!open || !userId) return;
    setLoadingAddresses(true);
    supabase
      .from('addresses').select('*').eq('user_id', userId)
      .order('is_default', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as SavedAddress[]) || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          setSelectedAddressId(list.find(a => a.is_default)?.id || list[0].id);
          setUseNewAddress(false);
        } else {
          setUseNewAddress(true);
        }
        setLoadingAddresses(false);
      });

    supabase.from('platform_settings').select('value').eq('key', 'cod_max_amount').maybeSingle()
      .then(({ data }) => {
        const v = data?.value;
        const n = typeof v === 'number' ? v : Number(v);
        if (!isNaN(n) && n > 0) setCodMax(n);
      });
  }, [open, userId]);

  useEffect(() => {
    if (!open || !product?.id) return;
    setLoadingVariants(true);
    supabase
      .from('product_variants')
      .select('id, size_label, stock_quantity')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setVariants(data || []);
        setLoadingVariants(false);
      });
  }, [open, product?.id]);

  if (!product) return null;

  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find(v => v.id === selectedVariantId) || null;
  const variantMaxQty = selectedVariant?.stock_quantity ?? Infinity;
  const total = Math.round(product.price * quantity);
  const codAllowed = total <= codMax;

  const buildShippingAddress = () => {
    if (!useNewAddress && selectedAddressId) {
      const sel = savedAddresses.find(a => a.id === selectedAddressId);
      if (!sel) return null;
      return {
        name: sel.name, street: sel.street, city: sel.city,
        state: sel.state || '', zip: sel.zip || '', phone: sel.phone || '', country: sel.country,
      };
    }
    if (!address.name || !address.street || !address.city) return null;
    return { ...address, country: 'India' };
  };

  const reserveStockAndCreateOrder = async (shipping: any, method: 'razorpay' | 'cod') => {
    const { data: productData } = await supabase
      .from('products').select('seller_id, stock_quantity, is_active').eq('id', product.id).maybeSingle();
    if (!productData?.seller_id || !productData.is_active) {
      toast({ title: 'Product not available', variant: 'destructive' }); return null;
    }

    if (hasVariants) {
      if (!selectedVariant) { toast({ title: 'Please select a size', variant: 'destructive' }); return null; }
      const { data: vData } = await supabase
        .from('product_variants').select('stock_quantity').eq('id', selectedVariant.id).maybeSingle();
      const vStock = vData?.stock_quantity ?? 0;
      if (vStock < quantity) {
        toast({ title: vStock === 0 ? 'Out of stock' : 'Not enough stock', variant: 'destructive' });
        return null;
      }
      const { data: reserved } = await supabase
        .rpc('decrement_variant_stock', { _variant_id: selectedVariant.id, _qty: quantity });
      if (reserved !== true) { toast({ title: 'Out of stock', variant: 'destructive' }); return null; }
    } else {
      if ((productData.stock_quantity ?? 0) < quantity) {
        toast({ title: 'Not enough stock', variant: 'destructive' }); return null;
      }
      const { data: reserved } = await supabase
        .rpc('decrement_product_stock', { _product_id: product.id, _qty: quantity });
      if (reserved !== true) { toast({ title: 'Out of stock', variant: 'destructive' }); return null; }
    }

    const restoreStock = async () => {
      if (hasVariants && selectedVariant) {
        const { data: cur } = await supabase.from('product_variants').select('stock_quantity').eq('id', selectedVariant.id).maybeSingle();
        if (cur) await supabase.from('product_variants').update({ stock_quantity: (cur.stock_quantity ?? 0) + quantity }).eq('id', selectedVariant.id);
      } else {
        const { data: cur } = await supabase.from('products').select('stock_quantity').eq('id', product.id).maybeSingle();
        if (cur) await supabase.from('products').update({ stock_quantity: (cur.stock_quantity ?? 0) + quantity }).eq('id', product.id);
      }
    };

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      buyer_id: userId!, seller_id: productData.seller_id, total_amount: total,
      status: 'confirmed', shipping_address: shipping,
      payment_method: method, payment_status: method === 'cod' ? 'cod_pending' : 'pending',
    }).select('id').single();

    if (orderError || !order) { await restoreStock(); toast({ title: 'Failed to place order', variant: 'destructive' }); return null; }

    await supabase.from('order_items').insert({
      order_id: order.id, product_id: product.id, quantity, unit_price: product.price,
      variant_id: selectedVariant?.id ?? null, variant_label: selectedVariant?.size_label ?? null,
    });

    if (useNewAddress && userId) {
      try {
        const { data: existing } = await supabase.from('addresses').select('id').eq('user_id', userId).limit(1);
        const isFirst = !existing || existing.length === 0;
        await supabase.from('addresses').insert({
          user_id: userId, name: shipping.name, street: shipping.street, city: shipping.city,
          state: shipping.state || null, zip: shipping.zip || null, phone: shipping.phone || null,
          country: shipping.country || 'India', is_default: isFirst,
        });
      } catch (e) { console.error(e); }
    }

    return { id: order.id as string, restoreStock };
  };

  const handleConfirm = async () => {
    if (!userId) { toast({ title: 'Please sign in first', variant: 'destructive' }); return; }
    const shipping = buildShippingAddress();
    if (!shipping) { toast({ title: 'Please add a shipping address', variant: 'destructive' }); return; }
    if (paymentMethod === 'cod' && !codAllowed) {
      toast({ title: 'COD not available', description: `COD only for orders up to ₹${codMax.toLocaleString('en-IN')}.`, variant: 'destructive' });
      return;
    }
    setPlacing(true);

    if (paymentMethod === 'cod') {
      const result = await reserveStockAndCreateOrder(shipping, 'cod');
      setPlacing(false);
      if (result) setStep('confirmed');
      return;
    }

    if (typeof window.Razorpay !== 'function') {
      toast({ title: 'Payment unavailable', description: 'Please refresh and try again.', variant: 'destructive' });
      setPlacing(false); return;
    }

    const { data: rzpData, error: rzpErr } = await supabase.functions.invoke('create-razorpay-order', { body: { amount: total } });
    if (rzpErr || !rzpData?.razorpay_order_id) {
      const msg = (rzpErr as any)?.context?.body || rzpData?.error || 'Online payment is not configured. Try COD.';
      toast({ title: 'Payment unavailable', description: typeof msg === 'string' ? msg : 'Try Cash on Delivery.', variant: 'destructive' });
      setPlacing(false); return;
    }

    const result = await reserveStockAndCreateOrder(shipping, 'razorpay');
    if (!result) { setPlacing(false); return; }
    const orderId = result.id;
    await supabase.from('orders').update({ razorpay_order_id: rzpData.razorpay_order_id }).eq('id', orderId);

    const rzp = new window.Razorpay({
      key: rzpData.key_id, amount: rzpData.amount, currency: rzpData.currency,
      order_id: rzpData.razorpay_order_id, name: 'Ripple', description: product.title,
      prefill: { name: shipping.name, contact: shipping.phone || '' },
      theme: { color: '#000000' },
      handler: async (resp: any) => {
        const { error } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: {
            order_id: orderId,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          },
        });
        setPlacing(false);
        if (error) {
          toast({ title: 'Payment verification failed', description: 'Contact support if amount was deducted.', variant: 'destructive' });
          return;
        }
        setStep('confirmed');
      },
      modal: {
        ondismiss: async () => {
          await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId);
          await result.restoreStock();
          setPlacing(false);
          toast({ title: 'Payment cancelled', variant: 'destructive' });
        },
      },
    });
    rzp.open();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/60 z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28 }}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-3xl z-[61] max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
                <h2 className="font-bold text-foreground">{step === 'confirmed' ? 'Order Confirmed' : 'Quick Checkout'}</h2>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {step === 'confirmed' ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-10 h-10 text-success-foreground" />
                </motion.div>
                <h1 className="text-2xl font-extrabold text-foreground">Order Confirmed!</h1>
                <p className="text-muted-foreground text-center">
                  {paymentMethod === 'cod'
                    ? `Your COD order for ${product.title} is placed. Pay ₹${total} on delivery.`
                    : `Your order for ${product.title} has been placed and paid.`}
                </p>
                <div className="w-full space-y-2 mt-2">
                  {onContinueWatching && (
                    <button
                      onClick={() => { onContinueWatching(); onClose(); }}
                      className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" /> Continue watching live
                    </button>
                  )}
                  <button onClick={() => { onClose(); navigate('/orders'); }} className="w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold">
                    View Orders
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
                  {/* Product */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                    {product.images?.[0] && <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-xl object-cover" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{product.title}</h3>
                      <p className="text-primary font-extrabold text-lg mt-1">₹{Math.round(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-secondary rounded-xl">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-foreground font-bold">−</button>
                      <span className="text-foreground font-bold">{quantity}</span>
                      <button onClick={() => setQuantity(q => Math.min(variantMaxQty, q + 1))} disabled={quantity >= variantMaxQty}
                        className="px-3 py-2 text-foreground font-bold disabled:opacity-40">+</button>
                    </div>
                  </div>

                  {/* Variants */}
                  {!loadingVariants && hasVariants && (
                    <div className="p-4 rounded-2xl bg-card border border-border">
                      <h3 className="font-bold text-foreground mb-3">Select Size</h3>
                      <div className="flex flex-wrap gap-2">
                        {variants.map(v => {
                          const out = v.stock_quantity <= 0;
                          const selected = selectedVariantId === v.id;
                          return (
                            <button key={v.id} type="button" disabled={out}
                              onClick={() => { setSelectedVariantId(v.id); setQuantity(1); }}
                              className={`px-4 py-2.5 rounded-lg text-sm font-bold min-w-[52px]
                                ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                                ${out ? 'opacity-40 line-through cursor-not-allowed' : ''}`}>
                              {v.size_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /><h3 className="font-bold text-foreground">Shipping Address</h3></div>
                      <button onClick={() => { onClose(); navigate('/addresses'); }} className="text-xs font-semibold text-primary">Manage</button>
                    </div>

                    {loadingAddresses ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <>
                        {savedAddresses.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {savedAddresses.map(addr => {
                              const selected = !useNewAddress && selectedAddressId === addr.id;
                              return (
                                <button key={addr.id} onClick={() => { setUseNewAddress(false); setSelectedAddressId(addr.id); }}
                                  className={`w-full text-left p-3 rounded-xl border ${selected ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}>
                                  <div className="flex items-start gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {addr.label && <span className="text-xs font-bold bg-secondary px-1.5 py-0.5 rounded">{addr.label}</span>}
                                        {addr.is_default && <span className="text-xs font-bold text-primary flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" /> Default</span>}
                                      </div>
                                      <p className="font-semibold text-foreground text-sm">{addr.name}</p>
                                      <p className="text-muted-foreground text-xs leading-snug">{addr.street}, {addr.city}{addr.state ? `, ${addr.state}` : ''}{addr.zip ? ` ${addr.zip}` : ''}</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {!useNewAddress ? (
                          <button onClick={() => setUseNewAddress(true)} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-1">
                            <Plus className="w-4 h-4" /> Use a new address
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {savedAddresses.length > 0 && (
                              <button onClick={() => setUseNewAddress(false)} className="text-xs font-semibold text-muted-foreground">← Back to saved</button>
                            )}
                            <input value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} placeholder="Full Name *" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                            <input value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} placeholder="Phone *" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                            <input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Street Address *" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                            <div className="grid grid-cols-3 gap-2">
                              <input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="City *" className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                              <input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="State" className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                              <input value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))} placeholder="PIN" className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Payment */}
                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <h3 className="font-bold text-foreground mb-3">Payment Method</h3>
                    <div className="space-y-2">
                      <button onClick={() => setPaymentMethod('razorpay')}
                        className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 ${paymentMethod === 'razorpay' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'razorpay' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                        <CreditCard className="w-5 h-5 text-foreground" />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">Pay Online</p>
                          <p className="text-muted-foreground text-xs">UPI, Cards, Netbanking</p>
                        </div>
                      </button>
                      <button onClick={() => codAllowed && setPaymentMethod('cod')} disabled={!codAllowed}
                        className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'} ${!codAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'cod' ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                        <Banknote className="w-5 h-5 text-foreground" />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">Cash on Delivery</p>
                          <p className="text-muted-foreground text-xs">{codAllowed ? 'Pay in cash on delivery' : `Up to ₹${codMax.toLocaleString('en-IN')}`}</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground font-semibold">₹{Math.round(product.price * quantity)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="text-success font-semibold">Free</span></div>
                    <div className="border-t border-border pt-2 flex justify-between"><span className="text-foreground font-bold">Total</span><span className="text-foreground font-extrabold text-lg">₹{total}</span></div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-border shrink-0">
                  <button onClick={handleConfirm} disabled={placing || (hasVariants && !selectedVariant)}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    {placing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : (hasVariants && !selectedVariant ? 'Select a size' : (paymentMethod === 'cod' ? `Place COD Order · ₹${total}` : `Pay ₹${total}`))}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LiveCheckoutSheet;
