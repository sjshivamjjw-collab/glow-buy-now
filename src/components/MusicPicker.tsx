import { useEffect, useRef, useState } from 'react';
import { Search, X, Play, Pause, Loader2, Music } from 'lucide-react';

export interface PickedTrack {
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string | null;
}

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl100?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (t: PickedTrack) => void;
}

const TRENDING_QUERIES = ['Top Hits', 'Bollywood', 'Lo-fi', 'Chill', 'Workout', 'Indie'];

export const MusicPicker = ({ open, onClose, onPick }: Props) => {
  const [q, setQ] = useState('');
  const [activeChip, setActiveChip] = useState<string>('Top Hits');
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch results (debounced)
  useEffect(() => {
    if (!open) return;
    const term = (q.trim() || activeChip).trim();
    if (!term) { setResults([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = `https://itunes.apple.com/search?media=music&entity=song&limit=30&term=${encodeURIComponent(term)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const json = await res.json();
        const list: ITunesTrack[] = (json.results || []).filter((r: ITunesTrack) => !!r.previewUrl);
        setResults(list);
      } catch (e) {
        if ((e as any).name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, activeChip, open]);

  // Stop audio on close
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }, [open]);

  const togglePlay = (track: ITunesTrack) => {
    if (!track.previewUrl) return;
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(track.previewUrl);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;
    setPlayingId(track.trackId);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      console.error('[MusicPicker] audio error', track.previewUrl);
      setPlayingId(null);
    };
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.error('[MusicPicker] play() rejected', err);
        setPlayingId(null);
      });
    }
  };

  const pick = (track: ITunesTrack) => {
    if (!track.previewUrl) return;
    audioRef.current?.pause();
    setPlayingId(null);
    onPick({
      title: track.trackName,
      artist: track.artistName,
      previewUrl: track.previewUrl,
      artworkUrl: track.artworkUrl100?.replace('100x100', '300x300') || null,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
          <h3 className="font-bold text-[#0a0a0a]">Add music</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-[#6b6b6b] shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search songs or artists"
              className="flex-1 bg-transparent text-sm text-[#0a0a0a] placeholder:text-[#a0a0a0] focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ('')} className="w-5 h-5 flex items-center justify-center text-[#6b6b6b]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!q && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
              {TRENDING_QUERIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveChip(c)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    activeChip === c
                      ? 'bg-[#ef4444] text-white border-[#ef4444]'
                      : 'bg-white text-[#6b6b6b] border-[#e5e5e5]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 mt-1">
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center py-10 text-[#6b6b6b]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-[#a0a0a0] text-sm">
              <Music className="w-8 h-8 mb-2" />
              No tracks found
            </div>
          )}
          {results.map((t) => (
            <div
              key={t.trackId}
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#f8f8f8] active:bg-[#f0f0f0]"
            >
              <button
                onClick={() => togglePlay(t)}
                className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#f0f0f0] shrink-0 group"
              >
                {t.artworkUrl100 ? (
                  <img src={t.artworkUrl100} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-[#a0a0a0] m-auto" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {playingId === t.trackId ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </div>
                {playingId === t.trackId && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Pause className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0a0a0a] truncate">{t.trackName}</p>
                <p className="text-xs text-[#6b6b6b] truncate">{t.artistName}</p>
              </div>
              <button
                onClick={() => pick(t)}
                className="text-xs font-bold text-white bg-[#ef4444] px-3 py-1.5 rounded-full"
              >
                Use
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#a0a0a0] text-center px-4 py-2 border-t border-[#f0f0f0]">
          30-second previews powered by iTunes
        </p>
      </div>
    </div>
  );
};
