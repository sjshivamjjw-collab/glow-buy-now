import { useEffect, useRef, useState } from 'react';

interface LazyVideoThumbnailProps {
  src: string;
  className?: string;
  poster?: string | null;
}

const LazyVideoThumbnail = ({ src, className, poster }: LazyVideoThumbnailProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || shouldLoad) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        io.disconnect();
      }
    }, { rootMargin: '350px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={rootRef} className={className}>
      {shouldLoad ? (
        // preload="none" — we only need a poster frame in the feed, not the
        // video bytes. Range-requesting metadata for every video card on a
        // mobile feed was costing seconds of perceived load time.
        <video
          src={`${src}#t=0.1`}
          poster={poster || undefined}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="none"
          // @ts-ignore - iOS Safari attribute
          webkit-playsinline="true"
        />
      ) : (
        <div className="h-full w-full bg-secondary" />
      )}
    </div>
  );
};

export default LazyVideoThumbnail;
