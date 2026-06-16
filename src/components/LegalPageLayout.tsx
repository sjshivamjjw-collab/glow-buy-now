import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from './Footer';
import SEO from './SEO';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  /** Custom page title for <title> + og:title. Defaults to `${title} · Ripple`. */
  seoTitle?: string;
  /** Custom meta description for this page. */
  seoDescription?: string;
  children: ReactNode;
}

const LegalPageLayout = ({
  title,
  lastUpdated = 'May 2, 2026',
  seoTitle,
  seoDescription,
  children,
}: LegalPageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      <SEO title={seoTitle ?? `${title} · Ripple`} description={seoDescription} />
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </header>

      <main className="flex-1 px-5 py-6">
        <p className="text-xs text-muted-foreground mb-5">
          Last updated: {lastUpdated}
        </p>
        <article className="prose prose-sm max-w-none text-foreground space-y-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
      </main>

      <Footer standalone />
    </div>
  );
};

export default LegalPageLayout;
