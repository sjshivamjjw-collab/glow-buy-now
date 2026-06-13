import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/components/AuthGate';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const { openSignIn } = useAuthGate();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {!isAuthenticated && (
        <button
          onClick={() => openSignIn()}
          className="fixed top-3 right-3 z-40 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-xs font-semibold shadow-lg active:scale-95 transition-transform"
        >
          Sign in
        </button>
      )}
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
