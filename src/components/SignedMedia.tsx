import { useEffect, useState } from 'react';
import { getSignedUrl } from '@/lib/storageUrls';

interface Props {
  bucket: string;
  src: string | null | undefined;
  alt?: string;
  className?: string;
}

// Resolves a private-bucket attachment to a short-lived signed URL and renders
// it as an <img>. Falls back to the raw value while loading or on error.
export const SignedImage = ({ bucket, src, alt, className }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!src) { setUrl(null); return; }
    getSignedUrl(bucket, src).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [bucket, src]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};

interface LinkProps {
  bucket: string;
  src: string | null | undefined;
  download?: string;
  className?: string;
  children: React.ReactNode;
}

export const SignedLink = ({ bucket, src, download, className, children }: LinkProps) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!src) { setUrl(null); return; }
    getSignedUrl(bucket, src).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [bucket, src]);
  if (!url) return <span className={className}>{children}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" download={download} className={className}>
      {children}
    </a>
  );
};
