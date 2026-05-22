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
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            Activity
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 align-middle">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-semibold">No activity yet</p>
          <p className="text-muted-foreground/60 text-sm mt-1 text-center">
            Likes, comments, and new followers will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map(n => (
            <li
              key={n.id}
              className={`flex gap-3 p-3 rounded-2xl border transition-colors ${
                n.read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20'
              }`}
            >
              <button onClick={() => handleClick(n)} className="flex gap-3 flex-1 text-left items-start">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  {iconFor(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{n.title}</p>
                  {n.message && <p className="text-muted-foreground text-xs line-clamp-2">{n.message}</p>}
                  <p className="text-muted-foreground/60 text-[10px] mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
              </button>
              <button
                onClick={() => remove(n.id)}
                aria-label="Dismiss"
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
