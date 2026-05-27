import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Lock, FileText, Shield, LogOut, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const NOTIF_KEY_PREFIX = 'lc:notif-pref:';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userId, phone, role, logout } = useAuth();
  const { toast } = useToast();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const v = localStorage.getItem(`${NOTIF_KEY_PREFIX}${userId}`);
    if (v != null) setPushEnabled(v === '1');
  }, [userId]);

  const togglePush = (next: boolean) => {
    setPushEnabled(next);
    if (userId) localStorage.setItem(`${NOTIF_KEY_PREFIX}${userId}`, next ? '1' : '0');
    toast({ title: next ? 'Notifications enabled' : 'Notifications muted' });
  };

  const handleClearLocal = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('lc:'))
      .forEach(k => localStorage.removeItem(k));
    toast({ title: 'Cached preferences cleared' });
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    const { error } = await supabase.from('profiles').update({
      name: null, username: null, avatar_url: null, date_of_birth: null, gender: null,
    }).eq('id', userId);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast({ title: 'Could not process request', description: 'Please contact support.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Account data cleared', description: 'You will be signed out now.' });
    setTimeout(() => { logout(); navigate('/auth'); }, 800);
  };

  const Row = ({ icon: Icon, label, sub, onClick, danger }: any) => (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/50 transition-colors ${danger ? 'text-live' : 'text-foreground'}`}>
      <Icon className={`w-5 h-5 ${danger ? 'text-live' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <ChevronRight className={`w-4 h-4 ${danger ? 'text-live' : 'text-muted-foreground'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-20">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Account</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-semibold text-foreground">{phone || '—'}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-semibold text-foreground capitalize">{role === 'shopper' ? 'Member' : role}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Preferences</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="w-full flex items-center gap-3 px-5 py-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Push notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Order updates, livestreams, follows</p>
            </div>
            <button
              onClick={() => togglePush(!pushEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-primary' : 'bg-secondary'}`}
              aria-label="Toggle notifications"
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="border-t border-border">
            <Row icon={MapPin} label="Saved addresses" onClick={() => navigate('/addresses')} />
          </div>
          <div className="border-t border-border">
            <Row icon={Bell} label="Notifications inbox" onClick={() => navigate('/notifications')} />
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Legal</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row icon={Shield} label="Privacy Policy" onClick={() => navigate('/privacy')} />
          <div className="border-t border-border"><Row icon={FileText} label="Terms of Service" onClick={() => navigate('/terms')} /></div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Account actions</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row icon={Lock} label="Clear cached preferences" sub="Resets local app settings on this device" onClick={handleClearLocal} />
          <div className="border-t border-border"><Row icon={LogOut} label="Sign out" onClick={() => { logout(); navigate('/auth'); }} /></div>
          <div className="border-t border-border"><Row icon={Trash2} label="Delete my account data" danger onClick={() => setConfirmDelete(true)} /></div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-foreground/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-foreground font-bold text-lg mb-2">Delete account data?</h3>
            <p className="text-muted-foreground text-sm mb-5">
              This clears your name, username and avatar, then signs you out. For full account removal, contact support.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-3 rounded-xl bg-live text-live-foreground font-semibold disabled:opacity-50">
                {deleting ? 'Working…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
