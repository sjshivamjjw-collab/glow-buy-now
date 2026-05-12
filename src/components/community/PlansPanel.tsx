import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import type { TierInfo } from '@/hooks/useCommunityMembership';

const loadRazorpay = (): Promise<boolean> => new Promise(resolve => {
  if ((window as any).Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

interface Props {
  communityId: string;
  communityName: string;
  tiers: TierInfo[];
  currentTier: TierInfo | null;
  isCreator: boolean;
  onJoined?: () => void;
}

export const PlansPanel = ({ communityId, communityName, tiers, currentTier, isCreator, onJoined }: Props) => {
  const { userId, userName, phone } = useAuth();
  const { toast } = useToast();
  const [joining, setJoining] = useState<string | null>(null);
  const currentLevel = currentTier?.sort_order ?? -1;

  const handleJoin = async (tier: TierInfo) => {
    if (!userId) return;
    setJoining(tier.id);
    try {
      if (tier.kind === 'free') {
        const { error } = await supabase.from('memberships' as any).insert({
          user_id: userId, community_id: communityId, tier_id: tier.id,
          status: 'active', source: 'free', started_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast({ title: `Welcome to ${communityName}!` });
        onJoined?.();
      } else {
        const ok = await loadRazorpay();
        if (!ok) { toast({ title: 'Could not load checkout', variant: 'destructive' }); return; }
        const { data, error } = await supabase.functions.invoke('create-membership-checkout', { body: { tier_id: tier.id } });
        if (error || !data) throw error || new Error('No data');
        const rzp = new (window as any).Razorpay({
          key: data.key_id, name: communityName, description: tier.name,
          ...(data.subscription_id
            ? { subscription_id: data.subscription_id }
            : { order_id: data.order_id, amount: data.amount, currency: 'INR' }),
          prefill: { name: userName || '', contact: phone || '' },
          theme: { color: '#dc2626' },
          handler: async (resp: any) => {
            const { error: vErr } = await supabase.functions.invoke('verify-membership-payment', {
              body: {
                membership_id: data.membership_id,
                ...(data.subscription_id
                  ? { razorpay_payment_id: resp.razorpay_payment_id, razorpay_subscription_id: data.subscription_id, razorpay_signature: resp.razorpay_signature }
                  : { razorpay_payment_id: resp.razorpay_payment_id, razorpay_order_id: data.order_id, razorpay_signature: resp.razorpay_signature }),
              },
            });
            if (vErr) { toast({ title: 'Payment verification failed', description: vErr.message, variant: 'destructive' }); return; }
            toast({ title: `You're in!`, description: `Welcome to ${communityName}.` });
            onJoined?.();
          },
          modal: { ondismiss: () => setJoining(null) },
        });
        rzp.open();
      }
    } catch (e: any) {
      toast({ title: 'Could not join', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setJoining(null);
    }
  };

  if (isCreator) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">You host this community. Members see these plans.</p>
        {tiers.map(t => (
          <div key={t.id} className="p-4 rounded-2xl border border-border bg-card">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-bold text-foreground">{t.name}</h3>
              <span className="font-extrabold text-foreground">
                {t.kind === 'free' ? 'Free' : `₹${Number(t.price_inr).toLocaleString()}`}
                {t.kind === 'paid_monthly' && <span className="text-xs font-normal text-muted-foreground"> / mo</span>}
              </span>
            </div>
            {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tiers.length === 0 && <p className="text-sm text-muted-foreground">No plans available yet.</p>}
      {tiers.map(t => {
        const isCurrent = t.id === currentTier?.id;
        const isLower = currentLevel >= 0 && t.sort_order < currentLevel;
        return (
          <div key={t.id} className={`p-4 rounded-2xl border ${isCurrent ? 'bg-primary/5 border-primary' : 'bg-card border-border'} ${isLower ? 'opacity-50' : ''}`}>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                {t.name}
                {isCurrent && <span className="text-[10px] uppercase tracking-wide text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Current</span>}
              </h3>
              <span className="font-extrabold text-foreground">
                {t.kind === 'free' ? 'Free' : `₹${Number(t.price_inr).toLocaleString()}`}
                {t.kind === 'paid_monthly' && <span className="text-xs font-normal text-muted-foreground"> / mo</span>}
              </span>
            </div>
            {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
            {!isCurrent && !isLower && (
              <button onClick={() => handleJoin(t)} disabled={joining === t.id}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                {joining === t.id ? 'Processing…' : currentLevel >= 0 ? `Upgrade to ${t.name}` : t.kind === 'free' ? 'Join free' : t.kind === 'paid_monthly' ? 'Subscribe' : 'Buy access'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
