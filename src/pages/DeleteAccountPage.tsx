import LegalPageLayout from '@/components/LegalPageLayout';
import { Mail, Smartphone, Clock, Trash2 } from 'lucide-react';

const SUPPORT_EMAIL = 'shivam@ripple-shop.com';

const DeleteAccountPage = () => (
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
            Open Ripple → tap your profile → <strong>Settings</strong> → <strong>Account actions</strong> → <strong>Delete my account data</strong> → confirm.
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
      <li>Your content: posts, photos, videos, captions, comments, likes, saves, follows, livestream recordings.</li>
      <li>Your chat messages in communities and livestreams.</li>
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

    <h2>Related</h2>
    <ul>
      <li><a href="/privacy">Privacy Policy</a> — what data we collect and how we handle it.</li>
      <li><a href="/contact">Contact Us</a> — support email, address, and hours.</li>
    </ul>
  </LegalPageLayout>
);

export default DeleteAccountPage;
