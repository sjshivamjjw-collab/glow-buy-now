import { Compass, Users, Bell, User, LayoutDashboard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCreator } = useAuth();
  const { unreadCount } = useNotifications();

  const tabs = [
    { icon: Compass, label: 'Discover', path: '/' },
    { icon: Users, label: 'Mine', path: '/mine' },
    ...(isCreator ? [{ icon: LayoutDashboard, label: 'Creator', path: '/creator' }] : []),
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadCount },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
        {tabs.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path;
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
              {badge && badge > 0 ? (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
