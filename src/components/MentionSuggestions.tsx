import { MentionProfile } from '@/hooks/useMentionAutocomplete';

interface Props {
  items: MentionProfile[];
  active: number;
  onPick: (item: MentionProfile) => void;
  onHover: (i: number) => void;
  variant?: 'light' | 'dark';
  className?: string;
}

export const MentionSuggestions = ({ items, active, onPick, onHover, variant = 'light', className = '' }: Props) => {
  if (!items.length) return null;
  const isDark = variant === 'dark';
  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-lg ${
        isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e5e5e5]'
      } ${className}`}
    >
      {items.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onPick(p); }}
          onMouseEnter={() => onHover(i)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === active
              ? isDark ? 'bg-[#2a2a2a]' : 'bg-[#f5f5f5]'
              : ''
          }`}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
              isDark ? 'bg-[#2a2a2a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#0a0a0a]'
            }`}>
              {(p.name || p.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${isDark ? 'text-[#fafafa]' : 'text-[#0a0a0a]'}`}>
              {p.name || p.username}
            </p>
            <p className={`text-xs truncate ${isDark ? 'text-[#a0a0a0]' : 'text-[#6b6b6b]'}`}>@{p.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
