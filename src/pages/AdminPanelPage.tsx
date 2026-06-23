import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Search, Loader2,
  FileText, Trash2, Heart, MessageCircle, EyeOff, Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';
import InitialAvatar from '@/components/InitialAvatar';
import { optimizedImageUrl } from '@/lib/storageUrls';
import AdminReelsTab from '@/components/admin/AdminReelsTab';

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, any>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const [profilesRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, name, phone, email, avatar_url, created_at').order('created_at', { ascending: false }),
        supabase.from('posts' as any).select('*, post_media(url, kind, sort_order)').order('created_at', { ascending: false }),
      ]);

      if (profilesRes.data) setUsers(profilesRes.data);
      if (postsRes.data) {
        setPosts(postsRes.data as any[]);
        const map: Record<string, any> = {};
        (profilesRes.data || []).forEach((p: any) => { map[p.id] = p; });
        setPostAuthors(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleDeletePost = async (postId: string) => {
    setDeletingPostId(postId);
    const { error } = await supabase.from('posts' as any).delete().eq('id', postId);
    setDeletingPostId(null);
    if (error) {
      toast({ title: 'Failed to delete post', description: error.message, variant: 'destructive' });
      return;
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast({ title: 'Post deleted' });
  };

  const handleToggleHidePost = async (postId: string, currentHidden: boolean) => {
    const next = !currentHidden;
    const { error } = await supabase.from('posts' as any).update({ is_hidden: next }).eq('id', postId);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_hidden: next } : p));
    toast({ title: next ? 'Post hidden from feed' : 'Post visible again' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Platform moderation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500' },
          { label: 'Total Posts', value: posts.length, icon: FileText, color: 'text-purple-500' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="reels" className="text-xs">Reels</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="space-y-3">
            {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No posts yet.</p>}
            {posts.map(p => {
              const cover = (p.post_media || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
              const author = postAuthors[p.user_id];
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <button onClick={() => navigate(`/p/${p.id}`)} className="shrink-0">
                    {cover ? (
                      cover.kind === 'video' ? (
                        <LazyVideoThumbnail src={cover.url} className="w-14 h-14 rounded-xl overflow-hidden bg-black" />
                      ) : (
                        <img src={optimizedImageUrl(cover.url, { width: 160, quality: 70, resize: 'cover' })!} alt="" className="w-14 h-14 rounded-xl object-cover" loading="lazy" decoding="async" />
                      )
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  <button onClick={() => navigate(`/p/${p.id}`)} className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {p.title || p.body || 'Untitled post'}
                      {p.is_hidden && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 align-middle">HIDDEN</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {author?.name || author?.phone || 'Unknown user'} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comment_count}</span>
                    </div>
                  </button>
                  <div className="shrink-0 flex flex-col gap-1.5">
                    <button
                      onClick={() => handleToggleHidePost(p.id, !!p.is_hidden)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground text-[11px] font-semibold"
                    >
                      {p.is_hidden ? <><Eye className="w-3 h-3" /> Unhide</> : <><EyeOff className="w-3 h-3" /> Hide</>}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this post permanently?')) handleDeletePost(p.id);
                      }}
                      disabled={deletingPostId === p.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {deletingPostId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-3">
            {users
              .filter(u => {
                const q = searchQuery.toLowerCase();
                return (u.name || '').toLowerCase().includes(q)
                  || (u.phone || '').includes(searchQuery)
                  || (u.email || '').toLowerCase().includes(q);
              })
              .map(user => (
                <div key={user.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  <InitialAvatar
                    avatarUrl={user.avatar_url}
                    name={user.name}
                    username={user.email ? user.email.split('@')[0] : null}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{user.name || (user.email ? user.email.split('@')[0] : 'No name')}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.phone || user.email || 'No contact'}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
        <TabsContent value="reels">
          <AdminReelsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanelPage;
