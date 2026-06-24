import { Compass, Bell, User, Plus, Film } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/components/AuthGate';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const { openSignIn } = useAuthGate();

  // Map tab → gate key. Discover stays open for everyone; everything else
  // requires sign-in on the web (and is unreachable for unauth on native).
  const tabs = [
    { icon: Compass, label: 'Discover', path: '/', gate: null as string | null },
    { icon: Film, label: 'Create Reel', path: '/reel/new', gate: null as string | null },
    { icon: Plus, label: 'Post', path: '/post/new', accent: true, gate: 'post' },
    { icon: Bell, label: 'Activity', path: '/notifications', badge: unreadCount, gate: 'notifications' },
    { icon: User, label: 'Profile', path: '/profile', gate: 'profile' },
  ];


  const handleNav = (path: string, gate: string | null) => {
    if (gate && !isAuthenticated) {
      openSignIn(gate);
      return;
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 mx-auto w-full max-w-lg bg-[#0a0a0a] border-t border-[#2a2a2a] safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map(({ icon: Icon, label, path, accent, badge, gate }) => {
          const isActive = location.pathname === path;
          if (accent) {
            return (
              <button
                key={path}
                onClick={() => handleNav(path, gate)}
                className="relative -mt-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(239,68,68,0.6)] ring-4 ring-[#0a0a0a] active:scale-95 transition-transform"
                aria-label={label}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            );
          }
          return (
            <button
              key={path}
              onClick={() => handleNav(path, gate)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-[#ef4444]' : 'text-[#a0a0a0]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
              {!!badge && badge > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>

  );
};

export default BottomNav;
