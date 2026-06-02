import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Lock, FileText, Shield, LogOut, ChevronRight, Trash2, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';


const NOTIF_KEY_PREFIX = 'lc:notif-pref:';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userId, phone, role, logout } = useAuth();
  const { toast } = useToast();

  const [pushEnabled, setPushEnabled] = useState(true);

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
            <p className="text-sm font-semibold text-foreground capitalize">{role || 'Member'}</p>
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
              <p className="text-xs text-muted-foreground mt-0.5">Replies, follows, and likes</p>
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
            <Row icon={Bell} label="Notifications inbox" onClick={() => navigate('/notifications')} />
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Legal</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row icon={Shield} label="Privacy Policy" onClick={() => navigate('/privacy')} />
          <div className="border-t border-border"><Row icon={FileText} label="Terms of Service" onClick={() => navigate('/terms')} /></div>
          <div className="border-t border-border"><Row icon={Trash2} label="Delete account info" sub="How to permanently delete your account" onClick={() => navigate('/delete-account')} /></div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Safety</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row icon={Ban} label="Blocked accounts" sub="Manage who you've blocked" onClick={() => navigate('/settings/blocked')} />
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-2">Account actions</p>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row icon={Lock} label="Clear cached preferences" sub="Resets local app settings on this device" onClick={handleClearLocal} />
          <div className="border-t border-border"><Row icon={LogOut} label="Sign out" onClick={() => { logout(); navigate('/auth'); }} /></div>
          <div className="border-t border-border"><Row icon={Trash2} label="Delete Account" sub="Permanently delete your account and data" danger onClick={() => navigate('/delete-account')} /></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
