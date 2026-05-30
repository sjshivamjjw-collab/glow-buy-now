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
const TextCoverCard = ({ title, className = '', textClassName = 'text-[18px] sm:text-[22px]' }: Props) => {
  return (
    <div
      className={`w-full h-full flex items-center justify-center px-5 py-6 bg-[#F5EFE6] ${className}`}
    >
      <p
        className={`font-[Caveat] font-semibold text-[#2a2522] text-center leading-[1.15] line-clamp-6 ${textClassName}`}
        style={{ wordBreak: 'break-word' }}
      >
        {title || ''}
      </p>
    </div>
  );
};

export default TextCoverCard;
