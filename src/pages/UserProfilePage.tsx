import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';

interface Profile { id: string; name: string | null; username: string | null; avatar_url: string | null; }
interface PostThumb { id: string; cover_url: string | null; cover_kind: string | null; like_count: number; is_anonymous?: boolean; }

const UserProfilePage = () => {
  const { userId: pageUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userId: meId } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pageUserId) return;
    if (meId && pageUserId === meId) { navigate('/profile', { replace: true }); return; }
    const load = async () => {
      setLoading(true);
      const [{ data: profs }, { data: posts }, { count: followerCount }, { count: followingCount }, { count: postCnt }, followRes] = await Promise.all([
        supabase.rpc('get_public_profiles' as any, { _ids: [pageUserId] }),
        supabase.from('posts' as any).select('id, created_at').eq('user_id', pageUserId).eq('is_anonymous', false).order('created_at', { ascending: false }).limit(60),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('following_id', pageUserId),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('follower_id', pageUserId),
        supabase.from('posts' as any).select('*', { count: 'exact', head: true }).eq('user_id', pageUserId).eq('is_anonymous', false),
        meId ? supabase.from('user_follows' as any).select('follower_id').eq('follower_id', meId).eq('following_id', pageUserId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setProfile(((profs as any[]) || [])[0] || null);
      const postIds = ((posts as any[]) || []).map(p => p.id);
      if (postIds.length) {
        const { data: media } = await supabase.from('post_media' as any).select('post_id, url, kind, sort_order').in('post_id', postIds).order('sort_order');
        const coverMap: Record<string, { url: string; kind: string }> = {};
        ((media as any[]) || []).forEach(m => { if (!coverMap[m.post_id]) coverMap[m.post_id] = { url: m.url, kind: m.kind }; });
        const { data: pdata } = await supabase.from('posts' as any).select('id, like_count').in('id', postIds);
        const likeMap: Record<string, number> = {};
        ((pdata as any[]) || []).forEach(p => { likeMap[p.id] = p.like_count; });
        setPosts(postIds.map(id => ({ id, cover_url: coverMap[id]?.url || null, cover_kind: coverMap[id]?.kind || null, like_count: likeMap[id] || 0 })));
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
    if (!meId || !pageUserId) { navigate('/auth'); return; }
    setBusy(true);
    if (isFollowing) {
      await supabase.from('user_follows' as any).delete().eq('follower_id', meId).eq('following_id', pageUserId);
      setIsFollowing(false);
      setFollowers(c => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from('user_follows' as any).insert({ follower_id: meId, following_id: pageUserId });
      if (error) toast({ title: 'Could not follow', description: error.message, variant: 'destructive' });
      else { setIsFollowing(true); setFollowers(c => c + 1); }
    }
    setBusy(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">User not found</div>;

  const name = profile.name || profile.username || 'User';

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground truncate">{name}</h1>
      </div>

      <div className="flex items-center gap-5 mb-5">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold text-muted-foreground">{name[0]?.toUpperCase()}</div>
        )}
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div><p className="font-bold text-foreground">{formatCount(postCount)}</p><p className="text-[11px] text-muted-foreground">Posts</p></div>
          <div><p className="font-bold text-foreground">{formatCount(followers)}</p><p className="text-[11px] text-muted-foreground">Followers</p></div>
          <div><p className="font-bold text-foreground">{formatCount(following)}</p><p className="text-[11px] text-muted-foreground">Following</p></div>
        </div>
      </div>

      <div className="mb-5">
        <p className="font-bold text-foreground">{profile.name || profile.username}</p>
        {profile.username && profile.name && <p className="text-muted-foreground text-sm">@{profile.username}</p>}
      </div>

      <button
        onClick={handleFollow}
        disabled={busy}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-6 disabled:opacity-50 ${
          isFollowing ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
        }`}
      >
        {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
      </button>

      <PostsGrid posts={posts} onOpen={id => navigate(`/p/${id}`)} />
    </div>
  );
};

export const PostsGrid = ({ posts, onOpen }: { posts: PostThumb[]; onOpen: (id: string) => void }) => {
  if (posts.length === 0) return <p className="text-center text-muted-foreground text-sm py-10">No posts yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {posts.map(p => (
        <button key={p.id} onClick={() => onOpen(p.id)} className="relative aspect-square bg-secondary rounded-xl overflow-hidden">
          {p.cover_url ? (
            p.cover_kind === 'video'
              ? <LazyVideoThumbnail src={p.cover_url} className="w-full h-full" />
              : <img src={p.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary" />
          )}
          {p.is_anonymous && (
            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#fef3c7] ring-1 ring-[#fcd34d] text-[10px] font-semibold text-[#1a1a1a]">
              <img src="https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg" alt="" className="w-3 h-3" />
              Rippler
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default UserProfilePage;
