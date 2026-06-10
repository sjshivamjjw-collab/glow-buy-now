import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Image as ImageIcon, LayoutGrid, Receipt } from 'lucide-react';

export type LayoutChoice = 'single' | 'grid' | 'cost';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (c: LayoutChoice) => void;
}

const OPTIONS: { key: LayoutChoice; title: string; subtitle: string; Icon: typeof ImageIcon }[] = [
  { key: 'single', title: 'Single Image with Text', subtitle: 'Swipeable carousel · text on each slide', Icon: ImageIcon },
  { key: 'grid', title: '2×2 Grid with Text', subtitle: 'Four photos in one square card', Icon: LayoutGrid },
  { key: 'cost', title: 'Cost Breakdown', subtitle: 'Clean beige receipt with rows', Icon: Receipt },
];

export const LayoutPickerSheet = ({ open, onOpenChange, onPick }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Choose a layout</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {OPTIONS.map(({ key, title, subtitle, Icon }) => (
            <button
              key={key}
              onClick={() => onPick(key)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[#e5e5e5] bg-white hover:border-[#ef4444]/50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-[#2b2b2b]">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#0a0a0a]">{title}</div>
                <div className="text-xs text-[#6b6b6b] mt-0.5">{subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
