import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  sellerId: string;
  variant?: 'pill' | 'icon';
  className?: string;
}

const FollowButton = ({ sellerId, variant = 'pill', className }: FollowButtonProps) => {
  const { isAuthenticated, userId } = useAuth();
  const { isFollowing, toggle, loading } = useFollows();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // Don't allow following yourself
  if (userId === sellerId) return null;

  const following = isFollowing(sellerId);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: 'Sign in to follow', description: 'Log in to follow your favorite sellers.' });
      navigate('/auth');
      return;
    }
    setBusy(true);
    const { error } = await toggle(sellerId);
    setBusy(false);
    if (error) toast({ title: 'Could not update follow', description: error, variant: 'destructive' });
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handle}
        disabled={busy || loading}
        aria-label={following ? 'Unfollow' : 'Follow'}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          following ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
          className
        )}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={cn('w-5 h-5', following && 'fill-current')} />}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={busy || loading}
      className={cn(
        'px-5 h-10 rounded-full font-semibold text-sm transition-colors flex items-center gap-2',
        following
          ? 'bg-secondary text-foreground border border-border'
          : 'bg-primary text-primary-foreground',
        className
      )}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className={cn('w-4 h-4', following && 'fill-current')} />
      )}
      {following ? 'Following' : 'Follow'}
    </button>
  );
};

export default FollowButton;
