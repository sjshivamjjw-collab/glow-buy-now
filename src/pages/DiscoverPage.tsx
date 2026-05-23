import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Sparkles, Heart, MessageCircle, Loader2, Play, Images, MapPin, TrendingUp } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface TrendingPost {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  location: string | null;
  hashtags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  cover_url: string | null;
  cover_kind: 'image' | 'video' | null;
  media_count: number;
}

interface AuthorInfo {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// Deterministic staggered heights for richer masonry feel when images
// don't expose their natural ratio yet.
const LEFT_HEIGHTS = [280, 320, 260, 300, 290, 310];
const RIGHT_HEIGHTS = [180, 220, 200, 240, 190, 210];

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string>('For you');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_trending_posts' as any, { _limit: 80, _offset: 0 });
      const list = (data as TrendingPost[] | null) ?? [];
      setPosts(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map(p => p.user_id)));
        const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: ids });
        const map: Record<string, AuthorInfo> = {};
        ((profs as any[]) || []).forEach(p => { map[p.id] = p; });
        setAuthors(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach(p => p.hashtags.forEach(h => counts.set(h, (counts.get(h) || 0) + 1)));
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([h]) => `#${h}`);
    return ['For you', 'Trending', ...top];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = posts;
    if (activeChip.startsWith('#')) {
      const tag = activeChip.slice(1).toLowerCase();
      list = list.filter(p => p.hashtags.some(h => h.toLowerCase() === tag));
    } else if (activeChip === 'Trending') {
      list = [...list].sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
    }
    if (!q) return list;
    const tag = q.startsWith('#') ? q.slice(1) : q;
    return list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      p.hashtags.some(h => h.toLowerCase().includes(tag))
    );
  }, [posts, query, activeChip]);

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-24 font-[Figtree] bg-[linear-gradient(180deg,#fdf6f9_0%,#faf3f7_40%,#f6eef5_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#fdf6f9]/70 border-b border-[#e8c5d0]/40 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-[Outfit] text-3xl font-extrabold tracking-tight text-[#3a1f3a]">
            Discover
          </h1>
          <button
            onClick={() => navigate('/post/new')}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a0dc] to-[#9b72cf] text-white flex items-center justify-center shadow-md shadow-[#9b72cf]/30 active:scale-95 transition-transform"
            aria-label="Create post"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b72cf]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search posts, people, #tags…"
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white/80 border border-[#e8c5d0]/60 text-[#3a1f3a] placeholder:text-[#9b72cf]/60 focus:outline-none focus:ring-2 focus:ring-[#c9a0dc]/40 text-sm font-medium"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 mt-3 scrollbar-none">
          {chips.map(chip => {
            const active = chip === activeChip;
            return (
              <button
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#3a1f3a] text-[#f8e8ee] shadow-sm'
                    : 'bg-white/70 text-[#6b4a6b] border border-[#e8c5d0]/60 hover:border-[#c9a0dc]'
                }`}
              >
                {chip === 'Trending' ? (
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{chip}</span>
                ) : chip}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#9b72cf]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f8e8ee] to-[#c9a0dc]/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-[#9b72cf]" />
            </div>
            <p className="font-[Outfit] text-[#3a1f3a] font-bold text-lg mb-1">Nothing here yet</p>
            <p className="text-[#6b4a6b] text-sm mb-5">Be the first to share something beautiful.</p>
            <button onClick={() => navigate('/post/new')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-br from-[#c9a0dc] to-[#9b72cf] text-white text-sm font-semibold shadow-md shadow-[#9b72cf]/30">
              Create a post
            </button>
          </div>
        ) : (() => {
          const renderCard = (p: TrendingPost, h: number) => {
            const author = authors[p.user_id];
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/p/${p.id}`)}
                className="group mb-3 w-full text-left rounded-3xl overflow-hidden bg-white border border-[#e8c5d0]/50 hover:border-[#c9a0dc] hover:shadow-lg hover:shadow-[#9b72cf]/10 transition-all duration-300"
              >
                {/* Media */}
                <div className="relative w-full bg-[#f8e8ee] overflow-hidden" style={{ height: `${h}px` }}>
                  {p.cover_url ? (
                    p.cover_kind === 'video' ? (
                      <>
                        <video src={p.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted playsInline preload="metadata" />
                        <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </span>
                      </>
                    ) : (
                      <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f8e8ee] via-[#e8c5d0]/60 to-[#c9a0dc]/40 flex items-center justify-center p-4">
                      <span className="font-[Outfit] text-[#3a1f3a] text-sm font-semibold line-clamp-5 text-center">
                        {p.title || p.body || 'Post'}
                      </span>
                    </div>
                  )}
                  {p.media_count > 1 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1">
                      <Images className="w-3 h-3" /> {p.media_count}
                    </span>
                  )}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[#3a1f3a] text-[11px] font-semibold">
                    <Heart className="w-3 h-3 fill-[#e84d8a] text-[#e84d8a]" />
                    {formatCount(p.like_count)}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 pt-2.5 pb-3">
                  {p.title && (
                    <p className="font-[Outfit] font-semibold text-[#3a1f3a] text-sm leading-snug line-clamp-2 mb-1.5">
                      {p.title}
                    </p>
                  )}
                  {p.location && (
                    <p className="flex items-center gap-1 text-[10px] text-[#9b72cf] font-medium mb-2 truncate">
                      <MapPin className="w-2.5 h-2.5" />{p.location}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-[#e8c5d0]" alt="" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#e8c5d0] to-[#c9a0dc] shrink-0" />
                      )}
                      <span className="truncate text-[11px] font-semibold text-[#6b4a6b]">
                        {author?.username ? `@${author.username}` : author?.name || 'User'}
                      </span>
                    </div>
                    <span className="flex items-center gap-0.5 text-[11px] text-[#9b72cf] font-medium shrink-0">
                      <MessageCircle className="w-3 h-3" />{formatCount(p.comment_count)}
                    </span>
                  </div>
                </div>
              </button>
            );
          };

          const leftItems = filtered.filter((_, i) => i % 2 === 0);
          const rightItems = filtered.filter((_, i) => i % 2 === 1);

          return (
            <div className="grid grid-cols-2 gap-3">
              <div>{leftItems.map((p, i) => renderCard(p, LEFT_HEIGHTS[i % LEFT_HEIGHTS.length]))}</div>
              <div>{rightItems.map((p, i) => renderCard(p, RIGHT_HEIGHTS[i % RIGHT_HEIGHTS.length]))}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DiscoverPage;
