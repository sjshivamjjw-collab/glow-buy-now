import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Video, Loader2, Globe, IndianRupee, RefreshCw, Zap } from 'lucide-react';

const PRICE_SUGGESTIONS = [99, 299, 499, 999];

type PostPerm = 'all_members' | 'moderators' | 'creator_only';

interface TierDraft {
  id: string;
  name: string;
  description: string;
  kind: 'free' | 'paid_monthly' | 'paid_one_time';
  price_inr: string;
  post_permission: PostPerm;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

const newId = () => Math.random().toString(36).slice(2, 10);

const CreateCommunityPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [social, setSocial] = useState({ youtube: '', instagram: '', x: '', website: '' });
  const [tiers, setTiers] = useState<TierDraft[]>([
    { id: newId(), name: 'Free', description: 'Get a taste of the community.', kind: 'free', price_inr: '', post_permission: 'all_members' },
  ]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (file: File, kind: 'cover' | 'video'): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split('.').pop();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('community-media').upload(path, file, { upsert: false });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data } = supabase.storage.from('community-media').getPublicUrl(path);
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

  const addTier = () =>
    setTiers(prev => [...prev, { id: newId(), name: '', description: '', kind: 'paid_monthly', price_inr: '', post_permission: 'all_members' }]);
  const removeTier = (id: string) => setTiers(prev => prev.filter(t => t.id !== id));
  const updateTier = (id: string, patch: Partial<TierDraft>) =>
    setTiers(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const handlePublish = async () => {
    if (!userId) return;
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    const validTiers = tiers.filter(t => t.name.trim());
    if (validTiers.length === 0) { toast({ title: 'Add at least one tier', variant: 'destructive' }); return; }
    for (const t of validTiers) {
      if (t.kind !== 'free' && (!t.price_inr || Number(t.price_inr) <= 0)) {
        toast({ title: `Set a price for "${t.name}"`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
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

    const tierRows = validTiers.map((t, idx) => ({
      community_id: (community as any).id,
      name: t.name.trim(),
      description: t.description.trim() || null,
      kind: t.kind,
      price_inr: t.kind === 'free' ? null : Number(t.price_inr),
      sort_order: idx,
      is_active: true,
    }));
    const { data: insertedTiers, error: tErr } = await supabase
      .from('community_tiers' as any).insert(tierRows).select();
    if (tErr) {
      setSaving(false);
      toast({ title: 'Could not save tiers', description: tErr.message, variant: 'destructive' });
      return;
    }

    // Auto-create one chat channel per tier with the chosen post permission
    const channelRows = (insertedTiers as any[] || []).map((tier, idx) => ({
      community_id: (community as any).id,
      name: `${tier.name} chat`,
      slug: `${slugify(tier.name)}-chat`,
      required_tier_level: tier.sort_order ?? idx,
      sort_order: tier.sort_order ?? idx,
      post_permission: validTiers[idx]?.post_permission ?? 'all_members',
    }));
    if (channelRows.length) {
      await supabase.from('community_channels' as any).insert(channelRows);
    }

    // Create Razorpay plans for monthly tiers (best-effort, non-blocking)
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

        {/* Outcomes */}
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

        {/* Social links */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Social links</label>
          <div className="space-y-2">
            {(['youtube', 'instagram', 'x', 'website'] as const).map(k => (
              <input key={k} value={(social as any)[k]} onChange={e => setSocial(prev => ({ ...prev, [k]: e.target.value }))}
                placeholder={k === 'website' ? 'Website URL' : `${k.charAt(0).toUpperCase() + k.slice(1)} URL`}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Pricing tiers</label>
          <div className="space-y-3">
            {tiers.map(t => (
              <div key={t.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <input value={t.name} onChange={e => updateTier(t.id, { name: e.target.value })}
                    placeholder="Tier name"
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  {tiers.length > 1 && (
                    <button onClick={() => removeTier(t.id)} className="p-2 rounded-lg bg-secondary text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea value={t.description} onChange={e => updateTier(t.id, { description: e.target.value })}
                  placeholder="What's included in this tier?" rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <div className="flex items-center gap-2">
                  <select value={t.kind} onChange={e => updateTier(t.id, { kind: e.target.value as any })}
                    className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none">
                    <option value="free">Free</option>
                    <option value="paid_monthly">Monthly subscription</option>
                    <option value="paid_one_time">One-time fee</option>
                  </select>
                  {t.kind !== 'free' && (
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <input value={t.price_inr} onChange={e => updateTier(t.id, { price_inr: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 rounded-lg bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Who can post in this tier's chat</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { v: 'all_members', label: 'Everyone' },
                      { v: 'moderators', label: 'Moderators' },
                      { v: 'creator_only', label: 'Admin only' },
                    ] as { v: PostPerm; label: string }[]).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateTier(t.id, { post_permission: opt.v })}
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
            <button onClick={addTier} className="flex items-center gap-1 text-primary text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add tier
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
