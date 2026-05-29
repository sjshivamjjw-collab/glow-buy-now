// Shared visual identity for anonymous "Rippler" posts.
// Used by Discover, PostDetail, and anywhere an anonymous post is rendered.

const PENGUIN_SRC = 'https://cdn.jsdelivr.net/npm/openmoji@latest/color/svg/1F427.svg';

export const RIPPLER_NAME = 'Rippler';

export const PenguinAvatar = ({
  size = 20,
  className = '',
}: {
  size?: number;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center justify-center rounded-full bg-[#0f3460]/20 ring-1 ring-[#2a2a2a] shrink-0 ${className}`}
    style={{ width: size, height: size }}
    aria-label="Rippler"
  >
    <img
      src={PENGUIN_SRC}
      alt=""
      style={{ width: size * 0.8, height: size * 0.8 }}
      className="object-contain"
    />
  </span>
);

export const RipplerName = ({ className = '' }: { className?: string }) => (
  <span className={className}>{RIPPLER_NAME}</span>
);
