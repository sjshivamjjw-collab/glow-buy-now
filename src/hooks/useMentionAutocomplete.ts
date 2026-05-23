import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentionProfile {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

interface ApplyResult {
  value: string;
  cursor: number;
}

interface UseMentionOptions {
  value: string;
  cursor: number | null;
  onPick: (next: ApplyResult) => void;
}

export function useMentionAutocomplete({ value, cursor, onPick }: UseMentionOptions) {
  const [items, setItems] = useState<MentionProfile[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  const query = useMemo(() => {
    if (cursor == null) return null;
    const before = value.slice(0, cursor);
    // @ must be at start or preceded by whitespace
    const m = before.match(/(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/);
    return m ? m[1] : null;
  }, [value, cursor]);

  useEffect(() => {
    if (query == null) {
      setItems([]);
      setActive(0);
      return;
    }
    const myId = ++reqIdRef.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('search_profiles_for_mention' as any, { _q: query });
        if (reqIdRef.current !== myId) return;
        setItems(((data as any[]) || []) as MentionProfile[]);
        setActive(0);
      } finally {
        if (reqIdRef.current === myId) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const open = query !== null && items.length > 0;

  const applyItem = (item: MentionProfile) => {
    if (cursor == null) return;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const m = before.match(/(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/);
    if (!m) return;
    const atIdx = before.length - m[0].length + (m[0].startsWith('@') ? 0 : 1);
    const insert = `@${item.username} `;
    const nextValue = value.slice(0, atIdx) + insert + after;
    const nextCursor = atIdx + insert.length;
    onPick({ value: nextValue, cursor: nextCursor });
    setItems([]);
  };

  // Returns true if the key event was handled (consumer should preventDefault & stop)
  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (!open) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % items.length); return true; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyItem(items[active]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); setItems([]); return true; }
    return false;
  };

  const close = () => setItems([]);

  return { query, items, active, setActive, applyItem, handleKeyDown, open, loading, close };
}
