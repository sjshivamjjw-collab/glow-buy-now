import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Plus, Clock, Loader2, CheckCircle2, XCircle, Sparkles, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type Submission = {
  id: string;
  destination: string;
  trip_title: string;
  duration_label: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  created_at: string;
  delivered_file_path: string | null;
  delivered_file_name: string | null;
  delivered_at: string | null;
};

const STATUS_META: Record<Submission['status'], { label: string; color: string; bg: string; Icon: any }> = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: Clock },
  in_progress: { label: 'In progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', Icon: Sparkles },
  delivered:   { label: 'Delivered',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  Icon: CheckCircle2 },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  Icon: XCircle },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const MyReelsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Submission[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('reel_submissions' as any)
        .select('id, destination, trip_title, duration_label, status, created_at, delivered_file_path, delivered_file_name, delivered_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleDownload = async (r: Submission) => {
    if (!r.delivered_file_path) return;
    setDownloadingId(r.id);
    try {
      const { data, error } = await supabase.storage
        .from('reel-submissions')
        .createSignedUrl(r.delivered_file_path, 60 * 60, { download: r.delivered_file_name || true });
      if (error || !data?.signedUrl) throw error || new Error('No URL');
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast({ title: 'Could not download', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] max-w-lg mx-auto pb-24">
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a] px-4 pt-3 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 rounded-xl text-[#fafafa]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Film className="w-4 h-4 text-[#ef4444]" />
          <h1 className="text-base font-bold text-[#fafafa]">My Reel Requests</h1>
        </div>
        <button
          onClick={() => navigate('/reel/new')}
          aria-label="New reel request"
          className="p-2 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#a0a0a0]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ef4444]/15 flex items-center justify-center mb-3">
              <Film className="w-6 h-6 text-[#ef4444]" />
            </div>
            <h2 className="text-base font-bold text-[#fafafa] mb-1">No reel requests yet</h2>
            <p className="text-xs text-[#a0a0a0] mb-5">Submit your trip and we'll craft a reel for you.</p>
            <button
              onClick={() => navigate('/reel/new')}
              className="px-5 py-3 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create a reel
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              const Icon = meta.Icon;
              return (
                <li
                  key={r.id}
                  className="rounded-2xl bg-[#111] border border-[#2a2a2a] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="text-sm font-bold text-[#fafafa] leading-snug">{r.trip_title}</h3>
                    <span
                      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a0a0a0]">
                    {r.destination} · {r.duration_label}
                  </p>
                  <p className="text-[10px] text-[#6b6b6b] mt-1.5">Requested {formatDate(r.created_at)}</p>
                  {r.delivered_file_path && (
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingId === r.id}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white text-xs font-bold disabled:opacity-60"
                    >
                      {downloadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download your reel
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyReelsPage;
