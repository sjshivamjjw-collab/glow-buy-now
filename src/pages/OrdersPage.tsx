import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-600',
  shipped: 'bg-orange-500/10 text-orange-600',
  delivered: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-destructive/10 text-destructive',
  return_initiated: 'bg-amber-500/10 text-amber-600',
  return_completed: 'bg-purple-500/10 text-purple-600',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Order Placed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_initiated: 'Return Initiated',
  return_completed: 'Return Successful',
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { role, userId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      let query = supabase.from('orders').select('*, order_items(*, products(title, images))').order('created_at', { ascending: false });

      if (role === 'seller') {
        query = query.eq('seller_id', userId);
      } else {
        query = query.eq('buyer_id', userId);
      }

      const { data } = await query;
      if (data) setOrders(data);
      setLoading(false);
    };
    load();
  }, [userId, role]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{role === 'seller' ? 'Incoming Orders' : 'My Orders'}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {orders.map(order => {
            const firstItem = order.order_items?.[0];
            const productTitle = firstItem?.products?.title || 'Product';
            const productImg = firstItem?.products?.images?.[0];
            const totalQty = order.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 1;
            return (
              <button key={order.id} onClick={() => navigate(`/order/${order.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left active:scale-[0.98] transition-transform">
                {productImg ? (
                  <img src={productImg} alt={productTitle} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{productTitle}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Qty {totalQty}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[order.status] || ''}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="text-foreground font-bold text-sm">₹{Math.round(order.total_amount)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
