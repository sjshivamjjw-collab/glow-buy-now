import { useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { composeCostBreakdown, type CostRow, type LayoutEditorState } from '@/lib/composeLayout';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onDone: (files: File[], states: LayoutEditorState[]) => void;
  onCancel: () => void;
  initialState?: Extract<LayoutEditorState, { kind: 'cost' }>;
}

const BG = '#F5F0E8';

export const CostBreakdownEditor = ({ onDone, onCancel, initialState }: Props) => {
  const { toast } = useToast();
  const [headerL, setHeaderL] = useState(initialState?.headerL ?? 'Item');
  const [headerR, setHeaderR] = useState(initialState?.headerR ?? 'Amount');
  const [rows, setRows] = useState<CostRow[]>(initialState?.rows ?? [
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
  ]);
  const [busy, setBusy] = useState(false);


  const updateRow = (i: number, key: 'left' | 'right', v: string) => {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  };

  const handleDone = async () => {
    const cleaned = rows.filter((r) => r.left.trim() || r.right.trim());
    if (!cleaned.length) {
      toast({ title: 'Add at least one row', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const file = await composeCostBreakdown({ left: headerL || 'Item', right: headerR || 'Amount' }, cleaned);
      onDone([file], [{ kind: 'cost', headerL: headerL || 'Item', headerR: headerR || 'Amount', rows: cleaned }]);
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not export receipt', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: BG }}>
      <div className="flex items-center justify-between px-3 py-3 pt-[calc(env(safe-area-inset-top)+12px)]" style={{ color: '#2B2B2B' }}>
        <button onClick={onCancel} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-sm font-semibold">Cost Breakdown</span>
        <button
          onClick={handleDone}
          disabled={busy}
          className="px-3 py-1.5 rounded-full bg-[#2B2B2B] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="mt-6 mx-auto max-w-md text-[#2B2B2B]">
          {/* Headers */}
          <div className="flex items-start gap-3 pb-3 border-b border-[#2B2B2B]/20">
            <input
              value={headerL}
              onChange={(e) => setHeaderL(e.target.value.slice(0, 24))}
              placeholder="Item"
              className="flex-1 bg-transparent outline-none text-sm font-bold uppercase tracking-wide placeholder:text-[#2B2B2B]/40"
            />
            <input
              value={headerR}
              onChange={(e) => setHeaderR(e.target.value.slice(0, 16))}
              placeholder="Amount"
              className="w-28 bg-transparent outline-none text-sm font-bold uppercase tracking-wide text-right placeholder:text-[#2B2B2B]/40"
            />
            <span className="w-6" />
          </div>

          {/* Rows */}
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-[#2B2B2B]/15">
              <textarea
                rows={1}
                value={r.left}
                onChange={(e) => { updateRow(i, 'left', e.target.value); autoGrow(e.currentTarget); }}
                placeholder="e.g. Flight to Goa"
                className="flex-1 bg-transparent outline-none text-[15px] leading-snug resize-none placeholder:text-[#2B2B2B]/35"
              />
              <textarea
                rows={1}
                value={r.right}
                onChange={(e) => { updateRow(i, 'right', e.target.value); autoGrow(e.currentTarget); }}
                placeholder="₹ 0"
                className="w-28 bg-transparent outline-none text-[15px] leading-snug resize-none text-right placeholder:text-[#2B2B2B]/35"
              />
              <button
                onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                aria-label="Delete row"
                className="w-6 h-6 mt-0.5 rounded-full text-[#2B2B2B]/60 hover:text-[#ef4444] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={() => setRows((p) => [...p, { left: '', right: '' }])}
            className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#2B2B2B]/70 hover:text-[#2B2B2B]"
          >
            <Plus className="w-4 h-4" /> Add row
          </button>
        </div>
      </div>
    </div>
  );
};

const autoGrow = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};
