import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Radio, Package, IndianRupee, Eye, Plus, TrendingUp, CalendarIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SellerDashboard = () => {
  const { userName, userId } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      // Count products
      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', userId);
      setProductCount(pCount || 0);

      // Get orders
      let orderQuery = supabase.from('orders').select('*, order_items(*, products(title, images))').eq('seller_id', userId);
      if (dateRange.from) orderQuery = orderQuery.gte('created_at', dateRange.from.toISOString());
      if (dateRange.to) orderQuery = orderQuery.lte('created_at', dateRange.to.toISOString());

      const { data: orders } = await orderQuery.order('created_at', { ascending: false });
      
      if (orders) {
        setOrderCount(orders.length);
        const revenueOrders = orders.filter(
          (o) => !['cancelled', 'returned', 'refunded'].includes(String(o.status).toLowerCase())
        );
        setRevenue(revenueOrders.reduce((sum, o) => sum + Number(o.total_amount), 0));
        setRecentOrders(orders.slice(0, 3));
      }
      setLoading(false);
    };

    loadData();
  }, [userId, dateRange]);

  const stats = [
    { icon: IndianRupee, label: 'Revenue', value: `₹${revenue}`, color: 'bg-success/10 text-success' },
    { icon: Package, label: 'Products', value: productCount.toString(), color: 'bg-primary/10 text-primary' },
    { icon: Eye, label: 'Views', value: '—', color: 'bg-accent/10 text-accent' },
    { icon: TrendingUp, label: 'Orders', value: orderCount.toString(), color: 'bg-warning/10 text-warning' },
  ];

  const dateLabel = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : 'All time';

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-sm">Dashboard</p>
          <h1 className="text-2xl font-extrabold text-foreground">{userName?.split(' ')[0] || 'Seller'}'s Store</h1>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left font-normal rounded-xl', !dateRange.from && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={1} disabled={(date) => date > new Date()} className={cn('p-3 pointer-events-auto')} />
            {dateRange.from && (
              <div className="px-3 pb-3">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setDateRange({ from: undefined, to: undefined })}>
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Go Live CTA */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => navigate('/go-live')}
        className="w-full p-5 rounded-2xl bg-gradient-to-r from-primary to-accent mb-6 text-left active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Radio className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-primary-foreground font-bold text-lg">Go Live Now</h3>
            <p className="text-primary-foreground/80 text-sm">Start streaming to your audience</p>
          </div>
        </div>
      </motion.button>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="p-4 rounded-2xl bg-card border border-border">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => navigate('/products/new')} className="flex-1 flex items-center gap-2 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform">
          <Plus className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">Add Product</span>
        </button>
        <button onClick={() => navigate('/orders')} className="flex-1 flex items-center gap-2 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform">
          <Package className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground text-sm">View Orders</span>
        </button>
      </div>

      {/* Recent orders */}
      <h2 className="text-lg font-bold text-foreground mb-3">Recent Orders</h2>
      <div className="space-y-2 pb-24">
        {recentOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No orders yet</p>
        ) : (
          recentOrders.map(order => {
            const firstItem = order.order_items?.[0];
            const productTitle = firstItem?.products?.title || 'Product';
            const productImg = firstItem?.products?.images?.[0];
            return (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                {productImg ? (
                  <img src={productImg} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{productTitle}</p>
                  <p className="text-muted-foreground text-xs capitalize">{order.status}</p>
                </div>
                <span className="font-bold text-foreground text-sm">₹{Math.round(order.total_amount)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
