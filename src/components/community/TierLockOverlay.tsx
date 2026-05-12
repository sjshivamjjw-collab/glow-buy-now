import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TierInfo } from '@/hooks/useCommunityMembership';

interface Props {
  requiredLevel: number;
  tiers: TierInfo[];
  slug: string;
  compact?: boolean;
  label?: string;
}

export const TierLockOverlay = ({ requiredLevel, tiers, slug, compact, label }: Props) => {
  const navigate = useNavigate();
  const requiredTier = tiers.find(t => t.sort_order === requiredLevel)
    || tiers.filter(t => t.sort_order >= requiredLevel).sort((a, b) => a.sort_order - b.sort_order)[0];
  const tierName = requiredTier?.name || 'Premium';

  if (compact) {
    return (
      <button onClick={() => navigate(`/c/${slug}`)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-foreground truncate">
            {label || 'Locked'} · upgrade to <strong>{tierName}</strong>
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-700 shrink-0">Upgrade</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/10 to-pink-500/10 border border-amber-500/30 p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/20 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-amber-600" />
      </div>
      <h4 className="font-bold text-foreground mb-1">{tierName} only</h4>
      <p className="text-sm text-muted-foreground mb-4">
        {label || 'Upgrade your membership to unlock this.'}
      </p>
      <button onClick={() => navigate(`/c/${slug}`)}
        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
        See {tierName}
      </button>
    </div>
  );
};
