import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, MessageCircle, MapPin, Loader2, Send, Trash2, ChevronLeft, ChevronRight, Bookmark, Share2, Reply, X, Music, Play, Pause, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { getCommentPrompt } from '@/lib/commentPrompts';
import { renderRichText } from '@/lib/richText';
import { PenguinAvatar, RIPPLER_NAME } from '@/components/RipplerIdentity';


const CATEGORY_META: Record<string, { label: string }> = {
  everyday_vibes: { label: 'Daily Life' },
  showcase: { label: 'Show & Tell' },
  trip: { label: 'Travel Diaries' },
  review: { label: 'Review' },
  real_talk: { label: 'Advice and Tips' },
  hidden_gems: { label: 'Work Diaries' },
};

interface PostRow {
  id: string;
  user_id: string | null;
  title: string | null;
  body: string | null;
  location: string | null;
  hashtags: string[];
  category: string | null;
  review_subcategory: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  music_url: string | null;
  music_title: string | null;
  is_anonymous?: boolean;
}
interface MediaRow { id: string; url: string; kind: 'image' | 'video'; sort_order: number; }
interface CommentRow { id: string; user_id: string | null; body: string; created_at: string; parent_id: string | null; like_count: number; is_anonymous?: boolean; }
interface AuthorInfo { id: string; name: string | null; username: string | null; avatar_url: string | null; }

