import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/components/AuthGate';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, UserPlus, UserCheck, Eye, MoreHorizontal, Flag, Ban, ShieldOff, Heart, MessageCircle, Bookmark } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';
import { optimizedImageUrl } from '@/lib/storageUrls';
import TextCoverCard from '@/components/TextCoverCard';
import InitialAvatar from '@/components/InitialAvatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { track } from '@/lib/analytics';
import SEO from '@/components/SEO';


interface Profile { id: string; name: string | null; username: string | null; avatar_url: string | null; }
interface PostThumb { id: string; cover_url: string | null; cover_kind: string | null; like_count: number; is_anonymous?: boolean; title?: string | null; }

const UserProfilePage = () => {
  const { userId: pageUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userId: meId } = useAuth();
  const { requireAuth } = useAuthGate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!pageUserId) return;
    if (meId && pageUserId === meId) { navigate('/profile', { replace: true }); return; }
    const load = async () => {
      setLoading(true);
      const [{ data: profs }, { data: posts }, { count: followerCount }, { count: followingCount }, { count: postCnt }, followRes] = await Promise.all([
        supabase.rpc('get_public_profiles' as any, { _ids: [pageUserId] }),
        supabase.from('posts' as any).select('id, title, created_at').eq('user_id', pageUserId).eq('is_anonymous', false).order('created_at', { ascending: false }).limit(60),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('following_id', pageUserId),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('follower_id', pageUserId),
        supabase.from('posts' as any).select('*', { count: 'exact', head: true }).eq('user_id', pageUserId).eq('is_anonymous', false),
        meId ? supabase.from('user_follows' as any).select('follower_id').eq('follower_id', meId).eq('following_id', pageUserId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setProfile(((profs as any[]) || [])[0] || null);
      const postIds = ((posts as any[]) || []).map(p => p.id);
      const titleMap: Record<string, string | null> = {};
      ((posts as any[]) || []).forEach(p => { titleMap[p.id] = p.title ?? null; });
      if (postIds.length) {
        const { data: media } = await supabase.from('post_media' as any).select('post_id, url, kind, sort_order').in('post_id', postIds).order('sort_order');
        const coverMap: Record<string, { url: string; kind: string }> = {};
        ((media as any[]) || []).forEach(m => { if (!coverMap[m.post_id]) coverMap[m.post_id] = { url: m.url, kind: m.kind }; });
        const { data: pdata } = await supabase.from('posts' as any).select('id, like_count').in('id', postIds);
        const likeMap: Record<string, number> = {};
        ((pdata as any[]) || []).forEach(p => { likeMap[p.id] = p.like_count; });
        setPosts(postIds.map(id => ({ id, cover_url: coverMap[id]?.url || null, cover_kind: coverMap[id]?.kind || null, like_count: likeMap[id] || 0, title: titleMap[id] })));
      } else {
        setPosts([]);
      }
      setFollowers(followerCount || 0);
      setFollowing(followingCount || 0);
      setPostCount(postCnt || 0);
      setIsFollowing(!!followRes.data);
      setLoading(false);
    };
    load();
  }, [pageUserId, meId, navigate]);

  const handleFollow = async () => {
    if (!requireAuth('follow')) return;
    if (!meId || !pageUserId) return;
    setBusy(true);
    if (isFollowing) {
      await supabase.from('user_follows' as any).delete().eq('follower_id', meId).eq('following_id', pageUserId);
      setIsFollowing(false);
      setFollowers(c => Math.max(0, c - 1));
      track('user_unfollowed', { target_user_id: pageUserId });
    } else {
      const { error } = await supabase.from('user_follows' as any).insert({ follower_id: meId, following_id: pageUserId });
      if (error) toast({ title: 'Could not follow', description: error.message, variant: 'destructive' });
      else { setIsFollowing(true); setFollowers(c => c + 1); track('user_followed', { target_user_id: pageUserId }); }
    }
    setBusy(false);
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">User not found</div>;

  const name = profile.name || profile.username || 'User';

  return <UserProfileBody profile={profile} posts={posts} postCount={postCount} followers={followers} following={following} isFollowing={isFollowing} busy={busy} handleFollow={handleFollow} setFollowers={setFollowers} setIsFollowing={setIsFollowing} navigate={navigate} pageUserId={pageUserId!} />;
};

const UserProfileBody = ({ profile, posts, postCount, followers, following, isFollowing, busy, handleFollow, navigate, pageUserId }: any) => {
  const { userId: meId } = useAuth();
  const { requireAuth } = useAuthGate();
  const { toast } = useToast();
  const { blocked, refresh: refreshBlocks } = useBlockedUsers();
  const name = profile.name || profile.username || 'User';
  const isBlocked = blocked.has(pageUserId);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleBlock = async () => {
    if (!requireAuth('block')) return;
    if (!meId) return;
    if (!window.confirm('Block this user? You will no longer see their posts or comments.')) return;
    const { error } = await supabase.from('user_blocks' as any).insert({ blocker_id: meId, blocked_id: pageUserId });
    if (error && !/duplicate/i.test(error.message)) { toast({ title: 'Could not block', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'User blocked' });
    await refreshBlocks();
  };

  const handleUnblock = async () => {
    if (!meId) return;
    await supabase.from('user_blocks' as any).delete().eq('blocker_id', meId).eq('blocked_id', pageUserId);
    toast({ title: 'User unblocked' });
    await refreshBlocks();
  };

  const seoTitle = `${name}${profile.username ? ` (@${profile.username})` : ''} on Ripple`;
  const seoDesc = `Follow ${name} on Ripple — ${formatCount(postCount)} posts, ${formatCount(followers)} followers. Real recommendations, reviews and everyday moments.`;
  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      alternateName: profile.username || undefined,
      image: profile.avatar_url || undefined,
      url: `https://myripple.co.in/u/${pageUserId}`,
    },
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] max-w-lg mx-auto px-4 pt-4 pb-24">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/u/${pageUserId}`}
        image={profile.avatar_url || undefined}
        type="profile"
        jsonLd={profileJsonLd}
      />
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-[#fafafa]" />
        </button>
        <h1 className="text-xl font-bold text-[#fafafa] truncate flex-1">{name}</h1>
        {meId && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 flex items-center justify-center"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5 text-[#fafafa]" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <div className="flex flex-col gap-1 pt-4">
                {isBlocked ? (
                  <button
                    type="button"
                    onClick={() => { setMoreOpen(false); handleUnblock(); }}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl hover:bg-muted text-left"
                  >
                    <ShieldOff className="w-5 h-5" />
                    <span className="font-medium">Unblock user</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMoreOpen(false); handleBlock(); }}
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


      <div className="flex items-center gap-5 mb-5">
        <InitialAvatar
          avatarUrl={profile.avatar_url}
          name={name}
          username={profile.username}
          size={80}
        />
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div><p className="font-bold text-[#fafafa]">{formatCount(postCount)}</p><p className="text-[11px] text-[#9a9a9a]">Posts</p></div>
          <div><p className="font-bold text-[#fafafa]">{formatCount(followers)}</p><p className="text-[11px] text-[#9a9a9a]">Followers</p></div>
          <div><p className="font-bold text-[#fafafa]">{formatCount(following)}</p><p className="text-[11px] text-[#9a9a9a]">Following</p></div>
        </div>
      </div>

      <div className="mb-5">
        <p className="font-bold text-[#fafafa]">{profile.name || profile.username}</p>
        {profile.username && profile.name && <p className="text-[#9a9a9a] text-sm">@{profile.username}</p>}
      </div>

      {isBlocked ? (
        <div className="text-center py-10 px-4">
          <Ban className="w-10 h-10 mx-auto text-[#9a9a9a] mb-3" />
          <p className="text-[#fafafa] font-semibold mb-1">You blocked this user</p>
          <p className="text-sm text-[#9a9a9a] mb-5">Their posts and comments are hidden from you.</p>
          <button onClick={handleUnblock} className="px-5 py-2 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] font-semibold text-sm">Unblock</button>
        </div>

      ) : (
        <>
          <button
            onClick={handleFollow}
            disabled={busy}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-6 disabled:opacity-50 ${
              isFollowing ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
            }`}
          >
            {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
          </button>

          <PostsGrid posts={posts} onOpen={(id: string) => navigate(`/p/${id}`)} />
        </>
      )}
    </div>
  );
};

export const PostsGrid = ({ posts, onOpen, isOwner = false }: { posts: PostThumb[]; onOpen: (id: string) => void; isOwner?: boolean }) => {
  if (posts.length === 0) return <p className="text-center text-muted-foreground text-sm py-10">No posts yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {posts.map(p => (
        <button
          key={p.id}
          onClick={() => onOpen(p.id)}
          className="group w-full text-left rounded-2xl overflow-hidden bg-[#161616] border border-[#2a2a2a]/50 hover:border-[#ef4444] hover:shadow-lg hover:shadow-[#dc2626]/10 transition-all duration-300"
        >
          <div className={`relative w-full bg-[#1a1a1a] overflow-hidden ${p.cover_url ? 'aspect-[4/5]' : 'aspect-square'}`}>
            {p.cover_url ? (
              p.cover_kind === 'video'
                ? <LazyVideoThumbnail src={p.cover_url} className="w-full h-full" />
                : <img src={optimizedImageUrl(p.cover_url, { width: 600, quality: 70, resize: 'contain' })!} alt={p.title || ''} className="w-full h-full object-contain" loading="lazy" decoding="async" />
            ) : (
              <TextCoverCard title={p.title} textClassName="text-[15px]" />
            )}
            {p.is_anonymous && (
              <>
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#fef3c7] ring-1 ring-[#fcd34d] text-[10px] font-semibold text-[#1a1a1a]">
                  <img src="https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg" alt="" className="w-3 h-3" />
                  Rippler
                </span>
                {isOwner && (
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-[9px] font-semibold text-white">
                    <Eye className="w-2.5 h-2.5" />
                    Only Visible on your profile to you
                  </span>
                )}
              </>
            )}
          </div>
          {p.title && p.cover_url && (
            <div className="px-2.5 pt-2 pb-2.5">
              <p className="font-[Outfit] font-medium text-[#fafafa] text-[12px] leading-[1.3] line-clamp-2">
                {p.title}
              </p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default UserProfilePage;
