import { MentionProfile } from '@/hooks/useMentionAutocomplete';
import InitialAvatar from '@/components/InitialAvatar';

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
          <InitialAvatar
            avatarUrl={p.avatar_url}
            name={p.name}
            username={p.username}
            size={32}
          />
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
