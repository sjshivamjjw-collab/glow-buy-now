import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, MessageCircle, MapPin, Loader2, Send, Trash2, ChevronLeft, ChevronRight, Bookmark, Share2, Reply, X, Music, Play, Pause, Pencil, EyeOff, Eye, MoreHorizontal, Flag, Ban } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ReportPostDialog } from '@/components/ReportPostDialog';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { formatDistanceToNow } from 'date-fns';
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete';
import { MentionSuggestions } from '@/components/MentionSuggestions';
import { getCommentPrompt } from '@/lib/commentPrompts';
import { renderRichText } from '@/lib/richText';
import { sharePostLink } from '@/lib/share';
import { PenguinAvatar, RIPPLER_NAME } from '@/components/RipplerIdentity';
import {
  getPostDetailCache,
  setPostDetailCache,
  invalidatePostDetail,
  invalidateTrending,
} from '@/lib/feedCache';
import { optimizedImageUrl } from '@/lib/storageUrls';
import useEmblaCarousel from 'embla-carousel-react';


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
  is_hidden?: boolean;
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
  const { userId, isAdmin } = useAuth();
  const { toast } = useToast();

  // Hydrate from cache for instant render when re-opening a post.
  const initialCache = id ? getPostDetailCache(id) : undefined;
  const [post, setPost] = useState<PostRow | null>((initialCache?.post as PostRow) || null);
  const [media, setMedia] = useState<MediaRow[]>((initialCache?.media as MediaRow[]) || []);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>(
    initialCache?.author ? { [initialCache.author.id]: initialCache.author } : {}
  );
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(!initialCache);
  const [notFound, setNotFound] = useState(false);
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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', containScroll: 'trimSnaps' });
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setMediaIdx(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => { emblaApi.off('select', onSelect); emblaApi.off('reInit', onSelect); };
  }, [emblaApi]);
  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, media.length]);
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
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { blocked, refresh: refreshBlocks } = useBlockedUsers();

  // Always start at the top of the post when opening it (avoid landing mid-page on comments).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);


  // Fetch the post itself (with one retry on empty/error) — this drives the main render.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const haveCache = !!getPostDetailCache(id);
    // Only show the full-page spinner if we have nothing to render yet.
    if (!haveCache) setLoading(true);
    setNotFound(false);

    const fetchPostAndMedia = async (): Promise<{ p: PostRow | null; m: MediaRow[] }> => {
      const [postRes, mediaRes] = await Promise.all([
        supabase.rpc('get_post_public' as any, { _post_id: id }),
        supabase.from('post_media' as any).select('*').eq('post_id', id).order('sort_order'),
      ]);
      const p = ((postRes.data as any[]) || [])[0] || null;
      return { p: p as PostRow | null, m: ((mediaRes.data as unknown) as MediaRow[]) || [] };
    };

    (async () => {
      let result = await fetchPostAndMedia();
      // Retry once on empty/error — transient network blips are the #1 cause of "Post not found".
      if (!result.p && !cancelled) {
        await new Promise(r => setTimeout(r, 400));
        if (cancelled) return;
        result = await fetchPostAndMedia();
      }
      if (cancelled) return;

      if (!result.p) {
        // Genuinely missing — drop any stale cache and show empty state.
        invalidatePostDetail(id);
        setPost(null);
        setMedia([]);
        setLoading(false);
        setNotFound(true);
        return;
      }

      setPost(result.p);
      setMedia(result.m);
      setLoading(false);

      // Resolve post author for cache, then write cache.
      let authorInfo: AuthorInfo | undefined;
      if (result.p.user_id && !result.p.is_anonymous) {
        const cachedAuthor = authors[result.p.user_id];
        if (cachedAuthor) {
          authorInfo = cachedAuthor;
        } else {
          const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: [result.p.user_id] });
          if (cancelled) return;
          const a = ((profs as any[]) || [])[0];
          if (a) {
            authorInfo = a;
            setAuthors(prev => ({ ...prev, [a.id]: a }));
          }
        }
      }
      setPostDetailCache(id, {
        post: result.p as any,
        media: result.m as any,
        author: authorInfo as any,
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Redirect away if the post's author is blocked by (or has blocked) the viewer.
  useEffect(() => {
    if (post?.user_id && blocked.has(post.user_id)) {
      toast({ title: 'Post unavailable' });
      navigate(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.user_id, blocked]);

  // Load comments + per-user like/save/own state in the background — does NOT block the main render.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [commentRes, likeRes, saveRes, ownRes] = await Promise.all([
        supabase.rpc('get_post_comments_public' as any, { _post_id: id }),
        userId ? supabase.from('post_likes' as any).select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        userId ? supabase.from('post_saves' as any).select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
        userId ? supabase.from('posts' as any).select('user_id').eq('id', id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const commentList = (commentRes.data as CommentRow[]) || [];
      setComments(commentList);
      setLiked(!!(likeRes as any).data);
      setSaved(!!(saveRes as any).data);
      setIsOwn(!!(ownRes as any).data);

      const commentAuthorIds = Array.from(
        new Set(commentList.map(c => c.user_id).filter((u): u is string => !!u))
      ).filter(uid => !authors[uid]);
      if (commentAuthorIds.length) {
        const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: commentAuthorIds });
        if (cancelled) return;
        const map: Record<string, AuthorInfo> = {};
        ((profs as any[]) || []).forEach(pp => { map[pp.id] = pp; });
        setAuthors(prev => ({ ...prev, ...map }));
      }

      if (userId && commentList.length) {
        const cids = commentList.map(c => c.id);
        const [{ data: cl }, { data: own }] = await Promise.all([
          supabase.from('post_comment_likes' as any).select('comment_id').eq('user_id', userId).in('comment_id', cids),
          supabase.from('post_comments' as any).select('id').eq('post_id', id).eq('user_id', userId),
        ]);
        if (cancelled) return;
        setLikedComments(new Set(((cl as any[]) || []).map(r => r.comment_id)));
        setOwnComments(new Set(((own as any[]) || []).map(r => r.id)));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const anon = !!post.is_anonymous && commentAnonymously;
    setPosting(true);
    const { data, error } = await supabase.from('post_comments' as any).insert({
      post_id: post.id, user_id: userId, body, parent_id: replyTo?.id ?? null, is_anonymous: anon,
    }).select('*').single();
    setPosting(false);
    if (error || !data) {
      toast({ title: 'Could not comment', description: error?.message, variant: 'destructive' });
      return;
    }
    // Mirror the public view: hide own user_id when anonymous so UI consistently shows Rippler.
    const inserted = { ...(data as any), user_id: anon ? null : (data as any).user_id } as CommentRow;
    setComments(prev => [...prev, inserted]);
    setOwnComments(prev => { const n = new Set(prev); n.add(inserted.id); return n; });
    setPost(p => p ? { ...p, comment_count: p.comment_count + 1 } : p);
    setDraft('');
    setReplyTo(null);
    if (!anon && !authors[userId]) {
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
    invalidatePostDetail(post.id);
    invalidateTrending();
    navigate('/');
  };

  const handleToggleHide = async () => {
    if (!post) return;
    const next = !post.is_hidden;
    const { error } = await supabase.from('posts' as any).update({ is_hidden: next }).eq('id', post.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setPost(p => p ? { ...p, is_hidden: next } : p);
    toast({ title: next ? 'Post hidden' : 'Post unhidden' });
  };

  if (loading && !post) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  if (!post) {
    if (notFound) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-[#a0a0a0] gap-4 px-6 text-center">
          <p>This post is no longer available.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm font-semibold">
            Back to feed
          </button>
        </div>
      );
    }
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  }

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
              try {
                const result = await sharePostLink({ postId: post.id, title: post.title });
                if (result === 'copied') toast({ title: 'Link copied' });
              } catch {}
            }}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5 text-[#fafafa]" />
          </button>
          {(isOwn || isAdmin) && (
            <>
              <button onClick={() => navigate(`/p/${post.id}/edit`)} className="px-3 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 text-[#fafafa] text-xs font-semibold flex items-center gap-1" aria-label="Edit post">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              {isAdmin && (
                <button onClick={handleToggleHide} className="px-3 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 text-[#fafafa] text-xs font-semibold flex items-center gap-1" aria-label={post.is_hidden ? 'Unhide post' : 'Hide post'}>
                  {post.is_hidden ? <><Eye className="w-3.5 h-3.5" /> Unhide</> : <><EyeOff className="w-3.5 h-3.5" /> Hide</>}
                </button>
              )}
              {isOwn && (
                <button onClick={handleDeletePost} className="px-3 py-2 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 text-xs font-semibold flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </>
          )}
          {!isOwn && userId && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]/60 flex items-center justify-center"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-5 h-5 text-[#fafafa]" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                <div className="flex flex-col gap-1 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setTimeout(() => setReportOpen(true), 100);
                    }}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-muted text-left"
                  >
                    <Flag className="w-5 h-5" />
                    <span className="font-medium">Report post</span>
                  </button>
                  {post.user_id && !post.is_anonymous && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Block this user? You will no longer see their posts or comments.')) return;
                        const { error } = await supabase.from('user_blocks' as any).insert({ blocker_id: userId, blocked_id: post.user_id });
                        if (error && !/duplicate/i.test(error.message)) {
                          toast({ title: 'Could not block', description: error.message, variant: 'destructive' });
                          return;
                        }
                        toast({ title: 'User blocked' });
                        setMoreOpen(false);
                        await refreshBlocks();
                        navigate(-1);
                      }}
                      className="flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-destructive/10 text-destructive text-left"
                    >
                      <Ban className="w-5 h-5" />
                      <span className="font-medium">Block user</span>
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

          )}

        </div>
      </div>
      <ReportPostDialog open={reportOpen} onOpenChange={setReportOpen} postId={post.id} />

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
        <div className="relative w-screen left-1/2 -translate-x-1/2 bg-[#0a0a0a] overflow-hidden">
          <div ref={emblaRef} className="w-full overflow-hidden">
            <div className="flex touch-pan-y">
              {media.map((m, i) => (
                <div key={m.id} className="relative min-w-0 shrink-0 grow-0 basis-full aspect-[4/5]">
                  {m.kind === 'video' ? (
                    <video
                      ref={i === mediaIdx ? videoRef : undefined}
                      src={m.url}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={optimizedImageUrl(m.url, { width: 1080, quality: 75, resize: 'contain' }) || m.url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer select-none"
                      loading={Math.abs(i - mediaIdx) <= 1 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                      onClick={() => window.dispatchEvent(new Event('post-music-stop'))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {media.length > 1 && (
            <>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0a0a0a]/85 backdrop-blur-sm text-[#fafafa] text-[10px] font-semibold z-10">
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
            {comments.filter(c => !c.parent_id && !(c.user_id && blocked.has(c.user_id))).map(top => {
              const thread = [top, ...comments.filter(r => r.parent_id === top.id && !(r.user_id && blocked.has(r.user_id)))];
              return thread.map((c, idx) => {
                const cAnon = !!c.is_anonymous;
                const a = !cAnon && c.user_id ? authors[c.user_id] : undefined;
                const mine = ownComments.has(c.id);
                const isReply = idx > 0;
                const cLiked = likedComments.has(c.id);
                return (
                  <li
                    key={c.id}
                    className={`flex gap-2.5 py-1.5 ${isReply ? 'ml-8' : ''}`}
                  >
                    {cAnon ? (
                      <PenguinAvatar size={32} />
                    ) : a?.avatar_url ? (
                      <img src={a.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#2a2a2a]" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#ef4444]/40 shrink-0 flex items-center justify-center text-xs font-bold text-[#fafafa]">
                        {(a?.name || a?.username || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#fafafa]">
                        {cAnon ? (
                          <>
                            {RIPPLER_NAME}
                            <span className="ml-1 text-[10px] font-medium text-[#a0a0a0]">(anonymous)</span>
                          </>
                        ) : (a?.name || a?.username || 'User')}
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
            <span>
              Replying to{' '}
              <span className="text-[#fafafa] font-semibold">
                {replyTo.is_anonymous
                  ? RIPPLER_NAME
                  : (replyTo.user_id && (authors[replyTo.user_id]?.name || authors[replyTo.user_id]?.username)) || 'User'}
              </span>
            </span>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="p-1 hover:text-[#fafafa]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {post.is_anonymous && (
          <label className="px-3 pt-2 flex items-center gap-2 text-[11px] text-[#a0a0a0] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={commentAnonymously}
              onChange={(e) => setCommentAnonymously(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#ef4444]"
            />
            <span>
              Comment as <span className="text-[#fafafa] font-semibold">🐧 {RIPPLER_NAME}</span> (anonymous)
            </span>
          </label>
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
