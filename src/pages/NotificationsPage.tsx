import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, CheckCheck, X, Loader2 } from 'lucide-react';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const iconFor = (type: string) => {
  switch (type) {
    case 'like':    return <Heart className="w-5 h-5 text-red-500" />;
    case 'comment': return <MessageCircle className="w-5 h-5 text-primary" />;
    case 'follow':  return <UserPlus className="w-5 h-5 text-primary" />;
    default:        return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, markAsRead, markAllRead, remove } = useNotifications();

  const handleClick = (n: AppNotification) => {
    if (!n.read) markAsRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-14 pb-24 bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] font-[Figtree]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
          </button>
          <h1 className="font-[Outfit] text-xl font-bold text-[#fafafa]">
            Activity
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white rounded-full px-2 py-0.5 align-middle">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-[#ef4444]">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#dc2626] animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="w-16 h-16 text-[#2a2a2a] mb-4" />
          <p className="text-[#fafafa] font-semibold">No activity yet</p>
          <p className="text-[#a0a0a0] text-sm mt-1 text-center">
            Likes, comments, and new followers will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map(n => (
            <li
              key={n.id}
              className={`flex gap-3 p-3 rounded-2xl border transition-colors ${
                n.read
                  ? 'bg-[#161616] border-[#2a2a2a]/60'
                  : 'bg-[#ef4444]/10 border-[#ef4444]/30'
              }`}
            >
              <button onClick={() => handleClick(n)} className="flex gap-3 flex-1 text-left items-start">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]/50 flex items-center justify-center shrink-0">
                  {iconFor(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#fafafa] text-sm truncate">{n.title}</p>
                  {n.message && <p className="text-[#a0a0a0] text-xs line-clamp-2">{n.message}</p>}
                  <p className="text-[#6b6b6b] text-[10px] mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#ef4444] mt-2 shrink-0" />}
              </button>
              <button
                onClick={() => remove(n.id)}
                aria-label="Dismiss"
                className="w-8 h-8 rounded-lg hover:bg-[#1a1a1a] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
