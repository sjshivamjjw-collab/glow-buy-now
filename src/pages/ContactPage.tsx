import LegalPageLayout from '@/components/LegalPageLayout';
import { Mail, MapPin, Clock } from 'lucide-react';

const SUPPORT_EMAIL = 'shivam@ripple-shop.com';
const ADDRESS_LINE = 'Mumbai, Maharashtra, India';

const ContactPage = () => (
  <LegalPageLayout title="Contact Us">
    <p>
      We're a small team and we read every message. Reach out for order help,
      seller onboarding, partnerships, or anything else.
    </p>

    <div className="not-prose space-y-3 my-4">
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-semibold text-foreground">{SUPPORT_EMAIL}</p>
        </div>
      </a>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Address</p>
          <p className="text-sm font-semibold text-foreground">{ADDRESS_LINE}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Support hours</p>
          <p className="text-sm font-semibold text-foreground">Mon – Sat, 10:00 – 19:00 IST</p>
        </div>
      </div>
    </div>

    <h2>Response Time</h2>
    <p>
      We respond to most queries within <strong>1 business day</strong>. Order
      and refund issues are prioritised.
    </p>

    <h2>Business Information</h2>
    <p>
      Ripple — a live commerce platform connecting Indian sellers with
      shoppers across India.
    </p>
  </LegalPageLayout>
);

export default ContactPage;
