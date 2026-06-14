import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Sparkles } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';


type GateContext = {
  /** Returns true if signed in; otherwise opens the sign-in modal and returns false. */
  requireAuth: (action?: string) => boolean;
  openSignIn: (action?: string) => void;
};

const Ctx = createContext<GateContext | undefined>(undefined);

const ACTION_LABELS: Record<string, string> = {
  like: 'Sign in to like posts',
  save: 'Sign in to save posts',
  comment: 'Sign in to comment',
  follow: 'Sign in to follow people',
  post: 'Sign in to share a moment',
  block: 'Sign in to manage your account',
  report: 'Sign in to report content',
  notifications: 'Sign in to see your activity',
  profile: 'Sign in to view your profile',
  saved: 'Sign in to see your saved posts',
};

export const AuthGateProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Sign in to continue');
  const navigate = useNavigate();

  const openSignIn = useCallback((action?: string) => {
    setTitle((action && ACTION_LABELS[action]) || 'Sign in to continue');
    setOpen(true);
    track('signin_modal_opened', { action: action || 'generic' });
    track('signup_modal_shown', { trigger_action: action || 'generic' });
  }, []);


  const requireAuth = useCallback(
    (action?: string) => {
      if (isAuthenticated) return true;
      openSignIn(action);
      return false;
    },
    [isAuthenticated, openSignIn],
  );

  const signInWith = async (provider: 'google' | 'apple') => {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.redirected || result?.error) return;
    } catch {}
  };

  const goToPhone = () => {
    setOpen(false);
    navigate('/auth');
  };

  return (
    <Ctx.Provider value={{ requireAuth, openSignIn }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-[#111] border border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-[#ef4444]" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Join Ripple to share little moments, follow people you love, and save posts for later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => signInWith('google')}
              className="w-full bg-white text-black hover:bg-white/90"
            >
              Continue with Google
            </Button>
            <Button
              onClick={() => signInWith('apple')}
              className="w-full bg-black text-white border border-[#2a2a2a] hover:bg-[#1a1a1a]"
            >
              Continue with Apple
            </Button>
            <Button
              onClick={goToPhone}
              variant="outline"
              className="w-full bg-transparent border-[#2a2a2a] text-white hover:bg-[#1a1a1a]"
            >
              <Phone className="w-4 h-4 mr-2" />
              Use phone number
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
};

export const useAuthGate = (): GateContext => {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback so components don't crash if rendered outside the provider
    return {
      requireAuth: () => true,
      openSignIn: () => {},
    };
  }
  return ctx;
};
