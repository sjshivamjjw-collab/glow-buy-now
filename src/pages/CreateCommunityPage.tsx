import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Video, Loader2, RefreshCw, Zap, Check, Paperclip, FileText } from 'lucide-react';

interface InfoAttachment { url: string; name: string; mime: string; size: number; }

const TENURE_OPTIONS = [1, 2, 3, 6, 12];

type PostPerm = 'all_members' | 'admins';

interface PaidTierDraft {
  id: string;
  name: string;
  description: string;
  kind: 'paid_monthly' | 'paid_one_time';
  price_inr: string;
  billing_period_months: number;
  trial_enabled: boolean;
  trial_days: string;
  post_permission: PostPerm;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

const newId = () => Math.random().toString(36).slice(2, 10);

const CreateCommunityPage = () => {
  const navigate = useNavigate();
  const { userId, isCreator, refreshRoles } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<InfoAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [social, setSocial] = useState<Record<string, string>>({});
  const [freeEnabled, setFreeEnabled] = useState(true);
  const [freeDescription, setFreeDescription] = useState('Get a taste of the community.');
  const [freePostPermission, setFreePostPermission] = useState<PostPerm>('all_members');
  const [paidTiers, setPaidTiers] = useState<PaidTierDraft[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (file: File, kind: 'cover' | 'video'): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split('.').pop();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('community-public').upload(path, file, { upsert: false });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('community-public').getPublicUrl(path);
    return data.publicUrl;
  };

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingCover(true);
    const url = await upload(f, 'cover');
    setUploadingCover(false);
    if (url) setCoverUrl(url);
  };
  const onVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingVideo(true);
    const url = await upload(f, 'video');
    setUploadingVideo(false);
    if (url) setIntroVideoUrl(url);
  };
  const onAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !userId) return;
    setUploadingAttachment(true);
    const uploaded: InfoAttachment[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop() || 'bin';
      const path = `${userId}/info-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('community-public').upload(path, f);
      if (error) { toast({ title: `Upload failed: ${f.name}`, description: error.message, variant: 'destructive' }); continue; }
      const { data } = supabase.storage.from('community-public').getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, name: f.name, mime: f.type, size: f.size });
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploadingAttachment(false);
    e.target.value = '';
  };

  const addPaidTier = () =>
    setPaidTiers(prev => [...prev, {
      id: newId(), name: '', description: '', kind: 'paid_monthly', price_inr: '',
      billing_period_months: 1, trial_enabled: false, trial_days: '7',
      post_permission: 'all_members',
    }]);
  const removePaidTier = (id: string) => setPaidTiers(prev => prev.filter(t => t.id !== id));
  const updatePaidTier = (id: string, patch: Partial<PaidTierDraft>) =>
    setPaidTiers(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const handlePublish = async () => {
    if (!userId) return;
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!freeEnabled && paidTiers.length === 0) {
      toast({ title: 'Add at least one tier', description: 'Enable the Free tier or add a paid tier.', variant: 'destructive' });
      return;
    }
    for (const t of paidTiers) {
      if (!t.name.trim()) { toast({ title: 'Name each paid tier', variant: 'destructive' }); return; }
      if (!t.price_inr || Number(t.price_inr) <= 0) {
        toast({ title: `Set a price for "${t.name || 'paid tier'}"`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);

    if (!isCreator) {
      const { error: rcErr } = await supabase.rpc('become_creator' as any);
      if (rcErr) {
        setSaving(false);
        toast({ title: 'Could not enable creator mode', description: rcErr.message, variant: 'destructive' });
        return;
      }
      await refreshRoles();
    }

    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanOutcomes = outcomes.map(o => o.trim()).filter(Boolean);
    const cleanSocial: Record<string, string> = {};
    Object.entries(social).forEach(([k, v]) => { if (v.trim()) cleanSocial[k] = v.trim(); });

    const { data: community, error: cErr } = await supabase
      .from('communities' as any)
      .insert({
        creator_id: userId,
        slug,
        name: name.trim(),
        description: description.trim() || null,
        cover_url: coverUrl,
        intro_video_url: introVideoUrl,
        info_attachments: attachments,
        key_outcomes: cleanOutcomes,
        social_links: cleanSocial,
        is_published: true,
      })
      .select()
      .single();

    if (cErr || !community) {
      setSaving(false);
      toast({ title: 'Could not create community', description: cErr?.message, variant: 'destructive' });
      return;
    }

    // Build the ordered tier list: free first (if enabled), then paid tiers
    const ordered: Array<{
      payload: any;
      post_permission: PostPerm;
    }> = [];
    if (freeEnabled) {
      ordered.push({
        payload: {
          community_id: (community as any).id,
          name: 'Free',
          description: freeDescription.trim() || null,
          kind: 'free',
          price_inr: null,
          billing_period_months: 1,
          trial_days: 0,
          sort_order: 0,
          is_active: true,
        },
        post_permission: freePostPermission,
      });
    }
    paidTiers.forEach((t, i) => {
      ordered.push({
        payload: {
          community_id: (community as any).id,
          name: t.name.trim(),
          description: t.description.trim() || null,
          kind: t.kind,
          price_inr: Number(t.price_inr),
          billing_period_months: t.kind === 'paid_monthly' ? (t.billing_period_months || 1) : 1,
          trial_days: t.kind === 'paid_monthly' && t.trial_enabled ? (Number(t.trial_days) || 0) : 0,
          sort_order: ordered.length + i - (freeEnabled ? 0 : 0),
          is_active: true,
        },
        post_permission: t.post_permission,
      });
    });
    // Re-index sort_order cleanly
    ordered.forEach((o, idx) => { o.payload.sort_order = idx; });

    const tierRows = ordered.map(o => o.payload);
    const { data: insertedTiers, error: tErr } = await supabase
      .from('community_tiers' as any).insert(tierRows).select();
    if (tErr) {
      setSaving(false);
      toast({ title: 'Could not save tiers', description: tErr.message, variant: 'destructive' });
      return;
    }

    const channelRows = (insertedTiers as any[] || []).map((tier, idx) => {
      const isFree = tier.kind === 'free';
      const channelName = isFree ? 'General' : `${tier.name} chat`;
      return {
        community_id: (community as any).id,
        name: channelName,
        slug: isFree ? 'general' : `${slugify(tier.name)}-chat`,
        required_tier_level: tier.sort_order ?? idx,
        sort_order: tier.sort_order ?? idx,
        post_permission: ordered[idx]?.post_permission ?? 'all_members',
      };
    });
    if (channelRows.length) {
      await supabase.from('community_channels' as any).insert(channelRows);
    }

    const monthlyIds = (insertedTiers as any[] || []).filter(t => t.kind === 'paid_monthly').map(t => t.id);
    if (monthlyIds.length) {
      await Promise.all(monthlyIds.map(id =>
        supabase.functions.invoke('create-tier-plan', { body: { tier_id: id } }).catch(() => null)
      ));
    }

    setSaving(false);
    toast({
      title: 'Submitted for review',
      description: 'Your community will go live once an admin approves it.',
    });
    navigate('/creator');
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">New community</h1>
      </div>

      <div className="space-y-5">
        {/* Cover */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Cover image</label>
          {coverUrl ? (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-secondary relative">
              <img src={coverUrl} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setCoverUrl(null)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="aspect-[16/9] rounded-2xl bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer">
              {uploadingCover ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <>
                <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Tap to upload</span>
              </>}
              <input type="file" accept="image/*" className="hidden" onChange={onCover} />
            </label>
          )}
        </div>

        {/* Name + description */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My awesome community"
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this community about?" rows={4}
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
        </div>

        {/* Intro video */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Intro video (optional)</label>
          {introVideoUrl ? (
            <div className="aspect-video rounded-2xl overflow-hidden bg-black relative">
              <video src={introVideoUrl} controls className="w-full h-full" />
              <button onClick={() => setIntroVideoUrl(null)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="h-20 rounded-2xl bg-secondary border-2 border-dashed border-border flex items-center justify-center gap-2 cursor-pointer text-muted-foreground text-sm">
              {uploadingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Video className="w-5 h-5" /> Upload intro video</>}
              <input type="file" accept="video/*" className="hidden" onChange={onVideo} />
            </label>
          )}
        </div>

        {/* Info attachments (docs / images) */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">
            Documents & images (optional)
          </label>
          <p className="text-[11px] text-muted-foreground mb-2">Share PDFs, slides, images or any file to give members more info before they join.</p>
          {attachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-secondary">
                  {a.mime?.startsWith('image/') ? (
                    <img src={a.url} alt={a.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="h-16 rounded-2xl bg-secondary border-2 border-dashed border-border flex items-center justify-center gap-2 cursor-pointer text-muted-foreground text-sm">
            {uploadingAttachment ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Paperclip className="w-5 h-5" /> Add files (multiple)</>}
            <input type="file" multiple className="hidden" onChange={onAttachments} />
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Key outcomes</label>
          <div className="space-y-2">
            {outcomes.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={e => setOutcomes(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="What will members achieve?"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <button onClick={() => setOutcomes(prev => prev.filter((_, j) => j !== i))}
                  className="p-2 rounded-xl bg-secondary text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setOutcomes(prev => [...prev, ''])}
              className="flex items-center gap-1 text-primary text-sm font-semibold"><Plus className="w-4 h-4" /> Add outcome</button>
          </div>
        </div>

        {/* Social links — opt-in */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Social links (optional)</label>
          {(() => {
            const ALL = ['youtube', 'instagram', 'x', 'website'] as const;
            const labels: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', x: 'X (Twitter)', website: 'Website' };
            const active = ALL.filter(k => k in social);
            const remaining = ALL.filter(k => !(k in social));
            return (
              <div className="space-y-2">
                {active.map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <input value={(social as any)[k] ?? ''} onChange={e => setSocial(prev => ({ ...prev, [k]: e.target.value }))}
                      placeholder={`${labels[k]} URL`}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                    <button type="button" onClick={() => setSocial(prev => { const n: any = { ...prev }; delete n[k]; return n; })}
                      className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {remaining.length > 0 && (
                  <select value="" onChange={e => { if (e.target.value) setSocial(prev => ({ ...prev, [e.target.value]: '' })); }}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">+ Add a social link…</option>
                    {remaining.map(k => <option key={k} value={k}>{labels[k]}</option>)}
                  </select>
                )}
              </div>
            );
          })()}
        </div>


        {/* Pricing tiers — simplified */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-muted-foreground block">Pricing tiers</label>

          {/* Free tier */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setFreeEnabled(v => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  freeEnabled ? 'bg-primary border-primary' : 'border-muted-foreground/40 bg-background'
                }`}
              >
                {freeEnabled && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </button>
              <span className="text-sm font-semibold text-foreground">Free tier</span>
              <span className="text-[11px] text-muted-foreground">Anyone can join</span>
            </label>
            {freeEnabled && (
              <>
                <textarea
                  value={freeDescription}
                  onChange={e => setFreeDescription(e.target.value)}
                  placeholder="Short description (e.g. Get a taste of the community.)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Who can post in the General channel</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { v: 'all_members', label: 'Everyone' },
                      { v: 'admins', label: 'Admins' },
                    ] as { v: PostPerm; label: string }[]).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setFreePostPermission(opt.v)}
                        className={`px-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          freePostPermission === opt.v
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground hover:bg-secondary/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Paid tiers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Paid access tiers</p>
              <span className="text-[11px] text-muted-foreground">Optional</span>
            </div>

            {paidTiers.map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={t.name}
                    onChange={e => updatePaidTier(t.id, { name: e.target.value })}
                    placeholder="Tier name (e.g. Premium)"
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={() => removePaidTier(t.id)} className="p-2 rounded-lg bg-secondary text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">What's included in this plan</p>
                  <textarea
                    value={t.description}
                    onChange={e => updatePaidTier(t.id, { description: e.target.value })}
                    placeholder="e.g. Weekly live calls, exclusive content, private chat access"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updatePaidTier(t.id, { kind: 'paid_monthly' })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      t.kind === 'paid_monthly' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recurring
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePaidTier(t.id, { kind: 'paid_one_time' })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      t.kind === 'paid_one_time' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" /> One-time
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <input
                      value={t.price_inr}
                      onChange={e => updatePaidTier(t.id, { price_inr: e.target.value.replace(/[^0-9]/g, '') })}
                      placeholder="Price"
                      inputMode="numeric"
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="px-3 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-semibold">INR</div>
                </div>

                {t.kind === 'paid_monthly' && (
                  <>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Billing tenure</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TENURE_OPTIONS.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => updatePaidTier(t.id, { billing_period_months: m })}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                              t.billing_period_months === m
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-foreground hover:bg-secondary/70'
                            }`}
                          >
                            {m === 1 ? '1 month' : `${m} months`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                        <button
                          type="button"
                          onClick={() => updatePaidTier(t.id, { trial_enabled: !t.trial_enabled })}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            t.trial_enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40 bg-background'
                          }`}
                        >
                          {t.trial_enabled && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                        <span className="text-[11px] font-semibold text-muted-foreground">Offer free trial</span>
                      </label>
                      {t.trial_enabled && (
                        <div className="flex items-center gap-2">
                          <input
                            value={t.trial_days}
                            onChange={e => updatePaidTier(t.id, { trial_days: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })}
                            placeholder="7"
                            inputMode="numeric"
                            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <div className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold">days</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Who can post in this tier's chat</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { v: 'all_members', label: 'Everyone' },
                      { v: 'admins', label: 'Admins' },
                    ] as { v: PostPerm; label: string }[]).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updatePaidTier(t.id, { post_permission: opt.v })}
                        className={`px-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          t.post_permission === opt.v
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground hover:bg-secondary/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addPaidTier} className="flex items-center gap-1 text-primary text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add paid tier
            </button>
          </div>
        </div>

        <button onClick={handlePublish} disabled={saving}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
          {saving ? 'Publishing…' : 'Publish community'}
        </button>
      </div>
    </div>
  );
};

export default CreateCommunityPage;
