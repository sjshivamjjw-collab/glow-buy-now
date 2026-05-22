import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, LogOut, ChevronRight, Bell, HelpCircle, ShieldCheck, Check, X, Camera, Plus } from 'lucide-react';
import Footer from '@/components/Footer';
import { PostsGrid } from '@/pages/UserProfilePage';
import { formatCount } from '@/lib/utils';

interface PostThumb { id: string; cover_url: string | null; cover_kind: string | null; like_count: number; }

const ProfilePage = () => {
  const { userName, userAvatar, userId, isAdmin, phone, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{ name: string | null; username: string | null; avatar_url: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: prof }, { data: rawPosts }, { count: fc }, { count: fgc }] = await Promise.all([
        supabase.from('profiles').select('name, username, avatar_url').eq('id', userId).single(),
        supabase.from('posts' as any).select('id, like_count').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);
      if (prof) setProfile(prof);
      const ids = ((rawPosts as any[]) || []).map(p => p.id);
      const likeMap: Record<string, number> = {};
      ((rawPosts as any[]) || []).forEach(p => { likeMap[p.id] = p.like_count; });
      if (ids.length) {
        const { data: media } = await supabase.from('post_media' as any).select('post_id, url, kind, sort_order').in('post_id', ids).order('sort_order');
        const coverMap: Record<string, { url: string; kind: string }> = {};
        ((media as any[]) || []).forEach(m => { if (!coverMap[m.post_id]) coverMap[m.post_id] = { url: m.url, kind: m.kind }; });
        setPosts(ids.map(id => ({ id, cover_url: coverMap[id]?.url || null, cover_kind: coverMap[id]?.kind || null, like_count: likeMap[id] || 0 })));
      } else {
        setPosts([]);
      }
      setFollowers(fc || 0);
      setFollowing(fgc || 0);
    };
    load();
  }, [userId]);

  const displayName = profile?.name || userName || phone || 'User';
  const displayAvatar = profile?.avatar_url || userAvatar;
  const displayUsername = profile?.username;

  const handleEdit = () => { setEditName(profile?.name || ''); setEditUsername(profile?.username || ''); setEditing(true); };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: editName.trim() || null,
      username: editUsername.trim() || null,
    }).eq('id', userId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not update profile', variant: 'destructive' });
    } else {
      setProfile(prev => prev ? { ...prev, name: editName.trim() || null, username: editUsername.trim() || null } : prev);
      updateProfile({ name: editName.trim() || null });
      setEditing(false);
      toast({ title: 'Profile updated' });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      if (updErr) throw updErr;
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : { name: null, username: null, avatar_url: publicUrl });
      updateProfile({ avatar_url: publicUrl });
      toast({ title: 'Profile photo updated' });
    } catch (err: any) {
      toast({ title: 'Failed to update photo', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/auth'); };

  const menuItems = [
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: HelpCircle, label: 'Help & Support', path: '/contact' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <h1 className="text-xl font-bold text-foreground mb-6">Profile</h1>

      <div className="flex items-center gap-5 mb-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden group disabled:opacity-60"
          aria-label="Change profile photo"
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase() || '?'}</span>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </span>
          {uploadingAvatar && (
            <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-semibold">Uploading…</span>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div><p className="font-bold text-foreground">{formatCount(posts.length)}</p><p className="text-[11px] text-muted-foreground">Posts</p></div>
          <div><p className="font-bold text-foreground">{formatCount(followers)}</p><p className="text-[11px] text-muted-foreground">Followers</p></div>
          <div><p className="font-bold text-foreground">{formatCount(following)}</p><p className="text-[11px] text-muted-foreground">Following</p></div>
        </div>
      </div>

      {!editing ? (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{displayName}</p>
              {displayUsername && <p className="text-muted-foreground text-sm">@{displayUsername}</p>}
            </div>
            <button onClick={handleEdit} className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">Edit</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-3 mb-4">
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="username"
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold flex items-center gap-1">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/post/new')}
        className="w-full mb-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> New post
      </button>

      {isAdmin && (
        <button onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-accent/50 border border-border mb-6">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-foreground font-semibold text-sm text-left">Admin Panel</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">My posts</h2>
      <div className="mb-8">
        <PostsGrid posts={posts} onOpen={id => navigate(`/p/${id}`)} />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden mb-6">
        {menuItems.map((item, i) => (
          <button key={item.label} onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-foreground font-medium text-sm">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-destructive/10 text-destructive font-semibold">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      <Footer />
    </div>
  );
};

export default ProfilePage;
