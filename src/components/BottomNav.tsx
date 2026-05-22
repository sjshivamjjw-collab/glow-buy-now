import { Compass, Bell, User, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const tabs = [
    { icon: Compass, label: 'Discover', path: '/' },
    { icon: Plus, label: 'Post', path: '/post/new', accent: true },
    { icon: Bell, label: 'Activity', path: '/notifications', badge: unreadCount },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
        {tabs.map(({ icon: Icon, label, path, accent, badge }) => {
          const isActive = location.pathname === path;
          if (accent) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative -mt-6 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label={label}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            );
          }
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
              {!!badge && badge > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
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
