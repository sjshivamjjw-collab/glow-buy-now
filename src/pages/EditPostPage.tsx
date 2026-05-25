import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, MapPin, Hash, X, Check } from 'lucide-react';

const TITLE_MAX = 90;

const EditPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('posts' as any).select('*').eq('id', id).maybeSingle();
      if (!data) { setLoading(false); setNotAllowed(true); return; }
      const p: any = data;
      if (p.user_id !== userId) { setNotAllowed(true); setLoading(false); return; }
      setTitle(p.title || '');
      setBody(p.body || '');
      setLocation(p.location || '');
      setHashtags(p.hashtags || []);
      setLoading(false);
    };
    load();
  }, [id, userId]);

  const commitHashtag = () => {
    const raw = hashtagInput.trim().replace(/^#+/, '').toLowerCase();
    if (!raw) return;
    if (hashtags.includes(raw)) { setHashtagInput(''); return; }
    setHashtags(prev => [...prev, raw].slice(0, 20));
    setHashtagInput('');
  };

  const handleHashtagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitHashtag();
    } else if (e.key === 'Backspace' && !hashtagInput && hashtags.length) {
      setHashtags(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) { toast({ title: 'Add a title', variant: 'destructive' }); return; }
    if (!body.trim()) { toast({ title: 'Add a description', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('posts' as any).update({
      title: title.trim(),
      body: body.trim(),
      location: location.trim() || null,
      hashtags,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Post updated' });
    navigate(`/p/${id}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 animate-spin text-[#ef4444]" /></div>;
  }
  if (notAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#6b6b6b] gap-3">
        <p>You can't edit this post.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-full bg-[#0a0a0a] text-white text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-4 pt-4 pb-32">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
          </button>
          <h1 className="text-xl font-bold text-[#0a0a0a]">Edit post</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>

      <p className="text-xs text-[#6b6b6b] mb-4">Photos, videos and category can't be edited. To change those, delete and repost.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
            placeholder="Title"
            className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
          />
          <p className="mt-1 text-[11px] text-[#9b9b9b] text-right">{title.length}/{TITLE_MAX}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Description</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write something..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Location</label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9b9b]" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Hashtags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {hashtags.map(h => (
              <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444] text-xs font-semibold">
                #{h}
                <button onClick={() => setHashtags(prev => prev.filter(x => x !== h))} aria-label={`Remove ${h}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9b9b]" />
            <input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKey}
              onBlur={commitHashtag}
              placeholder="Add a hashtag and press enter"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#0a0a0a] placeholder:text-[#9b9b9b] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
