import { Link } from 'react-router-dom';

interface FooterProps {
  /** When true, no extra bottom padding for BottomNav. Use on pages without BottomNav (e.g. /auth). */
  standalone?: boolean;
}

const linkCls =
  'text-[11px] text-muted-foreground hover:text-foreground transition-colors';

const Sep = () => <span className="text-[11px] text-muted-foreground">·</span>;

const Footer = ({ standalone = false }: FooterProps) => {
  return (
    <footer className={`px-4 py-3 ${standalone ? '' : 'mb-16'}`}>
      <div className="max-w-lg mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link to="/terms" className={linkCls}>Terms</Link>
        <Sep />
        <Link to="/privacy" className={linkCls}>Privacy</Link>
        <Sep />
        <Link to="/delete-account" className={linkCls}>Delete account</Link>
        <Sep />
        <Link to="/contact" className={linkCls}>Contact</Link>
        <Sep />
        <Link to="/about" className={linkCls}>About</Link>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1">
        © {new Date().getFullYear()} Ripple
      </p>
    </footer>
  );
};

export default Footer;
