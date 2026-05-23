import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, MessageCircle, MapPin, Loader2, Send, Trash2, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  location: string | null;
  hashtags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
}
interface MediaRow { id: string; url: string; kind: 'image' | 'video'; sort_order: number; }
interface CommentRow { id: string; user_id: string; body: string; created_at: string; }
interface AuthorInfo { id: string; name: string | null; username: string | null; avatar_url: string | null; }

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<PostRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [mediaIdx, setMediaIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: m }, { data: c }, likeRes] = await Promise.all([
        supabase.from('posts' as any).select('*').eq('id', id).maybeSingle(),
        supabase.from('post_media' as any).select('*').eq('post_id', id).order('sort_order'),
        supabase.from('post_comments' as any).select('*').eq('post_id', id).order('created_at', { ascending: true }),
        userId ? supabase.from('post_likes' as any).select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setPost(p as any);
      setMedia((m as any) || []);
      const commentList = (c as any) || [];
      setComments(commentList);
      setLiked(!!likeRes.data);
      const ids = new Set<string>();
      if (p) ids.add((p as any).user_id);
      commentList.forEach((cc: CommentRow) => ids.add(cc.user_id));
      if (ids.size) {
        const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: Array.from(ids) });
        const map: Record<string, AuthorInfo> = {};
        ((profs as any[]) || []).forEach(pp => { map[pp.id] = pp; });
        setAuthors(map);
      }
      setLoading(false);
    };
    load();
  }, [id, userId]);

  const handleLike = async () => {
    if (!userId || !post) { navigate('/auth'); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setPost(p => p ? { ...p, like_count: Math.max(0, p.like_count + (newLiked ? 1 : -1)) } : p);
    if (newLiked) {
      await supabase.from('post_likes' as any).insert({ post_id: post.id, user_id: userId });
    } else {
      await supabase.from('post_likes' as any).delete().eq('post_id', post.id).eq('user_id', userId);
    }
  };

  const handleComment = async () => {
    if (!userId || !post) return;
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    const { data, error } = await supabase.from('post_comments' as any).insert({
      post_id: post.id, user_id: userId, body,
    }).select('*').single();
    setPosting(false);
    if (error || !data) {
      toast({ title: 'Could not comment', description: error?.message, variant: 'destructive' });
      return;
    }
    setComments(prev => [...prev, data as any]);
    setPost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p);
    setDraft('');
    if (!authors[userId]) {
      const { data: prof } = await supabase.rpc('get_public_profiles' as any, { _ids: [userId] });
      if (prof?.[0]) setAuthors(a => ({ ...a, [userId]: prof[0] as any }));
    }
  };

  const handleDeleteComment = async (cid: string) => {
    await supabase.from('post_comments' as any).delete().eq('id', cid);
    setComments(prev => prev.filter(c => c.id !== cid));
    setPost(p => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('Delete this post?')) return;
    await supabase.from('posts' as any).delete().eq('id', post.id);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#a0a0a0]">Post not found</div>;

  const author = authors[post.user_id];
  const isOwn = userId === post.user_id;
  const currentMedia = media[mediaIdx];

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-32 font-[Figtree] bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)]">
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-[#2a2a2a]/40">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
        </button>
        {isOwn && (
          <button onClick={handleDeletePost} className="px-3 py-2 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 text-xs font-semibold flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>

      {/* Author header */}
      <button
        onClick={() => navigate(isOwn ? '/profile' : `/u/${post.user_id}`)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left"
      >
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-[#2a2a2a]" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#ef4444]/40 flex items-center justify-center font-bold text-[#fafafa]">
            {(author?.name || author?.username || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-[Outfit] font-bold text-[#fafafa] text-sm truncate">{author?.name || author?.username || 'User'}</p>
          <p className="text-xs text-[#a0a0a0]">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
        </div>
      </button>

      {/* Media carousel */}
      {currentMedia && (
        <div className="relative mx-3 w-[calc(100%-1.5rem)] bg-[#161616] border border-[#2a2a2a]/50 aspect-[4/5] max-h-[60vh] rounded-3xl overflow-hidden">
          {currentMedia.kind === 'video' ? (
            <video src={currentMedia.url} className="w-full h-full object-contain" controls playsInline />
          ) : (
            <img src={currentMedia.url} alt="" className="w-full h-full object-contain" />
          )}
          {media.length > 1 && (
            <>
              <button
                onClick={() => setMediaIdx(i => Math.max(0, i - 1))}
                disabled={mediaIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0a0a0a]/80 backdrop-blur-sm text-[#fafafa] flex items-center justify-center disabled:opacity-30"
              ><ChevronLeft className="w-5 h-5" /></button>
              <button
                onClick={() => setMediaIdx(i => Math.min(media.length - 1, i + 1))}
                disabled={mediaIdx === media.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0a0a0a]/80 backdrop-blur-sm text-[#fafafa] flex items-center justify-center disabled:opacity-30"
              ><ChevronRight className="w-5 h-5" /></button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0a0a0a]/85 backdrop-blur-sm text-[#fafafa] text-[10px] font-semibold">
                {mediaIdx + 1} / {media.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pt-4">
        <button onClick={handleLike} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <Heart className={`w-6 h-6 ${liked ? 'fill-[#ef4444] text-[#ef4444]' : 'text-[#fafafa]'}`} />
          <span className="text-sm font-semibold text-[#fafafa]">{post.like_count}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-6 h-6 text-[#fafafa]" />
          <span className="text-sm font-semibold text-[#fafafa]">{post.comment_count}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-3">
        {post.title && <h2 className="font-[Outfit] text-lg font-bold text-[#fafafa] mb-1">{post.title}</h2>}
        {post.body && <p className="text-sm text-[#e5e5e5] whitespace-pre-wrap mb-2 leading-relaxed">{post.body}</p>}
        {post.location && (
          <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{post.location}</p>
        )}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.hashtags.map(h => (
              <span key={h} className="text-xs text-[#ef4444] font-semibold">#{h}</span>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="px-4 mt-6">
        <h3 className="font-[Outfit] text-xs font-bold text-[#a0a0a0] uppercase tracking-wider mb-3">Comments</h3>
        {comments.length === 0 ? (
          <p className="text-sm text-[#a0a0a0] text-center py-6">Be the first to comment.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map(c => {
              const a = authors[c.user_id];
              const mine = c.user_id === userId;
              return (
                <li key={c.id} className="flex gap-2.5 p-3 rounded-2xl bg-[#161616] border border-[#2a2a2a]/50">
                  {a?.avatar_url ? (
                    <img src={a.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#2a2a2a]" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#ef4444]/40 shrink-0 flex items-center justify-center text-xs font-bold text-[#fafafa]">
                      {(a?.name || a?.username || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#fafafa]">
                      {a?.name || a?.username || 'User'}
                      <span className="ml-2 text-[#a0a0a0] font-normal">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </p>
                    <p className="text-sm text-[#e5e5e5] whitespace-pre-wrap">{c.body}</p>
                  </div>
                  {(mine || isOwn) && (
                    <button onClick={() => handleDeleteComment(c.id)} aria-label="Delete" className="text-[#a0a0a0] hover:text-[#ef4444] p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Comment box */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-[#2a2a2a]/40 max-w-lg mx-auto px-3 py-2 flex items-center gap-2 safe-bottom">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
          placeholder="Add a comment…"
          className="flex-1 px-4 py-2.5 rounded-full bg-[#1a1a1a]/80 border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#ef4444]/60 focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm font-medium"
        />
        <button
          onClick={handleComment}
          disabled={!draft.trim() || posting}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white flex items-center justify-center shadow-md shadow-[#dc2626]/30 disabled:opacity-40 active:scale-95 transition-transform"
          aria-label="Send"
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default PostDetailPage;
