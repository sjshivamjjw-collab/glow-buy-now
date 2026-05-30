import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, LogOut, ChevronRight, Bell, HelpCircle, ShieldCheck, Check, X, Camera, Plus, Share2, Trash2 } from 'lucide-react';

import { PostsGrid } from '@/pages/UserProfilePage';
import { formatCount } from '@/lib/utils';

interface PostThumb { id: string; cover_url: string | null; cover_kind: string | null; like_count: number; title?: string | null; is_anonymous?: boolean; }

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
  const [saves, setSaves] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: prof }, { data: rawPosts }, { count: fc }, { data: savesCount }] = await Promise.all([
        supabase.from('profiles').select('name, username, avatar_url').eq('id', userId).single(),
        supabase.from('posts' as any).select('id, title, like_count, is_anonymous').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
        supabase.from('user_follows' as any).select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.rpc('get_user_post_saves_count' as any, { _user_id: userId }),
      ]);
      if (prof) setProfile(prof);
      const rows = (rawPosts as any[]) || [];
      const ids = rows.map(p => p.id);
      const likeMap: Record<string, number> = {};
      const anonMap: Record<string, boolean> = {};
      const titleMap: Record<string, string | null> = {};
      rows.forEach(p => { likeMap[p.id] = p.like_count; anonMap[p.id] = !!p.is_anonymous; titleMap[p.id] = p.title ?? null; });
      if (ids.length) {
        const { data: media } = await supabase.from('post_media' as any).select('post_id, url, kind, sort_order').in('post_id', ids).order('sort_order');
        const coverMap: Record<string, { url: string; kind: string }> = {};
        ((media as any[]) || []).forEach(m => { if (!coverMap[m.post_id]) coverMap[m.post_id] = { url: m.url, kind: m.kind }; });
        setPosts(ids.map(id => ({ id, cover_url: coverMap[id]?.url || null, cover_kind: coverMap[id]?.kind || null, like_count: likeMap[id] || 0, is_anonymous: anonMap[id], title: titleMap[id] })));
      } else {
        setPosts([]);
      }
      setFollowers(fc || 0);
      setSaves(typeof savesCount === 'number' ? savesCount : 0);
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

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    if (!displayAvatar) return;
    if (!window.confirm('Remove your profile photo?')) return;
    setUploadingAvatar(true);
    try {
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
      if (updErr) throw updErr;
      setProfile(prev => prev ? { ...prev, avatar_url: null } : prev);
      updateProfile({ avatar_url: null });
      toast({ title: 'Profile photo removed' });
    } catch (err: any) {
      toast({ title: 'Failed to remove photo', description: err.message, variant: 'destructive' });
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)] max-w-lg mx-auto px-4 pt-14 pb-24">
      <h1 className="text-xl font-bold text-[#fafafa] mb-6">Profile</h1>

      <div className="relative rounded-3xl bg-gradient-to-br from-[#141414] to-[#0d0d0d] border border-[#2a2a2a]/70 p-5 mb-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative w-20 h-20 rounded-full bg-[#161616] ring-2 ring-[#ef4444]/40 ring-offset-2 ring-offset-[#0d0d0d] flex items-center justify-center overflow-hidden group disabled:opacity-60 shrink-0"
            aria-label="Change profile photo"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-[#a0a0a0]">{displayName[0]?.toUpperCase() || '?'}</span>
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </span>
            {uploadingAvatar && (
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-semibold">Uploading…</span>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div className="flex-1 grid grid-cols-3 text-center divide-x divide-[#2a2a2a]/60">
            <div className="px-1"><p className="font-bold text-[#fafafa] text-lg leading-tight">{formatCount(posts.length)}</p><p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider mt-0.5">Posts</p></div>
            <div className="px-1"><p className="font-bold text-[#fafafa] text-lg leading-tight">{formatCount(followers)}</p><p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider mt-0.5">Followers</p></div>
            <div className="px-1"><p className="font-bold text-[#fafafa] text-lg leading-tight">{formatCount(saves)}</p><p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider mt-0.5">Saves</p></div>
          </div>
        </div>

        {!editing && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-[#fafafa] truncate">{displayName}</p>
              {displayUsername && <p className="text-[#a0a0a0] text-sm truncate">@{displayUsername}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleEdit} className="px-4 py-1.5 rounded-full bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#ef4444]/50 text-[#fafafa] text-xs font-semibold transition-colors">Edit profile</button>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/u/${userId}`;
                  const shareData = {
                    title: displayName ? `${displayName} on LiveCart` : 'Profile on LiveCart',
                    text: displayUsername ? `Check out @${displayUsername} on LiveCart` : 'Check out this profile on LiveCart',
                    url,
                  };
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast({ title: 'Link copied', description: url });
                    }
                  } catch {
                    /* user cancelled */
                  }
                }}
                className="px-3 py-1.5 rounded-full bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#ef4444]/50 text-[#fafafa] text-xs font-semibold transition-colors flex items-center gap-1"
                aria-label="Share profile"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (

        <div className="mt-2 space-y-3 mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="flex-1 px-4 py-2 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" /> {displayAvatar ? 'Change photo' : 'Add photo'}
            </button>
            {displayAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="px-4 py-2 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            )}
          </div>
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm" />
          <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="username"
            className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 text-[#fafafa] text-sm font-semibold flex items-center gap-1">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/post/new')}
        className="w-full mb-6 py-2.5 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)]">
        <Plus className="w-4 h-4" /> New post
      </button>

      {isAdmin && (
        <button onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#161616] border border-[#2a2a2a]/60 mb-6">
          <ShieldCheck className="w-5 h-5 text-[#ef4444]" />
          <span className="flex-1 text-[#fafafa] font-semibold text-sm text-left">Admin Panel</span>
          <ChevronRight className="w-4 h-4 text-[#a0a0a0]" />
        </button>
      )}

      <h2 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wide mb-3">My posts</h2>
      <div className="mb-8">
        <PostsGrid posts={posts} onOpen={id => navigate(`/p/${id}`)} isOwner />
      </div>


      <div className="flex justify-center">
        <button onClick={handleLogout} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-xs font-semibold">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
