import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ImagePlus, X as XIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar as CalendarIcon, Check, Clock, Package, Loader2, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  description?: string | null;
  compare_at_price?: number | null;
  images: string[];
}

const GoLivePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, logout } = useAuth();
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleHour, setScheduleHour] = useState('10');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleAmPm, setScheduleAmPm] = useState('AM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [goingLive, setGoingLive] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Real camera preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoadingProducts(true);
    supabase
      .from('products')
      .select('id, title, price, description, compare_at_price, images')
      .eq('seller_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSellerProducts(data);
        setLoadingProducts(false);
      });
  }, [userId]);

  useEffect(() => {
    const onFocus = () => {
      if (!userId) return;
      supabase
        .from('products')
        .select('id, title, price, description, compare_at_price, images')
        .eq('seller_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setSellerProducts(data);
        });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId]);

  // Request camera + mic for preview on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        previewStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e: any) {
        console.warn('Camera permission denied / unavailable', e);
        if (!cancelled) setCameraError(e?.message || 'Camera unavailable');
      }
    })();
    return () => {
      cancelled = true;
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    };
  }, []);

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const resolvedThumbnail = (): string | null => thumbnailUrl;

  const handleThumbUpload = async (file: File) => {
    if (!userId) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please pick an image', variant: 'destructive' });
      return;
    }
    setUploadingThumb(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setUploadingThumb(false);
      toast({ title: 'Session expired', description: 'Please sign in again to upload a thumbnail', variant: 'destructive' });
      logout();
      navigate('/auth');
      return;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('livestream-thumbnails').upload(path, file);
    if (error) {
      setUploadingThumb(false);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    const { data } = supabase.storage.from('livestream-thumbnails').getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploadingThumb(false);
  };

  const handleGoLive = async () => {
    if (!title) {
      toast({ title: 'Add a title', description: 'Give your stream a title before going live', variant: 'destructive' });
      return;
    }
    if (!userId) {
      toast({ title: 'Sign in required', description: 'Please sign in again', variant: 'destructive' });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast({ title: 'Session expired', description: 'Please sign in again to start your stream', variant: 'destructive' });
      logout();
      navigate('/auth');
      return;
    }
    setGoingLive(true);
    
    const { data, error } = await supabase
      .from('livestreams')
      .insert({
        seller_id: userId,
        title,
        description: description || null,
        status: 'live',
        started_at: new Date().toISOString(),
        product_ids: selectedProducts,
        thumbnail_url: resolvedThumbnail(),
      })
      .select('id')
      .single();
    setGoingLive(false);
    if (error || !data) {
      toast({ title: 'Could not start stream', description: error?.message || 'Unknown error', variant: 'destructive' });
      return;
    }
    // Stop preview tracks — LivestreamRoom will request fresh camera for the broadcast
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    previewStreamRef.current = null;
    toast({ title: '🔴 You\'re Live!', description: 'Your livestream has started' });
    navigate(`/stream/${data.id}`, { state: { isSeller: true } });
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Go Live</h1>
      </div>

      <div className="space-y-4">
        {/* Camera preview */}
        <div className="aspect-[4/3] rounded-2xl bg-foreground/90 overflow-hidden relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/90 text-center px-6">
              <VideoOff className="w-10 h-10 text-primary-foreground/60 mb-2" />
              <p className="text-primary-foreground/80 text-sm font-semibold">Camera unavailable</p>
              <p className="text-primary-foreground/50 text-xs mt-1">Allow camera & mic access to go live</p>
            </div>
          )}
          {!cameraError && !previewStreamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary-foreground/60 animate-spin" />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Stream Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are you streaming today?"
            className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell viewers what to expect..."
            rows={2}
            className="w-full px-4 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Thumbnail picker */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Stream Thumbnail</label>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleThumbUpload(f);
              e.target.value = '';
            }}
          />
          {thumbnailUrl ? (
            <div className="relative w-[140px] aspect-[3/4] rounded-2xl overflow-hidden bg-secondary">
              <img src={thumbnailUrl} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
              <button
                onClick={() => setThumbnailUrl(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/70 flex items-center justify-center"
                aria-label="Remove thumbnail"
              >
                <XIcon className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              disabled={uploadingThumb}
              className="w-[140px] aspect-[3/4] rounded-2xl border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {uploadingThumb ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground text-center px-2">Upload image</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Select products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">Products to Feature ({selectedProducts.length})</label>
            <button
              type="button"
              onClick={() => navigate('/products/new', { state: { returnTo: '/go-live' } })}
              className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 active:scale-95 transition-transform"
            >
              + Add New
            </button>
          </div>
          {loadingProducts ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : sellerProducts.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm mb-3">No products yet</p>
              <button onClick={() => navigate('/products/new', { state: { returnTo: '/go-live' } })} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                Add Product First
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sellerProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                    selectedProducts.includes(product.id) ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{product.title}</p>
                    <p className="text-primary font-bold text-sm">₹{Math.round(product.price)}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedProducts.includes(product.id) ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {selectedProducts.includes(product.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleGoLive}
          disabled={goingLive || !!cameraError}
          className="w-full py-4 rounded-2xl bg-live text-live-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {goingLive ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-live-foreground live-pulse" />
          )}
          {goingLive ? 'Starting…' : 'Go Live Now'}
        </button>
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className={cn(
            'w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors',
            showSchedule ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-secondary text-secondary-foreground'
          )}
        >
          <CalendarIcon className="w-5 h-5" />
          Schedule for Later
        </button>

        {showSchedule && (
          <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-secondary text-left text-sm',
                      !scheduleDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    disabled={(date) => date < new Date()}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Time</label>
              <div className="flex items-center gap-2">
                <Select value={scheduleHour} onValueChange={setScheduleHour}>
                  <SelectTrigger className="flex-1 rounded-xl bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-foreground font-bold">:</span>
                <Select value={scheduleMinute} onValueChange={setScheduleMinute}>
                  <SelectTrigger className="flex-1 rounded-xl bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={scheduleAmPm} onValueChange={setScheduleAmPm}>
                  <SelectTrigger className="w-20 rounded-xl bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!scheduleDate) {
                  toast({ title: 'Select a date', description: 'Please pick a date for your scheduled stream', variant: 'destructive' });
                  return;
                }
                if (!title) {
                  toast({ title: 'Add a title', description: 'Give your stream a title before scheduling', variant: 'destructive' });
                  return;
                }
                if (!userId) {
                  toast({ title: 'Sign in required', description: 'Please sign in again', variant: 'destructive' });
                  return;
                }
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) {
                  toast({ title: 'Session expired', description: 'Please sign in again to schedule your stream', variant: 'destructive' });
                  logout();
                  navigate('/auth');
                  return;
                }
                let hour24 = parseInt(scheduleHour, 10) % 12;
                if (scheduleAmPm === 'PM') hour24 += 12;
                const scheduledAt = new Date(scheduleDate);
                scheduledAt.setHours(hour24, parseInt(scheduleMinute, 10), 0, 0);
                
                const { error } = await supabase.from('livestreams').insert({
                  seller_id: userId,
                  title,
                  description: description || null,
                  status: 'scheduled',
                  scheduled_at: scheduledAt.toISOString(),
                  product_ids: selectedProducts,
                  thumbnail_url: resolvedThumbnail(),
                });
                if (error) {
                  toast({ title: 'Could not schedule', description: error.message, variant: 'destructive' });
                  return;
                }
                toast({
                  title: '📅 Stream Scheduled!',
                  description: `Scheduled for ${format(scheduleDate, 'PPP')} at ${scheduleHour}:${scheduleMinute} ${scheduleAmPm}`,
                });
                navigate('/');
              }}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Clock className="w-5 h-5" />
              Confirm Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoLivePage;