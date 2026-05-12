import { useNavigate } from 'react-router-dom';
import { Livestream } from '@/types';
import { Eye, Clock, Star } from 'lucide-react';

const LivestreamCard = ({
  stream,
  size = 'default',
  sellerRating,
}: {
  stream: Livestream;
  size?: 'default' | 'large';
  sellerRating?: number;
}) => {
  const navigate = useNavigate();
  const isLive = stream.status === 'live';

  return (
    <button
      onClick={() => navigate(`/stream/${stream.id}`)}
      className={`relative rounded-2xl overflow-hidden bg-card group active:scale-[0.98] transition-transform ${
        size === 'large' ? 'aspect-[3/4]' : 'aspect-[3/4]'
      } w-full`}
    >
      <img
        src={stream.thumbnailUrl}
        alt={stream.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {isLive ? (
          <span className="px-2.5 py-1 rounded-full bg-live text-live-foreground text-xs font-bold flex items-center gap-1 live-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-live-foreground" />
            LIVE
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-foreground/60 text-primary-foreground text-xs font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        )}
        {isLive && (
          <span className="px-2 py-1 rounded-full bg-foreground/50 text-primary-foreground text-xs font-medium flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {stream.viewerCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <img src={stream.sellerAvatar} alt={stream.sellerName} className="w-6 h-6 rounded-full object-cover ring-2 ring-primary-foreground/30" />
          <span className="text-primary-foreground/90 text-xs font-semibold truncate">{stream.sellerName}</span>
          {typeof sellerRating === 'number' && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-foreground/50 text-primary-foreground text-[10px] font-bold shrink-0">
              <Star className="w-2.5 h-2.5 fill-warning text-warning" />
              {sellerRating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="text-primary-foreground font-bold text-sm leading-tight line-clamp-2">{stream.title}</h3>
        {!isLive && stream.scheduledAt && (
          <p className="text-primary-foreground/70 text-xs mt-1">
            {new Date(stream.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>
    </button>
  );
};

export default LivestreamCard;
