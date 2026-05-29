import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bookmark, Loader2, Heart, MessageCircle, Play, Images } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';

interface SavedPost {
  id: string;
  title: string | null;
  body: string | null;
  like_count: number;
  comment_count: number;
  cover_url: string | null;
  cover_kind: 'image' | 'video' | null;
  media_count: number;
}

const SavedPostsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const { data: saves } = await supabase
        .from('post_saves' as any)
        .select('post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      const ids = ((saves as any[]) || []).map(s => s.post_id);
      if (!ids.length) { setPosts([]); setLoading(false); return; }
      const { data: postsData } = await supabase
        .from('posts_public' as any)
        .select('id, title, body, like_count, comment_count')
        .in('id', ids);
      const { data: mediaData } = await supabase
        .from('post_media' as any)
        .select('post_id, url, kind, sort_order')
        .in('post_id', ids)
        .order('sort_order');
      const mediaMap: Record<string, { url: string; kind: 'image' | 'video' }[]> = {};
      ((mediaData as any[]) || []).forEach(m => {
        if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
        mediaMap[m.post_id].push({ url: m.url, kind: m.kind });
      });
      const byId: Record<string, any> = {};
      ((postsData as any[]) || []).forEach(p => { byId[p.id] = p; });
      const ordered: SavedPost[] = ids
        .filter(id => byId[id])
        .map(id => {
          const p = byId[id];
          const media = mediaMap[id] || [];
          return {
            id: p.id,
            title: p.title,
            body: p.body,
            like_count: p.like_count,
            comment_count: p.comment_count,
            cover_url: media[0]?.url || null,
            cover_kind: media[0]?.kind || null,
            media_count: media.length,
          };
        });
      setPosts(ordered);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-24 font-[Figtree] bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)]">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a0a]/70 border-b border-[#2a2a2a]/40 px-4 pt-12 pb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-[#ef4444]" />
          <h1 className="font-[Outfit] text-3xl font-extrabold tracking-tight text-[#fafafa]">Saved</h1>
        </div>
      </div>

      <div className="px-3 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#ef4444]/40 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-7 h-7 text-[#ef4444]" />
            </div>
            <p className="font-[Outfit] text-[#fafafa] font-bold text-lg mb-1">No saved posts yet</p>
            <p className="text-[#a0a0a0] text-sm">Tap the bookmark icon on any post to save it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {posts.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/p/${p.id}`)}
                className="group w-full text-left rounded-3xl overflow-hidden bg-[#161616] border border-[#2a2a2a]/50 hover:border-[#ef4444] transition-all duration-300"
              >
                <div className="relative w-full bg-[#1a1a1a] overflow-hidden aspect-[3/4]">
                  {p.cover_url ? (
                    p.cover_kind === 'video' ? (
                      <>
                        <LazyVideoThumbnail src={p.cover_url} className="w-full h-full" />
                        <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </span>
                      </>
                    ) : (
                      <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a]/60 to-[#ef4444]/40 flex items-center justify-center p-4">
                      <span className="font-[Outfit] text-[#fafafa] text-sm font-semibold line-clamp-5 text-center">
                        {p.title || p.body || 'Post'}
                      </span>
                    </div>
                  )}
                  {p.media_count > 1 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1">
                      <Images className="w-3 h-3" /> {p.media_count}
                    </span>
                  )}
                </div>
                <div className="px-3 pt-2 pb-2.5">
                  {p.title && (
                    <p className="font-[Outfit] font-semibold text-[#fafafa] text-sm leading-snug line-clamp-2 mb-1.5">
                      {p.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-[#ef4444] font-medium">
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3 fill-[#ef4444]" />{formatCount(p.like_count)}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{formatCount(p.comment_count)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPostsPage;
