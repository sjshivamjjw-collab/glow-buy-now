import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface TravelStructurePill {
  key: string;
  label: string;
  emoji: string;
  /** Heading line that goes after the emoji in the inserted snippet */
  heading: string;
}

export const TRAVEL_STRUCTURE_PILLS: TravelStructurePill[] = [
  { key: 'cost',       emoji: '💰', label: 'Cost Breakdown',    heading: 'Cost Breakdown' },
  { key: 'overrated',  emoji: '🙄', label: 'Overrated Things',  heading: 'What Felt Overrated' },
  { key: 'surprises',  emoji: '😲', label: 'Biggest Surprises', heading: 'What Surprised Me' },
  { key: 'mistakes',   emoji: '💡', label: 'Mistakes & Lessons',heading: 'Mistakes To Avoid' },
  { key: 'reach',      emoji: '📍', label: 'How To Reach',      heading: 'Getting There' },
  { key: 'rules',      emoji: '⚠️', label: 'Rules & Scams',     heading: 'Things To Know' },
  { key: 'itinerary',  emoji: '🕒', label: 'Itinerary / Plan',  heading: "How I'd Plan This" },
  { key: 'tips',       emoji: '✨', label: 'Tips & Advice',     heading: 'Tips & Advice' },
  { key: 'experience', emoji: '✍️', label: 'My Experience',     heading: 'The Vibe & Experience' },
];

/** Build the HTML snippet inserted into the rich-text editor for a given pill.
 *  Matches the editor's <br>-separated newline model and its bullet glyph. */
export function buildPillSnippet(pill: TravelStructurePill, bodyIsEmpty: boolean): string {
  const lead = bodyIsEmpty ? '' : '<br><br>';
  // Heading line, then two empty bullets, then a trailing line so the caret
  // ends on an empty bullet ready for typing.
  return `${lead}<strong>${pill.emoji} ${pill.heading}</strong><br>• <br>• `;
}

interface Props {
  bodyIsEmpty: boolean;
  onInsert: (pill: TravelStructurePill) => void;
  /** Optional node rendered on the same row as the trigger (e.g. the field label). */
  labelSlot?: React.ReactNode;
}

/**
 * Optional, collapsible helper shown above the body editor for Travel
 * Diaries posts. Pills inject a short section template into the editor
 * at the caret. Selection is purely visual — re-tapping a used pill is
 * a no-op so we never double-inject.
 */
export default function TravelStructureHelper({ bodyIsEmpty, onInsert, labelSlot }: Props) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState<Set<string>>(new Set());

  const handlePillClick = (pill: TravelStructurePill) => {
    if (used.has(pill.key)) return; // never re-inject
    onInsert(pill);
    setUsed(prev => {
      const next = new Set(prev);
      next.add(pill.key);
      return next;
    });
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      className="inline-flex items-center gap-1 text-[12px] text-[#2563eb] hover:text-[#1d4ed8] underline underline-offset-2"
    >
      Need help structuring your post? Click here
      {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="mb-2">
      {labelSlot ? (
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          {labelSlot}
          {trigger}
        </div>
      ) : (
        trigger
      )}


      {open && (
        <div className="mt-2 p-2.5 rounded-xl bg-[#fafafa] border border-[#eee]">
          <div className="grid grid-cols-3 gap-1.5">
            {TRAVEL_STRUCTURE_PILLS.map(pill => {
              const active = used.has(pill.key);
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => handlePillClick(pill)}
                  className={`flex items-center justify-center gap-1 px-2 py-2 rounded-full border text-[11px] font-medium leading-tight transition-colors text-center ${
                    active
                      ? 'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]'
                      : 'bg-white border-[#e5e5e5] text-[#3a3a3a] active:bg-[#f5f5f5]'
                  }`}
                >
                  <span className="text-[13px]">{pill.emoji}</span>
                  <span className="truncate">{pill.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[#9b9b9b] text-center">
            Tap a section to add it. Edit or delete freely — nothing is required.
          </p>
        </div>
      )}
    </div>
  );
}
