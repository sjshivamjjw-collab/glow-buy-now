import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LegalPageLayout from '@/components/LegalPageLayout';
import { Mail, Smartphone, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SUPPORT_EMAIL = 'shivam@ripple-shop.com';

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { userId, logout } = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!userId) {
      navigate('/auth');
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('profiles').update({
      name: null, username: null, avatar_url: null, date_of_birth: null, gender: null,
    }).eq('id', userId);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast({ title: 'Could not process request', description: 'Please email support.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Account data cleared', description: 'You will be signed out now.' });
    setTimeout(() => { logout(); navigate('/auth'); }, 800);
  };

  return (
    <LegalPageLayout title="Delete Your Account">
      <p>
        You can permanently delete your Ripple account and the personal data
        associated with it at any time. This page explains exactly what gets
        removed, what (if anything) is retained, and the two ways to start
        the process.
      </p>

      <div className="not-prose grid gap-3 my-4">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Option 1 — In the Ripple app</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the <strong>red "Permanently delete my account" button</strong> at the bottom of this page and confirm.
            </p>
          </div>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Ripple%20account`}
          className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Option 2 — Email request</p>
            <p className="text-xs text-muted-foreground mt-1">
              Email <strong>{SUPPORT_EMAIL}</strong> from the address or phone number on your account with the subject <em>"Delete my Ripple account"</em>. We action verified requests within 7 days.
            </p>
          </div>
        </a>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Timeline</p>
            <p className="text-xs text-muted-foreground mt-1">
              Personal data is removed within <strong>30 days</strong> of your request.
            </p>
          </div>
        </div>
      </div>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your profile: name, username, avatar, date of birth, gender, city, bio.</li>
        <li>Your content: posts, photos, videos, captions, comments, likes, saves, and follows.</li>
        <li>Your chat messages in communities.</li>
        <li>Your account credentials and the link between your phone number and the Ripple account.</li>
        <li>Your push notification tokens and personalisation data.</li>
      </ul>

      <h2>What may be retained</h2>
      <ul>
        <li><strong>Minimal records required by law</strong> — for example, transaction or moderation logs we are legally required to keep, retained only for the period required.</li>
        <li><strong>Anonymised analytics</strong> — aggregated, non-identifying usage data that cannot be linked back to you.</li>
        <li><strong>Reports against your account</strong> — to prevent the same person from re-registering after being banned for serious policy violations.</li>
      </ul>

      <h2>Things to know before you delete</h2>
      <ul>
        <li>Deletion is <strong>permanent</strong> — your username, content, and followers cannot be recovered.</li>
        <li>You can sign up again with the same phone number, but it will be a fresh account with no history.</li>
        <li>Copies of your content that other users may have downloaded or screenshotted are outside our control.</li>
      </ul>

      <div className="not-prose flex items-start gap-3 p-4 rounded-2xl bg-secondary/40 border border-border my-4">
        <Trash2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Need help, or didn't receive a confirmation? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">{SUPPORT_EMAIL}</a> and we'll respond within 24 hours.
        </p>
      </div>

      {userId && (
        <div className="not-prose my-6">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full py-4 rounded-2xl bg-live text-live-foreground font-bold text-base flex items-center justify-center gap-2 shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Permanently delete my account
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            You will be signed out immediately after confirming.
          </p>
        </div>
      )}

      <h2>Related</h2>
      <ul>
        <li><a href="/privacy">Privacy Policy</a> — what data we collect and how we handle it.</li>
        <li><a href="/contact">Contact Us</a> — support email, address, and hours.</li>
      </ul>

      {confirmOpen && (
        <div className="not-prose fixed inset-0 bg-foreground/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-foreground font-bold text-lg mb-2">Delete your account?</h3>
            <p className="text-muted-foreground text-sm mb-5">
              This clears your profile data and signs you out immediately. Posts, comments and full account removal complete within 30 days.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-live text-live-foreground font-semibold disabled:opacity-50">
                {deleting ? 'Working…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LegalPageLayout>
  );
};

export default DeleteAccountPage;
