import LegalPageLayout from '@/components/LegalPageLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Mail, ShieldAlert, Trash2, HelpCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'shivam@ripple-shop.com';

const QuickCard = ({
  icon: Icon,
  title,
  subtitle,
  href,
  external = false,
}: {
  icon: typeof Mail;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
}) => {
  const className =
    'flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary transition-colors';
  const inner = (
    <>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </>
  );
  return external ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link to={href} className={className}>
      {inner}
    </Link>
  );
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I sign up?',
    a: 'Enter your phone number and we\'ll text you a one-time code. No passwords to remember.',
  },
  {
    q: "I'm not getting my OTP. What do I do?",
    a: 'Check your signal, make sure the phone number is correct (with country code), and wait 60 seconds before requesting a new code. If it still doesn\'t arrive, email us and we\'ll help.',
  },
  {
    q: 'How do I create a post?',
    a: 'Tap the + button in the bottom navigation bar. You can share a photo, video, or just text.',
  },
  {
    q: 'How do I report a post or user?',
    a: 'Open any post or profile, tap the three-dot menu in the top right, and choose Report. Our team reviews every report within 24 hours.',
  },
  {
    q: 'How do I block someone?',
    a: 'Visit their profile, tap the three-dot menu, and choose Block. They will no longer be able to see your posts or contact you.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete my account data, or visit myripple.co.in/delete-account. Deletion is permanent and removes all your posts, comments, likes and profile data.',
  },
  {
    q: 'How do communities work?',
    a: 'Communities are spaces built around shared interests. Join free or paid membership tiers to access private chat channels, events, and resources.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. All data is encrypted in transit, your phone number is never shown publicly, and we do not sell your data or run ads. See our Privacy Policy for the full details.',
  },
];

const SupportPage = () => (
  <LegalPageLayout
    title="Support"
    seoTitle="Ripple Support — help, FAQs and reporting issues"
    seoDescription="Get help with your Ripple account, posts, communities, payments, content reports and more. Replies within one business day."
  >
    <p>Need help with Ripple? We're here.</p>

    <div className="not-prose grid gap-3 my-4">
      <QuickCard
        icon={Mail}
        title="Email us"
        subtitle={SUPPORT_EMAIL}
        href={`mailto:${SUPPORT_EMAIL}`}
        external
      />
      <QuickCard
        icon={ShieldAlert}
        title="Report abuse or safety issue"
        subtitle="Actioned within 24 hours"
        href={`mailto:${SUPPORT_EMAIL}?subject=Report%20abuse%20on%20Ripple`}
        external
      />
      <QuickCard
        icon={Trash2}
        title="Delete my account"
        subtitle="Permanently removes all your data"
        href="/delete-account"
      />
      <QuickCard
        icon={HelpCircle}
        title="Frequently asked questions"
        subtitle="Scroll down for answers"
        href="#faq"
      />
    </div>

    <h2 id="faq">Frequently asked questions</h2>
    <div className="not-prose my-3">
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-sm font-medium text-foreground text-left">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>

    <h2>Response time</h2>
    <p>
      We respond to all support requests within <strong>1 business day</strong>.
      Reports of abuse, illegal content, or safety issues are actioned within{' '}
      <strong>24 hours</strong>.
    </p>

    <div className="not-prose flex items-center gap-3 p-4 rounded-2xl bg-card border border-border my-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Support hours</p>
        <p className="text-sm font-semibold text-foreground">
          Mon – Sat, 10:00 – 19:00 IST
        </p>
      </div>
    </div>

    <h2>Grievance officer</h2>
    <p>
      In accordance with India's IT Rules 2021, complaints about user-generated
      content can be sent to our Grievance Officer at{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We will
      acknowledge your complaint within 24 hours and resolve it within 15 days.
    </p>

    <h2>Other links</h2>
    <p>
      <Link to="/privacy">Privacy Policy</Link> ·{' '}
      <Link to="/terms">Terms of Service</Link> ·{' '}
      <Link to="/contact">Contact</Link> · <Link to="/about">About Ripple</Link>
    </p>
  </LegalPageLayout>
);

export default SupportPage;
