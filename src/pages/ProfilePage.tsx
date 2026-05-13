import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, LogOut, ChevronRight, Bell, HelpCircle, Sparkles, ShieldCheck, LayoutDashboard, Users, Check, X, Receipt } from 'lucide-react';
import Footer from '@/components/Footer';

const ProfilePage = () => {
  const { role, userName, userAvatar, userId, isCreator, isAdmin, phone, logout, updateProfile, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ name: string | null; username: string | null; avatar_url: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [becoming, setBecoming] = useState(false);

  useEffect(() => {
    if (!userId) return;
    refreshRoles();
    supabase.from('profiles').select('name, username, avatar_url').eq('id', userId).single().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [userId]);

  const displayName = profile?.name || userName || phone || 'User';
  const displayAvatar = profile?.avatar_url || userAvatar;
  const displayUsername = profile?.username;

  const handleEdit = () => {
    setEditName(profile?.name || '');
    setEditUsername(profile?.username || '');
    setEditing(true);
  };

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

  const handleBecomeCreator = async () => {
    setBecoming(true);
    const { error } = await supabase.rpc('become_creator' as any);
    setBecoming(false);
    if (error) {
      toast({ title: 'Could not enable creator mode', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshRoles();
    toast({ title: 'You are a creator now!', description: 'Build your first community.' });
    navigate('/communities/new');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const menuItems = [
    { icon: Users, label: 'My Communities', path: '/mine' },
    { icon: Receipt, label: 'Subscriptions & Refunds', path: '/subscriptions' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: HelpCircle, label: 'Help & Support', path: '/contact' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14">
      <h1 className="text-xl font-bold text-foreground mb-6">Profile</h1>

      <div className="p-5 rounded-2xl bg-card border border-border mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {!editing ? (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
              {displayUsername && <p className="text-muted-foreground text-sm">@{displayUsername}</p>}
              <p className="text-muted-foreground text-xs capitalize mt-0.5">{role}</p>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {!editing && (
            <button onClick={handleEdit} className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">Edit</button>
          )}
        </div>

        {editing && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Username</label>
              <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="username"
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold flex items-center gap-1">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isCreator && (
        <button onClick={() => navigate('/creator')}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <span className="flex-1 text-foreground font-semibold text-sm text-left">Creator Dashboard</span>
          <ChevronRight className="w-4 h-4 text-primary" />
        </button>
      )}

      {!isCreator && (
        <button onClick={handleBecomeCreator} disabled={becoming}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-primary/10 border border-primary/20 mb-3 disabled:opacity-50">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="flex-1 text-foreground font-semibold text-sm text-left">
            {becoming ? 'Setting up...' : 'Become a creator'}
          </span>
          <ChevronRight className="w-4 h-4 text-primary" />
        </button>
      )}

      {isAdmin && (
        <button onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-accent/50 border border-border mb-6">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-foreground font-semibold text-sm text-left">Admin Panel</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <div className="rounded-2xl bg-card border border-border overflow-hidden mb-6 mt-6">
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
