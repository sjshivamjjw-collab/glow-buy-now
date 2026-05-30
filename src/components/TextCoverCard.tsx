interface Props {
  title: string | null | undefined;
  className?: string;
  /** Tailwind class for font-size; default suits 2-col grid cards. */
  textClassName?: string;
}

/**
 * Cream/beige text-only cover card used when a post has no image.
 * Mirrors the brand's Instagram aesthetic — warm background, handwritten
 * Caveat font, dark charcoal text, centered with breathing room.
 */
const TextCoverCard = ({ title, className = '', textClassName = 'text-[20px] sm:text-[24px]' }: Props) => {
  return (
    <div
      className={`w-full h-full flex items-center justify-center px-5 py-6 ${className}`}
      style={{ backgroundColor: '#F5EFE6' }}
    >
      <p
        className={`text-center leading-[1.2] line-clamp-6 ${textClassName}`}
        style={{
          fontFamily: "'Caveat', 'Patrick Hand', cursive",
          fontWeight: 600,
          color: '#2a2522',
          wordBreak: 'break-word',
        }}
      >
        {title || ''}
      </p>
    </div>
  );
};

export default TextCoverCard;
