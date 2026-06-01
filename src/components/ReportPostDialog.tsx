import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Flag } from 'lucide-react';

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech or symbols' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous acts' },
  { value: 'self_harm', label: 'Self-harm or suicide' },
  { value: 'illegal', label: 'Illegal or regulated content' },
  { value: 'ip', label: 'Intellectual property violation' },
  { value: 'other', label: 'Something else' },
];

export function ReportPostDialog({
  open, onOpenChange, postId,
}: { open: boolean; onOpenChange: (v: boolean) => void; postId: string }) {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId) { toast({ title: 'Please sign in', variant: 'destructive' }); return; }
    if (!reason) { toast({ title: 'Pick a reason' }); return; }
    setBusy(true);
    const { error } = await supabase.from('post_reports' as any).insert({
      post_id: postId, reporter_id: userId, reason, details: details.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error && !/duplicate/i.test(error.message)) {
      toast({ title: 'Could not submit', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Report submitted', description: 'Thanks — our team will review within 24 hours.' });
    setReason(''); setDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="w-4 h-4" /> Report post</DialogTitle>
          <DialogDescription>Tell us what's wrong. Reports are confidential.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-1.5">
            {REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  reason === r.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Add any additional details (optional)"
            maxLength={1000}
            className="min-h-[80px]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
