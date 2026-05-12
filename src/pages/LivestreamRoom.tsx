import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types';
import { ArrowLeft, Heart, Share2, Send, ShoppingCart, X, Eye, MessageCircle, RefreshCw, Check, Package, Mic, MicOff, Video, VideoOff, RotateCcw, PhoneOff, Loader2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useToast } from '@/hooks/use-toast';
import FollowButton from '@/components/FollowButton';
import LiveCheckoutSheet from '@/components/LiveCheckoutSheet';

interface ProductVariant {
  id: string;
  size_label: string;
  stock_quantity: number;
  sort_order: number;
}
interface StreamProduct {
  id: string;
  title: string;
  price: number;
  description?: string | null;
  images: string[];
  compare_at_price?: number | null;
  stock_quantity?: number;
  variants?: ProductVariant[];
}

const LivestreamRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, userName } = useAuth();
  const { toast } = useToast();

  const liveState = location.state as { isSeller?: boolean } | null;

  const [streamRow, setStreamRow] = useState<{ id: string; title: string; thumbnail_url: string | null; seller_id: string; viewer_count: number; product_ids: string[]; status: string; featured_product_id: string | null } | null>(null);
  const [streamSellerName, setStreamSellerName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showProducts, setShowProducts] = useState(false);
  const [showProductSwitcher, setShowProductSwitcher] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loadingStream, setLoadingStream] = useState(!!id);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);

  const [products, setProducts] = useState<StreamProduct[]>([]);
  const [otherProducts, setOtherProducts] = useState<StreamProduct[]>([]);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [featuredProductId, setFeaturedProductId] = useState<string | undefined>();
  const [checkoutProduct, setCheckoutProduct] = useState<StreamProduct | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Seller = the broadcaster who owns this stream
  const isSeller = useMemo(() => {
    if (liveState?.isSeller) return true;
    if (streamRow && userId && streamRow.seller_id === userId) return true;
    return false;
  }, [liveState, streamRow, userId]);

  const streamTitle = streamRow?.title || 'Live Stream';
  const sellerName = isSeller ? (userName || 'You') : (streamSellerName || 'Seller');

  // ---------- WebRTC ----------
  const live = useLiveStream({
    livestreamId: id || null,
    role: isSeller ? 'seller' : 'viewer',
    userId: userId || null,
  });

  // Start broadcasting / joining once we know the role and have a stream id.
  useEffect(() => {
    if (!id) return;
    if (isSeller) {
      if (live.status === 'idle') live.startBroadcast();
    } else if (streamRow && streamRow.status !== 'ended' && live.status === 'idle') {
      live.joinAsViewer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSeller, streamRow?.status]);

  // Bind 100ms video track to <video> via attachVideo (recommended pattern)
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    const trackId = isSeller ? live.localVideoTrackId : live.remoteVideoTrackId;
    if (!trackId) return;
    live.attachVideo(trackId, el);
    return () => { live.detachVideo(trackId, el); };
  }, [isSeller, live.localVideoTrackId, live.remoteVideoTrackId, live.attachVideo, live.detachVideo]);

  // Fetch real livestream + its products + seller name when not initiated by seller
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: stream } = await supabase
        .from('livestreams')
        .select('id, title, thumbnail_url, seller_id, viewer_count, product_ids, status, featured_product_id')
        .eq('id', id)
        .maybeSingle();
      if (cancelled || !stream) { setLoadingStream(false); return; }
      setStreamRow(stream as any);

      const [{ data: profile }, { data: prods }] = await Promise.all([
        supabase.rpc('get_seller_public_profile', { _seller_id: stream.seller_id }).maybeSingle(),
        stream.product_ids.length
          ? supabase.from('products').select('id, title, price, description, images, compare_at_price, stock_quantity').in('id', stream.product_ids)
          : Promise.resolve({ data: [] as StreamProduct[] }),
      ]);
      if (cancelled) return;
      setStreamSellerName(profile?.name || profile?.username || 'Seller');
      let list = (prods as StreamProduct[] | null) || [];
      if (list.length) {
        const { data: vars } = await supabase
          .from('product_variants')
          .select('id, product_id, size_label, stock_quantity, sort_order')
          .in('product_id', list.map(p => p.id))
          .order('sort_order');
        if (vars) {
          const byProd = new Map<string, ProductVariant[]>();
          (vars as any[]).forEach(v => {
            const arr = byProd.get(v.product_id) || [];
            arr.push({ id: v.id, size_label: v.size_label, stock_quantity: v.stock_quantity, sort_order: v.sort_order });
            byProd.set(v.product_id, arr);
          });
          list = list.map(p => ({ ...p, variants: byProd.get(p.id) || [] }));
        }
      }
      setProducts(list);
      const initialFeatured = (stream as any).featured_product_id || list[0]?.id;
      setFeaturedProductId(prev => prev || initialFeatured);
      setLoadingStream(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime: keep featured product (and other stream fields) in sync for everyone
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`livestream:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'livestreams', filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as any;
          setStreamRow(prev => prev ? { ...prev, ...row } : prev);
          if (row.featured_product_id) {
            setFeaturedProductId(row.featured_product_id);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Realtime: keep stock_quantity in sync (matters for seller's inventory display)
  useEffect(() => {
    if (!products.length) return;
    const channel = supabase
      .channel(`stream-products:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const row = payload.new as { id: string; stock_quantity: number; price: number; compare_at_price: number | null };
          setProducts(prev => prev.map(p => p.id === row.id ? { ...p, stock_quantity: row.stock_quantity, price: row.price, compare_at_price: row.compare_at_price } : p));
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'product_variants' },
        (payload) => {
          const row = payload.new as { id: string; product_id: string; stock_quantity: number };
          setProducts(prev => prev.map(p => p.id !== row.product_id ? p : {
            ...p,
            variants: (p.variants || []).map(v => v.id === row.id ? { ...v, stock_quantity: row.stock_quantity } : v),
          }));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, products.length]);

  // Seller-only: load other products (in catalog, not yet in this stream)
  useEffect(() => {
    if (!isSeller || !streamRow?.seller_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, description, images, compare_at_price, stock_quantity')
        .eq('seller_id', streamRow.seller_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (cancelled || !data) return;
      const inStream = new Set(streamRow.product_ids || []);
      let filtered = (data as StreamProduct[]).filter(p => !inStream.has(p.id));
      if (filtered.length) {
        const { data: vars } = await supabase
          .from('product_variants')
          .select('id, product_id, size_label, stock_quantity, sort_order')
          .in('product_id', filtered.map(p => p.id))
          .order('sort_order');
        if (vars) {
          const byProd = new Map<string, ProductVariant[]>();
          (vars as any[]).forEach(v => {
            const arr = byProd.get(v.product_id) || [];
            arr.push({ id: v.id, size_label: v.size_label, stock_quantity: v.stock_quantity, sort_order: v.sort_order });
            byProd.set(v.product_id, arr);
          });
          filtered = filtered.map(p => ({ ...p, variants: byProd.get(p.id) || [] }));
        }
      }
      setOtherProducts(filtered);
    })();
    return () => { cancelled = true; };
  }, [isSeller, streamRow?.seller_id, streamRow?.product_ids]);

  const addProductToStream = async (product: StreamProduct) => {
    if (!id || !streamRow) return;
    setAddingProductId(product.id);
    const nextIds = Array.from(new Set([...(streamRow.product_ids || []), product.id]));
    const { error } = await supabase
      .from('livestreams')
      .update({ product_ids: nextIds } as any)
      .eq('id', id);
    setAddingProductId(null);
    if (error) {
      toast({ title: 'Could not add product', description: error.message, variant: 'destructive' });
      return;
    }
    setProducts(prev => prev.some(p => p.id === product.id) ? prev : [...prev, product]);
    setOtherProducts(prev => prev.filter(p => p.id !== product.id));
    setStreamRow(prev => prev ? { ...prev, product_ids: nextIds } : prev);
    toast({ title: 'Product added', description: `${product.title} is now featured in your stream` });
  };

  // Load existing chat + subscribe to realtime new messages
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, user_id, message, created_at')
        .eq('livestream_id', id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (cancelled || !data) return;

      const userIds = Array.from(new Set(data.map(m => m.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .rpc('get_chat_author_names', { _user_ids: userIds });
        (profiles as Array<{ id: string; name: string | null; username: string | null }> | null)?.forEach(
          p => nameMap.set(p.id, p.name || p.username || 'User')
        );
      }
      if (cancelled) return;
      setMessages(data.map(m => ({
        id: m.id,
        userId: m.user_id,
        userName: nameMap.get(m.user_id) || 'User',
        userAvatar: '',
        message: m.message,
        timestamp: m.created_at,
      })));
    })();

    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `livestream_id=eq.${id}` },
        async (payload) => {
          const row = payload.new as { id: string; user_id: string; message: string; created_at: string };
          const { data: profiles } = await supabase
            .rpc('get_chat_author_names', { _user_ids: [row.user_id] });
          const profile = (profiles as Array<{ name: string | null; username: string | null }> | null)?.[0];
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, {
            id: row.id,
            userId: row.user_id,
            userName: profile?.name || profile?.username || 'User',
            userAvatar: '',
            message: row.message,
            timestamp: row.created_at,
          }]);
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const featuredProduct = products.find(p => p.id === featuredProductId);

  const setFeatured = async (productId: string) => {
    setFeaturedProductId(productId); // optimistic for seller
    if (isSeller && id) {
      const { error } = await supabase
        .from('livestreams')
        .update({ featured_product_id: productId } as any)
        .eq('id', id);
      if (error) {
        toast({ title: 'Could not switch product', description: error.message, variant: 'destructive' });
      }
    }
  };

  const openPriceEditor = (product: StreamProduct) => {
    setEditingPriceProductId(product.id);
    setPriceDraft(String(Math.round(product.price)));
  };

  const savePrice = async () => {
    if (!editingPriceProductId) return;
    const newPrice = Number(priceDraft);
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      toast({ title: 'Invalid price', description: 'Enter a price greater than 0.', variant: 'destructive' });
      return;
    }
    const current = products.find(p => p.id === editingPriceProductId);
    if (!current) return;
    setSavingPrice(true);
    // Set compare_at_price to original price when discounting (and not already set)
    const update: { price: number; compare_at_price?: number | null } = { price: newPrice };
    if (newPrice < current.price && !current.compare_at_price) {
      update.compare_at_price = current.price;
    }
    const { error } = await supabase.from('products').update(update).eq('id', editingPriceProductId);
    setSavingPrice(false);
    if (error) {
      toast({ title: 'Could not update price', description: error.message, variant: 'destructive' });
      return;
    }
    setProducts(prev => prev.map(p => p.id === editingPriceProductId ? { ...p, price: newPrice, compare_at_price: update.compare_at_price ?? p.compare_at_price } : p));
    toast({ title: 'Price updated', description: `New price: ₹${Math.round(newPrice)}` });
    setEditingPriceProductId(null);
  };

  if (!loadingStream && !streamRow) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Stream not found</div>;
  }

  const handleEndStream = async () => {
    await live.endStream();
    toast({ title: 'Stream ended' });
    navigate('/', { replace: true });
  };

  const handleLeaveAfterEnded = () => {
    live.leaveStream();
    navigate(-1);
  };

  const showVideo = isSeller ? !!live.localVideoTrackId : !!live.remoteVideoTrackId;
  const isEnded = live.status === 'ended' || streamRow?.status === 'ended';

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !id || !userId) return;
    setNewMessage('');
    const { error } = await supabase.from('chat_messages').insert({
      livestream_id: id,
      user_id: userId,
      message: text,
    });
    if (error) {
      // restore on failure
      setNewMessage(text);
      console.error('Failed to send message:', error);
    }
  };

  const handleBuy = (product: StreamProduct) => {
    setShowProducts(false);
    setCheckoutProduct(product);
  };

  const handleResumeLive = () => {
    // Stream connection persists across the sheet; nothing to do beyond closing it.
    // If the viewer was disconnected for any reason, rejoin.
    if (!isSeller && live.status !== 'live' && streamRow?.status !== 'ended') {
      live.joinAsViewer();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/live/${id}`;
    const shareData = {
      title: `${sellerName} is live on Ripple`,
      text: `Join "${streamTitle}" live on Ripple 🛍️✨`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
      toast({ title: 'Link copied', description: 'Share it with friends to join the livestream.' });
    } catch {
      toast({ title: 'Could not share', description: url, variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground z-50 flex flex-col max-w-lg mx-auto">
      {/* Video area */}
      <div className="relative flex-1 min-h-0">
        {/* Live video (seller=local, viewer=remote) */}
        <video
          ref={videoElRef}
          autoPlay
          playsInline
          muted={isSeller}
          className={`absolute inset-0 w-full h-full object-cover ${showVideo ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Fallback / connecting state */}
        {!showVideo && !isEnded && (
          <div className="absolute inset-0 w-full h-full bg-foreground/90 flex flex-col items-center justify-center gap-3">
            {streamRow?.thumbnail_url && (
              <img src={streamRow.thumbnail_url} alt={streamTitle} className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <Loader2 className="w-8 h-8 text-primary-foreground/80 animate-spin relative" />
            <p className="text-primary-foreground/80 text-sm relative">
              {isSeller ? 'Starting your camera…' : 'Connecting to stream…'}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-transparent to-foreground/80 pointer-events-none" />

        {/* Stream-ended overlay (viewer) */}
        {isEnded && !isSeller && (
          <div className="absolute inset-0 bg-foreground/90 flex flex-col items-center justify-center z-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
              <PhoneOff className="w-8 h-8 text-primary-foreground/70" />
            </div>
            <div className="text-center">
              <p className="text-primary-foreground font-bold text-lg">Stream ended</p>
              <p className="text-primary-foreground/60 text-sm mt-1">Thanks for watching!</p>
            </div>
            <button onClick={handleLeaveAfterEnded} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              Back
            </button>
          </div>
        )}

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-primary-foreground" />
            </button>
            <div className="flex items-center gap-2 bg-foreground/30 backdrop-blur-sm rounded-full pl-1 pr-2 py-1">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">{sellerName[0]?.toUpperCase()}</span>
              </div>
              <p className="text-primary-foreground text-xs font-bold pr-1">{sellerName}</p>
              {!isSeller && streamRow?.seller_id && (
                <FollowButton sellerId={streamRow.seller_id} variant="pill" className="!h-7 !px-3 !text-[11px]" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-live text-live-foreground text-xs font-bold flex items-center gap-1 live-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-live-foreground" />
              LIVE
            </span>
            <span className="px-2 py-1 rounded-full bg-foreground/30 backdrop-blur-sm text-primary-foreground text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {live.viewerCount}
            </span>
            {isSeller && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="px-3 py-1.5 rounded-full bg-live text-live-foreground text-xs font-bold flex items-center gap-1"
              >
                <PhoneOff className="w-3 h-3" />
                End
              </button>
            )}
          </div>
        </div>

        {/* Seller controls (mic / flip camera) */}
        {isSeller && (
          <div className="absolute left-3 top-20 flex flex-col gap-2 z-10">
            <button
              onClick={live.toggleMic}
              className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center"
              aria-label={live.micEnabled ? 'Mute mic' : 'Unmute mic'}
            >
              {live.micEnabled ? (
                <Mic className="w-4 h-4 text-primary-foreground" />
              ) : (
                <MicOff className="w-4 h-4 text-live" />
              )}
            </button>
            <button
              onClick={live.toggleVideo}
              className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center"
              aria-label={live.videoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              {live.videoEnabled ? (
                <Video className="w-4 h-4 text-primary-foreground" />
              ) : (
                <VideoOff className="w-4 h-4 text-live" />
              )}
            </button>
            <button
              onClick={live.toggleCamera}
              className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center"
              aria-label="Flip camera"
            >
              <RotateCcw className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        )}

        {/* Side actions */}
        <div className="absolute right-3 bottom-48 flex flex-col gap-4 z-10">
          <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <Heart className={`w-5 h-5 ${liked ? 'fill-live text-live' : 'text-primary-foreground'}`} />
            </div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground text-[10px]">{messages.length}</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground text-[10px]">Share</span>
          </button>
          <button onClick={() => setShowProducts(true)} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground text-[10px]">{products.length}</span>
          </button>
        </div>

        {/* Seller: Switch featured product button */}
        {isSeller && products.length > 0 && (
          <button
            onClick={() => setShowProductSwitcher(true)}
            className="absolute left-3 bottom-48 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Switch Product
          </button>
        )}

        {/* Chat overlay */}
        <div className="absolute bottom-0 left-0 right-16 p-3 z-10">
          {/* Messages */}
          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
            {messages.slice(-4).map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
              <div className="px-3 py-1.5 rounded-2xl bg-foreground/30 backdrop-blur-sm">
                  <span className="text-accent text-xs font-bold">{msg.userName}:</span>
                  <span className="text-primary-foreground text-xs ml-1.5">{msg.message}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Featured product card */}
          {featuredProduct && (
          <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => !isSeller && handleBuy(featuredProduct)}
              className={`w-full mt-2 mb-2 flex items-center gap-3 rounded-2xl p-1 text-left ${!isSeller ? 'cursor-pointer' : ''}`}
            >
              {featuredProduct.images[0] ? (
                <img src={featuredProduct.images[0]} alt={featuredProduct.title} className="w-14 h-14 rounded-xl object-cover ring-1 ring-primary-foreground/20" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.6)]">
                <p className="text-primary-foreground text-sm font-bold truncate">{featuredProduct.title}</p>
                {featuredProduct.description && (
                  <p className="text-primary-foreground/80 text-xs truncate mt-0.5">{featuredProduct.description}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-primary-foreground font-extrabold text-base">₹{Math.round(featuredProduct.price)}</span>
                  {featuredProduct.compare_at_price && (
                    <span className="text-primary-foreground/70 text-xs line-through">₹{Math.round(featuredProduct.compare_at_price)}</span>
                  )}
                  {isSeller && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openPriceEditor(featuredProduct); }}
                      className="ml-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 shadow-md"
                    >
                      <Pencil className="w-3 h-3" /> Edit price
                    </button>
                  )}
                  {isSeller && featuredProduct.variants && featuredProduct.variants.length > 0 ? (
                    featuredProduct.variants.map(v => (
                      <span key={v.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.stock_quantity === 0
                          ? 'bg-live/15 text-live'
                          : v.stock_quantity <= 3
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-success/15 text-success'
                      }`}>
                        {v.size_label}: {v.stock_quantity}
                      </span>
                    ))
                  ) : isSeller && typeof featuredProduct.stock_quantity === 'number' && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      featuredProduct.stock_quantity === 0
                        ? 'bg-live/15 text-live'
                        : featuredProduct.stock_quantity <= 3
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-success/15 text-success'
                    }`}>
                      {featuredProduct.stock_quantity === 0 ? 'Sold out' : `${featuredProduct.stock_quantity} in stock`}
                    </span>
                  )}
                </div>
              </div>
              {!isSeller && (
                <span className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 shadow-lg">
                  Buy Now
                </span>
              )}
            </motion.div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Say something..."
              className="flex-1 px-4 py-2.5 rounded-full bg-foreground/30 backdrop-blur-sm text-primary-foreground placeholder:text-primary-foreground/50 text-sm focus:outline-none"
            />
            <button onClick={handleSendMessage} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Products bottom sheet */}
      <AnimatePresence>
        {showProducts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProducts(false)}
              className="fixed inset-0 bg-foreground/50 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-3xl z-50 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Products ({products.length})</h3>
                <button onClick={() => setShowProducts(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No products featured</p>
                ) : (
                  products.map(product => (
                    <div key={product.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isSeller && featuredProductId === product.id ? 'bg-primary/10 border border-primary' : 'bg-secondary'}`}>
                      {product.images[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                        <p className="text-muted-foreground text-xs truncate">{product.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-extrabold text-primary">₹{Math.round(product.price)}</span>
                          {product.compare_at_price && <span className="text-muted-foreground text-xs line-through">₹{Math.round(product.compare_at_price)}</span>}
                          {isSeller && (
                            <button
                              onClick={() => openPriceEditor(product)}
                              className="px-2 py-0.5 rounded-full bg-muted hover:bg-muted/70 text-foreground text-[10px] font-bold flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                          {isSeller && typeof product.stock_quantity === 'number' && (!product.variants || product.variants.length === 0) && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              product.stock_quantity === 0
                                ? 'bg-live/15 text-live'
                                : product.stock_quantity <= 3
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-success/15 text-success'
                            }`}>
                              {product.stock_quantity === 0 ? 'Sold out' : `${product.stock_quantity} in stock`}
                            </span>
                          )}
                        </div>
                        {isSeller && product.variants && product.variants.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {product.variants.map(v => (
                              <span key={v.id} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                v.stock_quantity === 0
                                  ? 'bg-live/15 text-live'
                                  : v.stock_quantity <= 3
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-success/15 text-success'
                              }`}>
                                {v.size_label}: {v.stock_quantity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSeller ? (
                        <button
                          onClick={() => setFeatured(product.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 ${featuredProductId === product.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}
                        >
                          {featuredProductId === product.id ? 'Showing' : 'Show'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy(product)}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shrink-0"
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  ))
                )}

                {isSeller && otherProducts.length > 0 && (
                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-bold text-foreground">Your other products</h4>
                      <span className="text-xs text-muted-foreground">({otherProducts.length})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Add any of these to your live stream without ending it.</p>
                    <div className="space-y-3">
                      {otherProducts.map(product => (
                        <div key={product.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-dashed border-border">
                          {product.images[0] ? (
                            <img src={product.images[0]} alt={product.title} className="w-16 h-16 rounded-xl object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-extrabold text-primary">₹{Math.round(product.price)}</span>
                              {product.compare_at_price && <span className="text-muted-foreground text-xs line-through">₹{Math.round(product.compare_at_price)}</span>}
                              {typeof product.stock_quantity === 'number' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  product.stock_quantity === 0
                                    ? 'bg-live/15 text-live'
                                    : product.stock_quantity <= 3
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-success/15 text-success'
                                }`}>
                                  {product.stock_quantity === 0 ? 'Sold out' : `${product.stock_quantity} in stock`}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addProductToStream(product)}
                            disabled={addingProductId === product.id}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shrink-0 disabled:opacity-50 flex items-center gap-1"
                          >
                            {addingProductId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '+ Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Seller: Product switcher bottom sheet */}
      <AnimatePresence>
        {showProductSwitcher && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProductSwitcher(false)}
              className="fixed inset-0 bg-foreground/50 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-card rounded-t-3xl z-50 max-h-[60vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Switch Featured Product</h3>
                <button onClick={() => setShowProductSwitcher(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setFeatured(product.id);
                      setShowProductSwitcher(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                      featuredProductId === product.id ? 'border-primary bg-primary/5' : 'border-border bg-secondary'
                    }`}
                  >
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-primary font-bold text-sm">₹{Math.round(product.price)}</p>
                        {typeof product.stock_quantity === 'number' && (!product.variants || product.variants.length === 0) && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.stock_quantity === 0
                              ? 'bg-live/15 text-live'
                              : product.stock_quantity <= 3
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-success/15 text-success'
                          }`}>
                            {product.stock_quantity === 0 ? 'Sold out' : `${product.stock_quantity} left`}
                          </span>
                        )}
                      </div>
                      {product.variants && product.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.variants.map(v => (
                            <span key={v.id} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              v.stock_quantity === 0
                                ? 'bg-live/15 text-live'
                                : v.stock_quantity <= 3
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-success/15 text-success'
                            }`}>
                              {v.size_label}:{v.stock_quantity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {featuredProductId === product.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}

                {otherProducts.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-border">
                    <p className="text-xs font-bold text-muted-foreground mb-2 px-1">Your other products</p>
                    {otherProducts.map(product => (
                      <div key={product.id} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-border bg-secondary/60 mb-2">
                        {product.images[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">{product.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-primary font-bold text-sm">₹{Math.round(product.price)}</p>
                            {typeof product.stock_quantity === 'number' && (!product.variants || product.variants.length === 0) && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                product.stock_quantity === 0
                                  ? 'bg-live/15 text-live'
                                  : product.stock_quantity <= 3
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-success/15 text-success'
                              }`}>
                                {product.stock_quantity === 0 ? 'Sold out' : `${product.stock_quantity} left`}
                              </span>
                            )}
                          </div>
                          {product.variants && product.variants.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.variants.map(v => (
                                <span key={v.id} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  v.stock_quantity === 0
                                    ? 'bg-live/15 text-live'
                                    : v.stock_quantity <= 3
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-success/15 text-success'
                                }`}>
                                  {v.size_label}:{v.stock_quantity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            await addProductToStream(product);
                            await setFeatured(product.id);
                            setShowProductSwitcher(false);
                          }}
                          disabled={addingProductId === product.id}
                          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1"
                        >
                          {addingProductId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '+ Add & Show'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* End Stream confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEndConfirm(false)}
              className="fixed inset-0 bg-foreground/70 z-[60]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-card rounded-3xl p-6 w-full max-w-sm pointer-events-auto">
                <h3 className="text-foreground font-bold text-lg mb-2">End livestream?</h3>
                <p className="text-muted-foreground text-sm mb-5">Viewers will be disconnected immediately.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold">
                    Cancel
                  </button>
                  <button onClick={handleEndStream} className="flex-1 py-3 rounded-xl bg-live text-live-foreground font-semibold flex items-center justify-center gap-2">
                    <PhoneOff className="w-4 h-4" />
                    End Stream
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LiveCheckoutSheet
        open={!!checkoutProduct}
        product={checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        onContinueWatching={handleResumeLive}
      />

      {/* Price editor modal (seller only) */}
      <AnimatePresence>
        {editingPriceProductId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !savingPrice && setEditingPriceProductId(null)}
              className="fixed inset-0 bg-foreground/60 z-[60]"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[88%] max-w-sm bg-card rounded-2xl p-5 shadow-2xl"
            >
              <h3 className="text-base font-bold text-foreground">Update live price</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The new price will appear instantly for all viewers.
              </p>
              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground">New price (₹)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  autoFocus
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setEditingPriceProductId(null)}
                  disabled={savingPrice}
                  className="flex-1 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={savePrice}
                  disabled={savingPrice}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {savingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LivestreamRoom;
