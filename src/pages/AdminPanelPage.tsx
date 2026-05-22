import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, ShoppingBag, Radio, Package, IndianRupee,
  TrendingUp, Eye, Clock, Check, X, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, Search, CalendarIcon, Loader2, ShieldOff,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';


import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  shipped: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  live: 'bg-red-500/10 text-red-500 border-red-500/20',
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAuth();

  const [applications, setApplications] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [livestreams, setLivestreams] = useState<any[]>([]);
  const [sellerIds, setSellerIds] = useState<Set<string>>(new Set());
  const [revokingUser, setRevokingUser] = useState<any>(null);
  const [revoking, setRevoking] = useState(false);
  const [loading, setLoading] = useState(true);

  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [appFilter, setAppFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSellerFilter, setOrderSellerFilter] = useState('all');
  const [orderDateFrom, setOrderDateFrom] = useState<Date | undefined>();
  const [orderDateTo, setOrderDateTo] = useState<Date | undefined>();

  useEffect(() => {
    const load = async () => {
      const [appsRes, ordersRes, profilesRes, prodCountRes, cancelRes, returnRes, streamsRes, sellersRes] = await Promise.all([
        supabase.from('seller_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, products(title, images, seller_id)), profiles:seller_id(name, phone)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, phone, created_at'),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('cancellation_requests').select('*, orders(id, total_amount, status, buyer_id, seller_id), profiles:requested_by(name, phone)').order('created_at', { ascending: false }),
        supabase.from('return_requests').select('*, orders(id, total_amount, status, buyer_id, seller_id), profiles:requested_by(name, phone)').order('created_at', { ascending: false }),
        supabase.from('livestreams').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id').eq('role', 'creator'),
      ]);

      if (appsRes.data) setApplications(appsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (profilesRes.data) setUsers(profilesRes.data);
      if (sellersRes.data) setSellerIds(new Set(sellersRes.data.map((r: any) => r.user_id)));
      setProductCount(prodCountRes.count || 0);
      if (cancelRes.data) setCancellationRequests(cancelRes.data);
      if (returnRes.data) setReturnRequests(returnRes.data);
      if (streamsRes.data) {
        const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        setLivestreams(streamsRes.data.map((s: any) => ({ ...s, profiles: profilesById.get(s.seller_id) })));
      }
      setLoading(false);
    };
    load();
  }, []);


  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const pendingCancellations = cancellationRequests.filter(c => c.status === 'pending').length;
  const pendingReturns = returnRequests.filter(r => r.status === 'pending').length;
  const liveNow = livestreams.filter(s => s.status === 'live').length;


  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (orderSellerFilter !== 'all' && order.seller_id !== orderSellerFilter) return false;
      const orderDate = new Date(order.created_at);
      if (orderDateFrom && orderDate < orderDateFrom) return false;
      if (orderDateTo) {
        const end = new Date(orderDateTo);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });
  }, [orders, orderSellerFilter, orderDateFrom, orderDateTo]);

  const uniqueSellers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => {
      if (o.profiles?.name) map.set(o.seller_id, o.profiles.name);
    });
    return Array.from(map.entries());
  }, [orders]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('seller_applications').update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
      toast({ title: 'Application Approved ✅', description: 'Seller access granted.' });
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('seller_applications').update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejection_reason: rejectionReason } : a));
      setRejectingId(null);
      setRejectionReason('');
      toast({ title: 'Application Rejected' });
    }
  };

  const handleCancellationDecision = async (requestId: string, decision: 'approved' | 'rejected', orderId: string) => {
    const { error } = await supabase.from('cancellation_requests').update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId);

    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
      return;
    }

    if (decision === 'approved') {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    }

    setCancellationRequests(prev => prev.map(c => c.id === requestId ? { ...c, status: decision } : c));
    toast({ title: decision === 'approved' ? 'Cancellation approved — order cancelled' : 'Cancellation rejected' });
  };

  const handleReturnDecision = async (requestId: string, decision: 'approved' | 'rejected', orderId: string) => {
    const { error } = await supabase.from('return_requests').update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId);

    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
      return;
    }

    if (decision === 'approved') {
      await supabase.from('orders').update({ status: 'cancelled' as any }).eq('id', orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    }

    setReturnRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: decision } : r));
    toast({ title: decision === 'approved' ? 'Return approved — order cancelled' : 'Return rejected' });
  };

  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);

  const handleRevokeSeller = async () => {
    if (!revokingUser) return;
    setRevoking(true);
    const { error } = await supabase.rpc('admin_revoke_seller' as any, { _user_id: revokingUser.id });
    setRevoking(false);
    if (error) {
      toast({ title: 'Failed to revoke', description: error.message, variant: 'destructive' });
      return;
    }
    setSellerIds(prev => {
      const next = new Set(prev);
      next.delete(revokingUser.id);
      return next;
    });
    setApplications(prev => prev.map(a =>
      a.user_id === revokingUser.id && a.status === 'approved'
        ? { ...a, status: 'rejected', rejection_reason: a.rejection_reason || 'Seller access revoked by admin' }
        : a
    ));
    toast({ title: 'Seller access revoked', description: `${revokingUser.name || revokingUser.phone} is no longer a seller.` });
    setRevokingUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Platform management</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500' },
          { label: 'Live Now', value: liveNow, icon: Radio, color: 'text-red-500' },
          { label: 'Total Products', value: productCount, icon: Package, color: 'text-orange-500' },
          { label: 'Total Orders', value: orders.length, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-emerald-500' },
          { label: 'Pending Apps', value: pendingApps, icon: AlertCircle, color: 'text-yellow-500' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {pendingApps > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-5">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-foreground font-medium">{pendingApps} seller application{pendingApps > 1 ? 's' : ''} pending review</p>
        </div>
      )}

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="w-full grid grid-cols-6 mb-4">
          <TabsTrigger value="applications" className="text-xs px-1">Apps</TabsTrigger>
          <TabsTrigger value="users" className="text-xs px-1">Users</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs px-1">Orders</TabsTrigger>
          <TabsTrigger value="cancellations" className="text-xs px-1 relative">
            Cancel
            {pendingCancellations > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {pendingCancellations}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs px-1 relative">
            Returns
            {pendingReturns > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingReturns}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="streams" className="text-xs px-1">Streams</TabsTrigger>
        </TabsList>


        <TabsContent value="applications">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => setAppFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  appFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border'
                }`}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && ` (${pendingApps})`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredApps.length === 0 && <p className="text-center text-muted-foreground py-8">No applications found.</p>}
            {filteredApps.map(app => {
              const expanded = expandedAppId === app.id;
              return (
                <div key={app.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  <button onClick={() => setExpandedAppId(expanded ? null : app.id)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm">{app.store_name}</h3>
                      <p className="text-xs text-muted-foreground">{app.category}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge[app.status]}`}>
                      {app.status.toUpperCase()}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                      <p className="text-sm text-foreground">{app.description}</p>
                      {app.gst_tax_id && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">GST / Tax ID</p>
                          <p className="text-sm text-foreground font-mono">{app.gst_tax_id}</p>
                        </div>
                      )}
                      {app.social_media_links && Array.isArray(app.social_media_links) && app.social_media_links.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Social</p>
                          {(app.social_media_links as string[]).map((l: string, i: number) => (
                            <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                              {l} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                      {app.rejection_reason && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-0.5">Rejection Reason</p>
                          <p className="text-sm text-foreground">{app.rejection_reason}</p>
                        </div>
                      )}
                      {app.status === 'pending' && (
                        <div className="pt-2 space-y-3">
                          {rejectingId === app.id ? (
                            <div className="space-y-2">
                              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection…" rows={2}
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
                              <div className="flex gap-2">
                                <button onClick={() => handleReject(app.id)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm">Confirm Reject</button>
                                <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(app.id)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">
                                <Check className="w-4 h-4" /> Approve
                              </button>
                              <button onClick={() => setRejectingId(app.id)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm border border-destructive/20">
                                <X className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-3">
            {users
              .filter(u => (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.phone || '').includes(searchQuery))
              .map(user => {
                const isSeller = sellerIds.has(user.id);
                return (
                <div key={user.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(user.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground text-sm truncate">{user.name || 'No name'}</p>
                      {isSeller && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">SELLER</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.phone || 'No phone'}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  {isSeller && (
                    <button
                      onClick={() => setRevokingUser(user)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-semibold"
                    >
                      <ShieldOff className="w-3 h-3" /> Revoke
                    </button>
                  )}
                </div>
                );
              })}
          </div>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders">
          <div className="space-y-3 mb-4">
            <Select value={orderSellerFilter} onValueChange={setOrderSellerFilter}>
              <SelectTrigger className="w-full rounded-xl bg-card border-border text-sm">
                <SelectValue placeholder="Filter by seller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellers</SelectItem>
                {uniqueSellers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left text-sm rounded-xl", !orderDateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDateFrom ? format(orderDateFrom, "dd MMM yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={orderDateFrom} onSelect={setOrderDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left text-sm rounded-xl", !orderDateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDateTo ? format(orderDateTo, "dd MMM yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={orderDateTo} onSelect={setOrderDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {(orderSellerFilter !== 'all' || orderDateFrom || orderDateTo) && (
              <button onClick={() => { setOrderSellerFilter('all'); setOrderDateFrom(undefined); setOrderDateTo(undefined); }}
                className="text-xs text-primary font-semibold">Clear filters</button>
            )}
          </div>

          <div className="space-y-3">
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders match the filters.</p>}
            {filteredOrders.map(order => {
              const firstItem = order.order_items?.[0];
              const productTitle = firstItem?.products?.title || 'Product';
              const productImg = firstItem?.products?.images?.[0];
              const sellerName = order.profiles?.name || 'Unknown';
              return (
                <div key={order.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  {productImg ? (
                    <img src={productImg} alt={productTitle} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{productTitle}</p>
                    <p className="text-xs text-muted-foreground">Seller: {sellerName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-sm">₹{Math.round(order.total_amount)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge[order.status]}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* CANCELLATIONS */}
        <TabsContent value="cancellations">
          <div className="space-y-3">
            {cancellationRequests.length === 0 && <p className="text-center text-muted-foreground py-8">No cancellation requests.</p>}
            {cancellationRequests.map(req => {
              const sellerName = req.profiles?.name || req.profiles?.phone || 'Seller';
              const orderAmount = req.orders?.total_amount ? `₹${Math.round(req.orders.total_amount)}` : '';
              return (
                <div key={req.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">Order #{req.order_id?.slice(-4)}</p>
                      <p className="text-xs text-muted-foreground">By: {sellerName} {orderAmount && `· ${orderAmount}`}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${
                      req.status === 'pending' ? statusBadge.pending :
                      req.status === 'approved' ? statusBadge.approved :
                      statusBadge.rejected
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-xl">{req.reason || 'No reason provided'}</p>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleCancellationDecision(req.id, 'approved', req.order_id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleCancellationDecision(req.id, 'rejected', req.order_id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm border border-destructive/20">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* RETURNS */}
        <TabsContent value="returns">
          <div className="space-y-3">
            {returnRequests.length === 0 && <p className="text-center text-muted-foreground py-8">No return requests.</p>}
            {returnRequests.map(req => {
              const requesterName = req.profiles?.name || req.profiles?.phone || 'Buyer';
              const orderAmount = req.orders?.total_amount ? `₹${Math.round(req.orders.total_amount)}` : '';
              return (
                <div key={req.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">Order #{req.order_id?.slice(-4)}</p>
                      <p className="text-xs text-muted-foreground">By: {requesterName} {orderAmount && `· ${orderAmount}`}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${
                      req.status === 'pending' ? statusBadge.pending :
                      req.status === 'approved' ? statusBadge.approved :
                      statusBadge.rejected
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-xl">{req.reason || 'No reason provided'}</p>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleReturnDecision(req.id, 'approved', req.order_id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReturnDecision(req.id, 'rejected', req.order_id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm border border-destructive/20">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* STREAMS */}


        <TabsContent value="streams">
          <div className="space-y-3">
            {livestreams.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No streams yet</p>
            )}
            {livestreams.map(stream => (
              <div key={stream.id} onClick={() => stream.status === 'live' && navigate(`/stream/${stream.id}`)}
                className={`flex items-center gap-3 p-4 rounded-2xl bg-card border border-border ${stream.status === 'live' ? 'cursor-pointer active:bg-secondary' : ''}`}>
                {stream.thumbnail_url ? (
                  <img src={stream.thumbnail_url} alt={stream.title} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                    <Radio className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{stream.title}</p>
                  <p className="text-xs text-muted-foreground">{stream.profiles?.name || stream.profiles?.phone || 'Seller'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {stream.status === 'live' && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Eye className="w-3 h-3" /> {stream.viewer_count}</span>
                    )}
                    {stream.scheduled_at && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="w-3 h-3" /> {new Date(stream.scheduled_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge[stream.status]}`}>
                  {stream.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>




      <AlertDialog open={!!revokingUser} onOpenChange={(open) => !open && !revoking && setRevokingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke seller access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove seller permissions for <span className="font-semibold text-foreground">{revokingUser?.name || revokingUser?.phone}</span>, deactivate all their products, and end their livestreams. Existing order history is preserved. They can re-apply later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoking}
              onClick={(e) => { e.preventDefault(); handleRevokeSeller(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revoking…' : 'Revoke seller'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanelPage;