const PostMusicPlayer = ({ url, title }: { url: string; title: string | null }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const ensureAudio = () => {
    let a = audioRef.current;
    if (!a) {
      a = new Audio(url);
      a.crossOrigin = 'anonymous';
      a.preload = 'metadata';
      a.loop = true;
      a.onended = () => setPlaying(false);
      a.onerror = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      audioRef.current = a;
    }
    return a;
  };

  useEffect(() => {
    const onStop = () => { audioRef.current?.pause(); };
    window.addEventListener('post-music-stop', onStop);
    return () => {
      window.removeEventListener('post-music-stop', onStop);
      audioRef.current?.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const toggle = () => {
    const a = ensureAudio();
    if (playing) {
      a.pause();
    } else {
      a.muted = false;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-full bg-[#1a1a1a]/80 border border-[#2a2a2a]/60">
      <Music className={`w-3 h-3 text-[#ef4444] shrink-0 ${playing ? 'animate-pulse' : ''}`} />
      <button
        onClick={toggle}
        className="text-[10px] font-medium text-[#fafafa]/90 truncate max-w-[200px] hover:text-[#ef4444]"
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {title || 'Music'}
      </button>
    </div>
  );
};

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<PostRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState('');
  const [mediaIdx, setMediaIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [ownComments, setOwnComments] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [commentAnonymously, setCommentAnonymously] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const [draftCursor, setDraftCursor] = useState<number | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showCommentBar, setShowCommentBar] = useState(false);
  const currentMedia = media[mediaIdx];
  const mention = useMentionAutocomplete({
    value: draft,
    cursor: draftCursor,
    onPick: ({ value, cursor }) => {
      setDraft(value);
      requestAnimationFrame(() => {
        const el = draftInputRef.current;
        if (el) { el.focus(); el.setSelectionRange(cursor, cursor); setDraftCursor(cursor); }
      });
    },
  });


  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: m }, { data: c }, likeRes, saveRes, ownRes] = await Promise.all([
        // posts_public masks user_id on anonymous posts
        supabase.from('posts_public' as any).select('*').eq('id', id).maybeSingle(),
        supabase.from('post_media' as any).select('*').eq('post_id', id).order('sort_order'),
        supabase.from('post_comments' as any).select('*').eq('post_id', id).order('created_at', { ascending: true }),
        userId ? supabase.from('post_likes' as any).select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        userId ? supabase.from('post_saves' as any).select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        // Base-table read returns user_id only for owners/admins (RLS-enforced).
        userId ? supabase.from('posts' as any).select('user_id').eq('id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setPost(p as any);
      setMedia((m as any) || []);
      const commentList = (c as any) || [];
      setComments(commentList);
      setLiked(!!likeRes.data);
      setSaved(!!saveRes.data);
      setIsOwn(!!ownRes.data);
      const ids = new Set<string>();
      // Skip author lookup for anonymous posts — user_id is null in posts_public anyway.
      if (p && (p as any).user_id && !(p as any).is_anonymous) ids.add((p as any).user_id);
      commentList.forEach((cc: CommentRow) => ids.add(cc.user_id));
      if (ids.size) {
        const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: Array.from(ids) });
        const map: Record<string, AuthorInfo> = {};
        ((profs as any[]) || []).forEach(pp => { map[pp.id] = pp; });
        setAuthors(map);
      }
      if (userId && commentList.length) {
        const { data: cl } = await supabase
          .from('post_comment_likes' as any)
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', commentList.map((cc: CommentRow) => cc.id));
        setLikedComments(new Set(((cl as any[]) || []).map(r => r.comment_id)));
      }
      setLoading(false);
    };
    load();
  }, [id, userId]);

  useEffect(() => {
    const el = commentsSectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowCommentBar(entry.isIntersecting),
      { rootMargin: '0px 0px -20% 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || currentMedia?.kind !== 'video') return;
    let inView = true;
    const pause = () => el.pause();
    const playIfVisible = () => {
      if (!document.hidden && inView) el.play().catch(() => {});
    };
    const onVis = () => { document.hidden ? pause() : playIfVisible(); };
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      inView ? playIfVisible() : pause();
    }, { threshold: 0.35 });
    io.observe(el);
    document.addEventListener('visibilitychange', onVis);
    playIfVisible();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      pause();
    };
  }, [currentMedia?.id, currentMedia?.kind]);

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

  const handleSave = async () => {
    if (!userId || !post) { navigate('/auth'); return; }
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await supabase.from('post_saves' as any).insert({ post_id: post.id, user_id: userId });
    } else {
      await supabase.from('post_saves' as any).delete().eq('post_id', post.id).eq('user_id', userId);
    }
  };


  const handleComment = async () => {
    if (!userId || !post) { navigate('/auth'); return; }
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    const { data, error } = await supabase.from('post_comments' as any).insert({
      post_id: post.id, user_id: userId, body, parent_id: replyTo?.id ?? null,
    }).select('*').single();
    setPosting(false);
    if (error || !data) {
      toast({ title: 'Could not comment', description: error?.message, variant: 'destructive' });
      return;
    }
    setComments(prev => [...prev, data as any]);
    setPost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p);
    setDraft('');
    setReplyTo(null);
    if (!authors[userId]) {
      const { data: prof } = await supabase.rpc('get_public_profiles' as any, { _ids: [userId] });
      if (prof?.[0]) setAuthors(a => ({ ...a, [userId]: prof[0] as any }));
    }
  };

  const handleLikeComment = async (c: CommentRow) => {
    if (!userId) { navigate('/auth'); return; }
    const isLiked = likedComments.has(c.id);
    setLikedComments(prev => {
      const n = new Set(prev);
      if (isLiked) n.delete(c.id); else n.add(c.id);
      return n;
    });
    setComments(prev => prev.map(x => x.id === c.id ? { ...x, like_count: Math.max(0, x.like_count + (isLiked ? -1 : 1)) } : x));
    if (isLiked) {
      await supabase.from('post_comment_likes' as any).delete().eq('comment_id', c.id).eq('user_id', userId);
    } else {
      await supabase.from('post_comment_likes' as any).insert({ comment_id: c.id, user_id: userId });
    }
  };

  const handleDeleteComment = async (cid: string) => {
    await supabase.from('post_comments' as any).delete().eq('id', cid);
    const removed = comments.filter(c => c.id === cid || c.parent_id === cid).length;
    setComments(prev => prev.filter(c => c.id !== cid && c.parent_id !== cid));
    setPost(p => p ? { ...p, comment_count: Math.max(0, p.comment_count - removed) } : p);
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('Delete this post?')) return;
    await supabase.from('posts' as any).delete().eq('id', post.id);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#a0a0a0]">Post not found</div>;

  const isAnon = !!post.is_anonymous;
  const author = !isAnon && post.user_id ? authors[post.user_id] : undefined;

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-32 font-[Figtree] bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)]">
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-[#2a2a2a]/40">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const url = `${window.location.origin}/p/${post.id}`;
              const shareData = { title: post.title || 'Check out this post', text: (post.body || '').replace(/<[^>]+>/g, ''), url };
              try {
                if (navigator.share) await navigator.share(shareData);
                else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); }
              } catch {}
            }}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5 text-[#fafafa]" />
          </button>
          {isOwn && (
            <>
              <button onClick={() => navigate(`/p/${post.id}/edit`)} className="px-3 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 text-[#fafafa] text-xs font-semibold flex items-center gap-1" aria-label="Edit post">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={handleDeletePost} className="px-3 py-2 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 text-xs font-semibold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Author header */}
      {isAnon ? (
        <div className="flex items-center gap-3 w-full px-4 py-3">
          <PenguinAvatar size={40} />
          <div className="flex-1 min-w-0">
            <p className="font-[Outfit] font-bold text-[#fafafa] text-sm truncate">{RIPPLER_NAME}</p>
            <p className="text-xs text-[#a0a0a0]">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} · Anonymous</p>
            {post.music_url && (
              <div className="mt-1.5">
                <PostMusicPlayer url={post.music_url} title={post.music_title} />
              </div>
            )}
          </div>
        </div>
      ) : (
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
            {post.music_url && (
              <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                <PostMusicPlayer url={post.music_url} title={post.music_title} />
              </div>
            )}
          </div>
        </button>
      )}

      {/* Media carousel */}
      {currentMedia && (
        <div className="relative mx-3 w-[calc(100%-1.5rem)] bg-[#161616] border border-[#2a2a2a]/50 aspect-[4/5] max-h-[60vh] rounded-3xl overflow-hidden">
          {currentMedia.kind === 'video' ? (
            <video
              ref={videoRef}
              src={currentMedia.url}
              className="w-full h-full object-contain"
              controls
              playsInline
              muted
              preload="metadata"
            />
          ) : (
            <img src={currentMedia.url} alt="" className="w-full h-full object-contain cursor-pointer" loading="eager" decoding="async" onClick={() => window.dispatchEvent(new Event('post-music-stop'))} />
          )}
          {post.category && CATEGORY_META[post.category] && (
            <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-white/90 text-[10px] font-medium tracking-wide">
              {CATEGORY_META[post.category].label}
            </span>
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
        <button onClick={handleSave} aria-label="Save" className="ml-auto flex items-center gap-1.5 active:scale-95 transition-transform">
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-[#ef4444] text-[#ef4444]' : 'text-[#fafafa]'}`} />
          <span className="text-sm font-semibold text-[#fafafa]">{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pt-3">
        {post.title && <h2 className="font-[Outfit] text-lg font-bold text-[#fafafa] mb-3 break-words">{post.title}</h2>}
        {post.body && <div className="text-sm text-[#e5e5e5] whitespace-pre-wrap break-words [overflow-wrap:anywhere] mb-5 leading-relaxed">{renderRichText(post.body)}</div>}
        {post.location && (
          <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" />{post.location}</p>
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
      <div ref={commentsSectionRef} className="px-4 mt-6">
        <h3 className="font-[Outfit] text-sm font-bold text-[#a0a0a0] mb-3">Thoughts</h3>
        {comments.length === 0 ? (
          <p className="text-sm text-[#a0a0a0] text-center py-6">Be the first to add thoughts</p>
        ) : (
          <ul className="space-y-1">
            {comments.filter(c => !c.parent_id).map(top => {
              const thread = [top, ...comments.filter(r => r.parent_id === top.id)];
              return thread.map((c, idx) => {
                const a = authors[c.user_id];
                const mine = c.user_id === userId;
                const isReply = idx > 0;
                const cLiked = likedComments.has(c.id);
                return (
                  <li
                    key={c.id}
                    className={`flex gap-2.5 py-1.5 ${isReply ? 'ml-8' : ''}`}
                  >
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
                      <div className="flex items-center gap-4 mt-1.5">
                        <button
                          onClick={() => handleLikeComment(c)}
                          className="flex items-center gap-1 text-[11px] text-[#a0a0a0] hover:text-[#ef4444] active:scale-95 transition-transform"
                        >
                          <Heart className={`w-3.5 h-3.5 ${cLiked ? 'fill-[#ef4444] text-[#ef4444]' : ''}`} />
                          {c.like_count > 0 && <span className="font-semibold">{c.like_count}</span>}
                        </button>
                        {!isReply && (
                          <button
                            onClick={() => { setReplyTo(c); }}
                            className="flex items-center gap-1 text-[11px] text-[#a0a0a0] hover:text-[#fafafa] font-semibold"
                          >
                            <Reply className="w-3.5 h-3.5" /> Reply
                          </button>
                        )}
                      </div>
                    </div>
                    {(mine || isOwn) && (
                      <button onClick={() => handleDeleteComment(c.id)} aria-label="Delete" className="text-[#a0a0a0] hover:text-[#ef4444] p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              });
            })}
          </ul>
        )}
      </div>

      {/* Comment box */}
      <div className="mt-4 mx-3 rounded-2xl bg-[#0a0a0a]/95 border border-[#2a2a2a]/40">
        {replyTo && (
          <div className="px-3 pt-2 pb-1 flex items-center justify-between text-xs text-[#a0a0a0]">
            <span>Replying to <span className="text-[#fafafa] font-semibold">{authors[replyTo.user_id]?.name || authors[replyTo.user_id]?.username || 'User'}</span></span>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="p-1 hover:text-[#fafafa]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {mention.open && (
          <div className="px-3 pb-2">
            <MentionSuggestions
              items={mention.items}
              active={mention.active}
              onPick={mention.applyItem}
              onHover={mention.setActive}
              variant="dark"
            />
          </div>
        )}
        <div className="px-3 py-2 flex items-center gap-2 border-t border-[#2a2a2a]/40">
          <input
            ref={draftInputRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); setDraftCursor(e.target.selectionStart); }}
            onSelect={e => setDraftCursor((e.target as HTMLInputElement).selectionStart)}
            onKeyUp={e => setDraftCursor((e.target as HTMLInputElement).selectionStart)}
            onKeyDown={e => {
              if (mention.handleKeyDown(e)) return;
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
            }}
            placeholder={getCommentPrompt(post.category, post.review_subcategory, !!replyTo)}
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

    </div>
  );
};

export default PostDetailPage;
