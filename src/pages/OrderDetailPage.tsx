import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, ShoppingBag, Loader2, XCircle, RotateCcw } from 'lucide-react';

const steps = [
  { status: 'confirmed', label: 'Order Placed', icon: CheckCircle, color: 'bg-blue-500', text: 'text-blue-500' },
  { status: 'shipped', label: 'Shipped', icon: Truck, color: 'bg-orange-500', text: 'text-orange-500' },
  { status: 'delivered', label: 'Delivered', icon: Package, color: 'bg-green-500', text: 'text-green-500' },
];

const returnSteps = [
  { status: 'return_initiated', label: 'Return Initiated', icon: RotateCcw, color: 'bg-amber-500', text: 'text-amber-500' },
  { status: 'return_completed', label: 'Return Successful', icon: CheckCircle, color: 'bg-green-500', text: 'text-green-500' },
];

const statusIndex: Record<string, number> = { confirmed: 0, shipped: 1, delivered: 2, cancelled: -1, return_initiated: -2, return_completed: -2 };

const nextStatus: Record<string, string> = {
  confirmed: 'shipped',
  shipped: 'delivered',
};

const nextLabel: Record<string, string> = {
  confirmed: 'Mark as Shipped',
  shipped: 'Mark as Delivered',
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, role } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationRequest, setCancellationRequest] = useState<any>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnRequest, setReturnRequest] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [orderRes, cancelRes, returnRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*, products(title, images, price))')
          .eq('id', id)
          .single(),
        supabase
          .from('cancellation_requests')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('return_requests')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (orderRes.data) setOrder(orderRes.data);
      if (orderRes.error) console.error(orderRes.error);
      if (cancelRes.data && cancelRes.data.length > 0) setCancellationRequest(cancelRes.data[0]);
      if (returnRes.data && returnRes.data.length > 0) setReturnRequest(returnRes.data[0]);
      setLoading(false);
    };
    load();
  }, [id]);

  const isSeller = (role === 'seller' || role === 'admin') && order?.seller_id === userId;
  const isBuyer = order?.buyer_id === userId && !isSeller;
  const currentStep = statusIndex[order?.status] ?? 0;
  const canAdvance = isSeller && order?.status in nextStatus;

  const canReturn = isBuyer && order?.status === 'delivered' && !returnRequest;

  const canBuyerCancel = isBuyer && !cancellationRequest && order?.status !== 'cancelled' && order?.status !== 'delivered';

  const handleUpdateStatus = async () => {
    if (!order || !canAdvance) return;
    const newStatus = nextStatus[order.status];
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus as any })
      .eq('id', order.id);
    setUpdating(false);
    if (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } else {
      setOrder((prev: any) => ({ ...prev, status: newStatus, updated_at: new Date().toISOString() }));
      toast({ title: `Order ${newStatus}` });
    }
  };

  const handleRequestCancellation = async () => {
    if (!order || !cancelReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    setUpdating(true);

    if (isSeller) {
      // Seller: submit for admin approval
      const { data, error } = await supabase
        .from('cancellation_requests')
        .insert({
          order_id: order.id,
          requested_by: userId,
          reason: cancelReason.trim(),
        })
        .select()
        .single();
      if (!error) {
        setCancellationRequest(data);
        setShowCancelForm(false);
        setCancelReason('');
        toast({ title: 'Cancellation request submitted', description: 'Awaiting admin approval.' });
      } else {
        console.error(error);
        toast({ title: 'Failed to submit cancellation request', variant: 'destructive' });
      }
    } else {
      // Buyer: auto-approve cancellation
      const { data, error } = await supabase
        .from('cancellation_requests')
        .insert({
          order_id: order.id,
          requested_by: userId,
          reason: cancelReason.trim(),
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!error) {
        await supabase.from('orders').update({ status: 'cancelled' as any }).eq('id', order.id);
        setOrder((prev: any) => ({ ...prev, status: 'cancelled' }));
        setCancellationRequest(data);
        setShowCancelForm(false);
        setCancelReason('');
        toast({ title: 'Order cancelled successfully' });
      } else {
        console.error(error);
        toast({ title: 'Failed to cancel order', variant: 'destructive' });
      }
    }
    setUpdating(false);
  };

  const handleRequestReturn = async () => {
    if (!order || !returnReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    setUpdating(true);
    // Auto-approve: insert request and set order to return_initiated
    const { data, error } = await supabase
      .from('return_requests')
      .insert({
        order_id: order.id,
        requested_by: userId,
        reason: returnReason.trim(),
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!error) {
      await supabase.from('orders').update({ status: 'return_initiated' as any }).eq('id', order.id);
      setOrder((prev: any) => ({ ...prev, status: 'return_initiated' }));
      setReturnRequest(data);
      setShowReturnForm(false);
      setReturnReason('');
      toast({ title: 'Return initiated successfully' });
    } else {
      console.error(error);
      toast({ title: 'Failed to submit return request', variant: 'destructive' });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Order not found</div>;

  const firstItem = order.order_items?.[0];
  const productTitle = firstItem?.products?.title || 'Product';
  const productImg = firstItem?.products?.images?.[0];
  const totalQty = order.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 1;
  const shippingAddr = order.shipping_address as any;


  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Order #{order.id.slice(-4)}</h1>
      </div>

      {/* Product info */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border mb-4">
        {productImg ? (
          <img src={productImg} alt={productTitle} className="w-20 h-20 rounded-xl object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <h3 className="font-bold text-foreground">{productTitle}</h3>
          {firstItem?.variant_label && (
            <p className="text-muted-foreground text-xs">Size: <span className="font-semibold text-foreground">{firstItem.variant_label}</span></p>
          )}
          {order.order_items?.length > 1 && (
            <p className="text-muted-foreground text-xs">+{order.order_items.length - 1} more items</p>
          )}
          <p className="text-muted-foreground text-sm">Qty: {totalQty}</p>
          <p className="text-primary font-extrabold text-lg mt-1">₹{Math.round(order.total_amount)}</p>
        </div>
      </div>

      {/* Status tracker */}
      {(order.status === 'return_initiated' || order.status === 'return_completed') ? (
        <div className="p-4 rounded-2xl bg-card border border-border mb-4">
          <h3 className="font-bold text-foreground mb-4">Return Status</h3>
          <div className="space-y-4">
            {returnSteps.map((step, i) => {
              const Icon = step.icon;
              const isComplete = order.status === 'return_completed' || (order.status === 'return_initiated' && i === 0);
              const isCurrent = (order.status === 'return_initiated' && i === 0) || (order.status === 'return_completed' && i === 1);
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isComplete ? `${step.color} text-white` : 'bg-secondary text-muted-foreground'
                  } ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-background ring-current' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isComplete ? step.text : 'text-muted-foreground'}`}>{step.label}</p>
                  </div>
                  {isComplete && <CheckCircle className={`w-4 h-4 ${step.text} shrink-0`} />}
                </div>
              );
            })}
          </div>
        </div>
      ) : order.status !== 'cancelled' ? (
        <div className="p-4 rounded-2xl bg-card border border-border mb-4">
          <h3 className="font-bold text-foreground mb-4">Order Status</h3>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isComplete = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isComplete ? `${step.color} text-white` : 'bg-secondary text-muted-foreground'
                  } ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-background ring-current' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isComplete ? step.text : 'text-muted-foreground'}`}>{step.label}</p>
                  </div>
                  {isComplete && <CheckCircle className={`w-4 h-4 ${step.text} shrink-0`} />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
          <p className="text-destructive font-bold text-center">This order has been cancelled</p>
        </div>
      )}

      {/* Cancellation request status */}
      {cancellationRequest && (
        <div className={`p-4 rounded-2xl border mb-4 ${
          cancellationRequest.status === 'pending' ? 'bg-warning/10 border-warning/20' :
          cancellationRequest.status === 'approved' ? 'bg-destructive/10 border-destructive/20' :
          'bg-secondary border-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground text-sm">Cancellation Request</h3>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
              cancellationRequest.status === 'pending' ? 'bg-warning/20 text-warning' :
              cancellationRequest.status === 'approved' ? 'bg-destructive/20 text-destructive' :
              'bg-secondary text-muted-foreground'
            }`}>
              {cancellationRequest.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{cancellationRequest.reason}</p>
        </div>
      )}

      {/* Return request status */}
      {returnRequest && (
        <div className={`p-4 rounded-2xl border mb-4 ${
          returnRequest.status === 'pending' ? 'bg-warning/10 border-warning/20' :
          returnRequest.status === 'approved' ? 'bg-blue-500/10 border-blue-500/20' :
          'bg-secondary border-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground text-sm">Return Request</h3>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
              returnRequest.status === 'pending' ? 'bg-warning/20 text-warning' :
              returnRequest.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
              'bg-secondary text-muted-foreground'
            }`}>
              {returnRequest.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{returnRequest.reason}</p>
        </div>
      )}

      {/* Shipping Address */}
      {shippingAddr && (
        <div className="p-4 rounded-2xl bg-card border border-border mb-4">
          <h3 className="font-bold text-foreground mb-2">Shipping Address</h3>
          <p className="text-muted-foreground text-sm">{shippingAddr.name}</p>
          <p className="text-muted-foreground text-sm">
            {shippingAddr.street}{shippingAddr.city ? `, ${shippingAddr.city}` : ''}
            {shippingAddr.state ? `, ${shippingAddr.state}` : ''} {shippingAddr.zip || ''}
          </p>
        </div>
      )}

      {/* Order Items */}
      {order.order_items?.length > 1 && (
        <div className="p-4 rounded-2xl bg-card border border-border mb-4">
          <h3 className="font-bold text-foreground mb-3">Items</h3>
          <div className="space-y-3">
            {order.order_items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.products?.images?.[0] ? (
                  <img src={item.products.images[0]} alt={item.products?.title} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.products?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant_label ? `${item.variant_label} · ` : ''}Qty: {item.quantity} × ₹{Math.round(item.unit_price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seller: Mark Return Complete */}
      {isSeller && order.status === 'return_initiated' && (
        <button onClick={async () => {
          setUpdating(true);
          await supabase.from('orders').update({ status: 'return_completed' as any }).eq('id', order.id);
          setOrder((prev: any) => ({ ...prev, status: 'return_completed' }));
          toast({ title: 'Return marked as successful' });
          setUpdating(false);
        }} disabled={updating}
          className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform mb-4">
          {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Mark Return Complete
        </button>
      )}

      {/* Seller Actions */}
      {isSeller && order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'return_initiated' && order.status !== 'return_completed' && (
        <div className="space-y-3">
          {canAdvance && (
            <button onClick={handleUpdateStatus} disabled={updating}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform">
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {nextLabel[order.status]}
            </button>
          )}
          {!cancellationRequest && (
            <>
              {showCancelForm ? (
                <div className="space-y-2">
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation…" rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleRequestCancellation} disabled={updating}
                      className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-50">
                      {updating ? 'Submitting…' : 'Submit Request'}
                    </button>
                    <button onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                      className="px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCancelForm(true)}
                  className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-semibold">
                  Request Cancellation
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Buyer Actions */}
      {isBuyer && (
        <div className="space-y-3">
          {/* Cancel option for buyer (before delivery) */}
          {canBuyerCancel && (
            <>
              {showCancelForm ? (
                <div className="space-y-2">
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation…" rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleRequestCancellation} disabled={updating}
                      className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-50">
                      {updating ? 'Submitting…' : 'Submit Request'}
                    </button>
                    <button onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                      className="px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm">Back</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCancelForm(true)}
                  className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-semibold">
                  Cancel Order
                </button>
              )}
            </>
          )}

          {/* Return option for buyer (within 7 days of delivery) */}
          {canReturn && (
            <>
              {showReturnForm ? (
                <div className="space-y-2">
                  <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)}
                    placeholder="Reason for return…" rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleRequestReturn} disabled={updating}
                      className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50">
                      {updating ? 'Submitting…' : 'Submit Return Request'}
                    </button>
                    <button onClick={() => { setShowReturnForm(false); setReturnReason(''); }}
                      className="px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm">Back</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowReturnForm(true)}
                  className="w-full py-3 rounded-2xl bg-blue-500/10 text-blue-600 font-semibold flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Return Order
                </button>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-center text-muted-foreground text-xs mt-6">
        Ordered on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
};

export default OrderDetailPage;
