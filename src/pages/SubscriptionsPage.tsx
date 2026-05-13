import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const statusBadge: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  open: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [disputeFor, setDisputeFor] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: m }, { data: d }] = await Promise.all([
      supabase.from('memberships' as any)
        .select('id, status, current_period_end, started_at, source, razorpay_payment_id, community_id, tier_id, communities(name, slug, cover_url), community_tiers(name, kind, price_inr)')
        .eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('membership_disputes' as any)
        .select('*, communities(name)')
        .eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    setMemberships((m as any[]) || []);
    setDisputes((d as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const openDisputes = new Set(disputes.filter(d => d.status === 'open').map(d => d.membership_id));

  const submitDispute = async () => {
    if (!disputeFor || !userId) return;
    if (reason.trim().length < 10) {
      toast({ title: 'Please add more detail', description: 'At least 10 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('membership_disputes' as any).insert({
      membership_id: disputeFor.id,
      user_id: userId,
      community_id: disputeFor.community_id,
      reason: reason.trim().slice(0, 2000),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Dispute submitted', description: 'Our team will review it shortly.' });
    setDisputeFor(null);
    setReason('');
    load();
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-8">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-foreground mb-1">Subscriptions & Refunds</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage your community memberships and raise refund disputes.</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : memberships.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card border border-border text-center">
          <p className="text-sm text-muted-foreground">You don't have any subscriptions yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {memberships.map(m => {
            const tier = m.community_tiers;
            const community = m.communities;
            const hasOpenDispute = openDisputes.has(m.id);
            return (
              <div key={m.id} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                    {community?.cover_url && <img src={community.cover_url} alt={community.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{community?.name || 'Community'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {tier?.name} · {tier?.kind === 'free' ? 'Free' : `₹${tier?.price_inr}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge[m.status] || ''}`}>
                        {m.status}
                      </span>
                      {m.current_period_end && (
                        <span className="text-[11px] text-muted-foreground">
                          until {new Date(m.current_period_end).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => navigate(`/c/${community?.slug}`)}
                    className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold">
                    View community
                  </button>
                  <button
                    disabled={hasOpenDispute || tier?.kind === 'free'}
                    onClick={() => { setDisputeFor(m); setReason(''); }}
                    className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold disabled:opacity-50">
                    {hasOpenDispute ? 'Dispute pending' : tier?.kind === 'free' ? 'Free — no refund' : 'Dispute / refund'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {disputes.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-foreground mb-3">Your disputes</h2>
          <div className="space-y-2">
            {disputes.map(d => (
              <div key={d.id} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">{d.communities?.name || 'Community'}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge[d.status] || ''}`}>{d.status}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.reason}</p>
                {d.admin_notes && (
                  <div className="mt-2 p-2 rounded-lg bg-secondary text-xs text-foreground">
                    <p className="font-semibold mb-0.5">Admin response:</p>
                    {d.admin_notes}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(d.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!disputeFor} onOpenChange={(o) => !o && setDisputeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-secondary text-xs">
              <p className="font-semibold text-foreground">{disputeFor?.communities?.name}</p>
              <p className="text-muted-foreground">
                {disputeFor?.community_tiers?.name} · ₹{disputeFor?.community_tiers?.price_inr}
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">Tell us why you'd like a refund. Our team will review and respond.</p>
            </div>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain the issue with this subscription..."
              maxLength={2000}
              rows={5}
            />
            <p className="text-[11px] text-muted-foreground text-right">{reason.length}/2000</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeFor(null)}>Cancel</Button>
            <Button onClick={submitDispute} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsPage;
