import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Sparkles, Heart, MessageCircle, Loader2, Play, Images } from 'lucide-react';
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

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    const tag = q.startsWith('#') ? q.slice(1) : q;
    return posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      p.hashtags.some(h => h.toLowerCase().includes(tag))
    );
  }, [posts, query]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Discover</h1>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search posts, #tags…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">No posts yet</p>
          <p className="text-muted-foreground text-sm mb-4">Be the first to share something.</p>
          <button onClick={() => navigate('/post/new')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Create a post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(p => {
            const author = authors[p.user_id];
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/p/${p.id}`)}
                className="w-full text-left rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors flex flex-col"
              >
                <div className="relative aspect-square bg-secondary overflow-hidden">
                  {p.cover_url ? (
                    p.cover_kind === 'video' ? (
                      <>
                        <video src={p.cover_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </span>
                      </>
                    ) : (
                      <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center p-3">
                      <span className="text-foreground text-xs font-semibold line-clamp-4 text-center">{p.title || p.body || 'Post'}</span>
                    </div>
                  )}
                  {p.media_count > 1 && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-0.5">
                      <Images className="w-3 h-3" /> {p.media_count}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  {p.title && <p className="font-bold text-foreground text-xs line-clamp-2 leading-snug mb-1">{p.title}</p>}
                  {p.hashtags.length > 0 && (
                    <p className="text-[10px] text-primary font-semibold truncate mb-1">
                      {p.hashtags.slice(0, 2).map(t => `#${t}`).join(' ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-secondary shrink-0" />
                      )}
                      <span className="truncate">{author?.username ? `@${author.username}` : author?.name || 'User'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatCount(p.like_count)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{formatCount(p.comment_count)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
