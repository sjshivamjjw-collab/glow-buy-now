import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Send, Plus, X, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type AppStatus = 'pending' | 'approved' | 'rejected';

interface ExistingApp {
  id: string;
  status: AppStatus;
  store_name: string;
  rejection_reason: string | null;
  created_at: string;
}

const SellerApplicationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, isAuthenticated } = useAuth();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brandName, setBrandName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [canShip, setCanShip] = useState<'' | 'yes' | 'no'>('');
  const [gstTaxId, setGstTaxId] = useState('');
  const [socialIds, setSocialIds] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existing, setExisting] = useState<ExistingApp | null>(null);

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  // Load most recent application for this user
  useEffect(() => {
    if (!userId) {
      setLoadingExisting(false);
      return;
    }
    supabase
      .from('seller_applications')
      .select('id, status, store_name, rejection_reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExisting(data as ExistingApp);
        setLoadingExisting(false);
      });
  }, [userId]);

  const cleanHandle = (v: string) => v.trim().replace(/^@+/, '');

  const addSocialId = () => setSocialIds(prev => [...prev, '']);
  const removeSocialId = (i: number) => setSocialIds(prev => prev.filter((_, idx) => idx !== i));
  const updateSocialId = (i: number, val: string) =>
    setSocialIds(prev => prev.map((v, idx) => (idx === i ? val : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !userId) {
      toast({ title: 'Please sign in', description: 'You need an account to apply.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (
      !brandName.trim() ||
      !sellerName.trim() ||
      !storeName.trim() ||
      !contactEmail.trim() ||
      !contactPhone.trim() ||
      !category ||
      !description.trim()
    ) {
      toast({
        title: 'Missing fields',
        description: 'Please fill all required fields marked with *.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const cleanSocial = socialIds.map(s => cleanHandle(s)).filter(Boolean);

    const { error } = await supabase.from('seller_applications').insert({
      user_id: userId,
      brand_name: brandName.trim(),
      seller_name: sellerName.trim(),
      store_name: storeName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
      website_link: websiteLink.trim() || null,
      category,
      description: description.trim(),
      shipping_network: canShip ? (canShip === 'yes' ? 'Yes, I can handle shipping' : "No, I can't manage shipping") : null,
      gst_tax_id: gstTaxId.trim() || null,
      social_media_links: cleanSocial,
      sample_product_images: [],
    });

    setSubmitting(false);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Application Submitted! 🎉', description: 'We will review your application and get back to you soon.' });
    navigate('/profile');
  };

  // Show status if user already has an application
  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    const isApproved = existing.status === 'approved';
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Seller Application</h1>
        </div>

        <div className={`p-6 rounded-2xl border ${isApproved ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${isApproved ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
            {isApproved ? <Check className="w-6 h-6 text-green-600" /> : <Clock className="w-6 h-6 text-yellow-600" />}
          </div>
          <h2 className="text-lg font-bold text-foreground">{isApproved ? 'Application Approved 🎉' : 'Application Pending'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isApproved
              ? `${existing.store_name} is approved. You now have full Seller access — head to your profile to switch to the seller view.`
              : `${existing.store_name} is awaiting admin review. We'll notify you once a decision is made (typically within 2-3 business days).`}
          </p>
          <button onClick={() => navigate('/profile')} className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Become a Seller</h1>
          <p className="text-sm text-muted-foreground">Apply to start selling on Ripple</p>
        </div>
      </div>

      {/* Rejected banner — let them re-apply */}
      {existing?.status === 'rejected' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 mb-6">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Previous application rejected</p>
            {existing.rejection_reason && <p className="text-sm text-muted-foreground mt-1">{existing.rejection_reason}</p>}
            <p className="text-xs text-muted-foreground mt-1">You can submit a new application below.</p>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
        <Store className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          Fill in the details below. Our team will review your application within <strong>2-3 business days</strong>.
          Once approved, you'll get access to the Seller Portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Brand Name *</label>
          <input
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="e.g. Maya Beauty"
            className={inputCls}
          />
        </div>

        {/* Seller Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Seller Name *</label>
          <input
            value={sellerName}
            onChange={e => setSellerName(e.target.value)}
            placeholder="Your full name (point of contact)"
            className={inputCls}
          />
        </div>

        {/* Store Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Store Name *</label>
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            placeholder="e.g. Maya's Beauty Store"
            className={inputCls}
          />
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Contact Email *</label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Contact Number *</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            placeholder="e.g. +91 90000 12345"
            className={inputCls}
          />
        </div>

        {/* Website / Store Link */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Website / Store Link</label>
          <input
            value={websiteLink}
            onChange={e => setWebsiteLink(e.target.value)}
            placeholder="https://yourstore.com"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground mt-1">Optional but recommended, if any</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Primary Category *</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a category</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">What do you sell? *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your products, brand story, and what makes you unique…"
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Shipping capability */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Can you handle shipping orders directly to customers?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: 'yes', label: 'Yes, I can handle shipping' },
              { value: 'no', label: "No, I can't manage shipping" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCanShip(opt.value as 'yes' | 'no')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition ${
                  canShip === opt.value
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    canShip === opt.value ? 'border-primary' : 'border-muted-foreground'
                  }`}
                >
                  {canShip === opt.value && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Helps us understand if you can fulfil orders independently or need our shipping support.
          </p>
        </div>

        {/* GST / Tax ID */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            GST No. <span className="text-muted-foreground font-normal">(Optional, but recommended)</span>
          </label>
          <input
            value={gstTaxId}
            onChange={e => setGstTaxId(e.target.value)}
            placeholder="e.g. 27AAAAA0000A1Z5"
            className={inputCls}
          />
        </div>

        {/* Social Media IDs */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Social Media IDs</label>
          <p className="text-xs text-muted-foreground mb-2">
            Add your personal social media and brand social media IDs (e.g. Instagram, YouTube handles — not full URLs).
          </p>
          {socialIds.map((val, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="flex items-center flex-1">
                <span className="px-3 py-3 rounded-l-xl bg-muted border border-r-0 border-border text-muted-foreground text-sm">@</span>
                <input
                  value={val}
                  onChange={e => updateSocialId(i, e.target.value)}
                  placeholder="yourhandle"
                  className={`${inputCls} rounded-l-none`}
                />
              </div>
              {socialIds.length > 1 && (
                <button type="button" onClick={() => removeSocialId(i)} className="p-3 rounded-xl bg-destructive/10 text-destructive">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSocialId} className="flex items-center gap-1.5 text-sm text-primary font-medium mt-1">
            <Plus className="w-4 h-4" /> Add another ID
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};

export default SellerApplicationPage;
