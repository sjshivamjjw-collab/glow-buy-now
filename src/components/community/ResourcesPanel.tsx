import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/lib/storageUrls';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileBox, Plus, Link2, FileText, Loader2, Trash2, Download, X, Upload, Sparkles, Lock } from 'lucide-react';
import type { TierInfo } from '@/hooks/useCommunityMembership';
import { TierLockOverlay } from './TierLockOverlay';

interface Resource {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  kind: 'file' | 'link';
  url: string;
  file_size: number | null;
  required_tier_level: number;
  created_at: string;
}

const fmtSize = (b: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

interface Props {
  communityId: string; isCreator: boolean; tierLevel: number; tiers: TierInfo[]; slug: string;
}

export const ResourcesPanel = ({ communityId, isCreator, tierLevel, tiers, slug }: Props) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'file' | 'link'>('file');
  const [form, setForm] = useState({ title: '', description: '', url: '', required_tier_level: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('community_resources' as any).select('*')
      .eq('community_id', communityId).order('created_at', { ascending: false });
    setResources((data as any as Resource[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [communityId]);

  const reset = () => { setForm({ title: '', description: '', url: '', required_tier_level: 0 }); setFile(null); setTab('file'); };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    let payload: any = {
      community_id: communityId, created_by: userId,
      title: form.title.trim(), description: form.description.trim() || null,
      kind: tab,
      required_tier_level: form.required_tier_level,
    };
    if (tab === 'file') {
      if (!file) { toast({ title: 'Pick a file', variant: 'destructive' }); setSaving(false); return; }
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${communityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('community-resources').upload(path, file);
      if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); setSaving(false); return; }
      // Store the storage path; we generate short-lived signed URLs on demand
      // so private bucket RLS can verify membership and tier on each access.
      payload.url = path;
      payload.file_size = file.size;
    } else {
      if (!form.url.trim().startsWith('http')) { toast({ title: 'Enter a valid URL (https://…)', variant: 'destructive' }); setSaving(false); return; }
      payload.url = form.url.trim();
    }
    const { error } = await supabase.from('community_resources' as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setShowForm(false); reset(); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    const { error } = await supabase.from('community_resources' as any).delete().eq('id', id);
    if (error) toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <div className="space-y-4">
      {isCreator && (
        <button onClick={() => { reset(); setShowForm(true); }}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add resource
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : resources.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          <FileBox className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No resources yet.
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map(r => {
            const locked = !isCreator && tierLevel < (r.required_tier_level || 0);
            return (
              <div key={r.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${locked ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                    {locked ? <Lock className="w-5 h-5" /> : r.kind === 'link' ? <Link2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm text-foreground truncate">{r.title}</p>
                      {r.required_tier_level > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                          <Sparkles className="w-2.5 h-2.5" /> Premium
                        </span>
                      )}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                    {r.kind === 'file' && r.file_size && <p className="text-[10px] text-muted-foreground">{fmtSize(r.file_size)}</p>}
                  </div>
                  {!locked && (
                    <a href={r.url} target="_blank" rel="noreferrer" download={r.kind === 'file' ? '' : undefined}
                      className="p-2 rounded-xl bg-primary/10 text-primary">
                      {r.kind === 'file' ? <Download className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    </a>
                  )}
                  {isCreator && (
                    <button onClick={() => remove(r.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {locked && (
                  <TierLockOverlay compact requiredLevel={r.required_tier_level} tiers={tiers} slug={slug}
                    label="Resource locked" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end md:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Add resource</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-xl">
              <button onClick={() => setTab('file')}
                className={`py-2 rounded-lg text-sm font-semibold ${tab === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                File
              </button>
              <button onClick={() => setTab('link')}
                className={`py-2 rounded-lg text-sm font-semibold ${tab === 'link' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                Link
              </button>
            </div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Title" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Short description (optional)" rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm resize-none" />
            {tab === 'file' ? (
              <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-background border-2 border-dashed border-border text-sm text-muted-foreground cursor-pointer">
                <Upload className="w-4 h-4" />
                {file ? file.name : 'Choose file'}
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://…" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm" />
            )}
            <label className="block text-xs text-muted-foreground">
              Who can access?
              <select value={form.required_tier_level} onChange={e => setForm({ ...form, required_tier_level: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-background border border-border text-sm">
                <option value={0}>All members</option>
                {tiers.filter(t => t.sort_order > 0).map(t => (
                  <option key={t.id} value={t.sort_order}>{t.name} and above</option>
                ))}
              </select>
            </label>
            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Add to community'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
