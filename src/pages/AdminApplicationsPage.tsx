import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type AppStatus = 'pending' | 'approved' | 'rejected';

interface Application {
  id: string;
  user_id: string;
  store_name: string;
  category: string;
  description: string;
  gst_tax_id: string | null;
  social_media_links: any;
  sample_product_images: string[];
  status: AppStatus;
  created_at: string;
  rejection_reason: string | null;
  applicant_name?: string | null;
  applicant_phone?: string | null;
}

const statusConfig: Record<AppStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X },
};

const AdminApplicationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, userId } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    const { data: apps, error } = await supabase
      .from('seller_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading applications', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Hydrate applicant names/phones from profiles
    const userIds = Array.from(new Set((apps || []).map(a => a.user_id)));
    let profileMap: Record<string, { name: string | null; phone: string | null }> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = { name: p.name, phone: p.phone }; });
    }

    setApplications((apps || []).map(a => ({
      ...a,
      applicant_name: profileMap[a.user_id]?.name ?? null,
      applicant_phone: profileMap[a.user_id]?.phone ?? null,
    })) as Application[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadApplications();
  }, [isAdmin]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    const { error } = await supabase
      .from('seller_applications')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: userId })
      .eq('id', id);
    setActioningId(null);
    if (error) {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
      return;
    }
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    toast({ title: 'Application Approved ✅', description: 'The seller has been granted access.' });
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    setActioningId(id);
    const { error } = await supabase
      .from('seller_applications')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', id);
    setActioningId(null);
    if (error) {
      toast({ title: 'Reject failed', description: error.message, variant: 'destructive' });
      return;
    }
    setApplications(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'rejected', rejection_reason: rejectionReason.trim() } : a
    ));
    setRejectingId(null);
    setRejectionReason('');
    toast({ title: 'Application Rejected', description: 'The applicant will see the reason on their next visit.' });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Seller Applications</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} pending review</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No applications found.</p>
          )}
          {filtered.map(app => {
            const sc = statusConfig[app.status];
            const StatusIcon = sc.icon;
            const expanded = expandedId === app.id;
            const socialLinks: string[] = Array.isArray(app.social_media_links) ? app.social_media_links : [];

            return (
              <div key={app.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{app.store_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {app.applicant_name || app.applicant_phone || 'Unknown applicant'} · {app.category}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {sc.label}
                  </span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground">{app.description}</p>
                    </div>

                    {app.gst_tax_id && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">GST / Tax ID</p>
                        <p className="text-sm text-foreground font-mono">{app.gst_tax_id}</p>
                      </div>
                    )}

                    {socialLinks.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Social Media</p>
                        {socialLinks.map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline break-all">
                            {link} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}

                    {app.sample_product_images?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Sample Products</p>
                        <div className="flex gap-2 overflow-x-auto">
                          {app.sample_product_images.map((img, i) => (
                            <img key={i} src={img} alt="Sample" className="w-20 h-20 rounded-xl object-cover border border-border" />
                          ))}
                        </div>
                      </div>
                    )}

                    {app.rejection_reason && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                        <p className="text-xs font-semibold text-destructive mb-1">Rejection Reason</p>
                        <p className="text-sm text-foreground">{app.rejection_reason}</p>
                      </div>
                    )}

                    {app.status === 'pending' && (
                      <div className="pt-2 space-y-3">
                        {rejectingId === app.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              placeholder="Reason for rejection…"
                              rows={2}
                              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleReject(app.id)} disabled={actioningId === app.id} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-50">
                                {actioningId === app.id ? 'Rejecting…' : 'Confirm Reject'}
                              </button>
                              <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm font-medium">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(app.id)} disabled={actioningId === app.id} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50">
                              {actioningId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                            </button>
                            <button onClick={() => setRejectingId(app.id)} disabled={actioningId === app.id} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm border border-destructive/20 disabled:opacity-50">
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApplicationsPage;
