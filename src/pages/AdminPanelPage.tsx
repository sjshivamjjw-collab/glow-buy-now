import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Radio, Check, X, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, Search, Loader2, ShieldOff,
  FileText, Trash2, Heart, MessageCircle, EyeOff, Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useToast } from '@/hooks/use-toast';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  live: 'bg-red-500/10 text-red-500 border-red-500/20',
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAuth();

  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [livestreams, setLivestreams] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, any>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [sellerIds, setSellerIds] = useState<Set<string>>(new Set());
  const [revokingUser, setRevokingUser] = useState<any>(null);
  const [revoking, setRevoking] = useState(false);
  const [loading, setLoading] = useState(true);

  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [appFilter, setAppFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const [appsRes, profilesRes, streamsRes, sellersRes, postsRes] = await Promise.all([
        supabase.from('seller_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, phone, created_at'),
        supabase.from('livestreams').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id').eq('role', 'creator'),
        supabase.from('posts' as any).select('*, post_media(url, kind, sort_order)').order('created_at', { ascending: false }),
      ]);

      if (appsRes.data) setApplications(appsRes.data);
      if (profilesRes.data) setUsers(profilesRes.data);
      if (sellersRes.data) setSellerIds(new Set(sellersRes.data.map((r: any) => r.user_id)));
      if (streamsRes.data) {
        const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        setLivestreams(streamsRes.data.map((s: any) => ({ ...s, profiles: profilesById.get(s.seller_id) })));
      }
      if (postsRes.data) {
        setPosts(postsRes.data as any[]);
        const map: Record<string, any> = {};
        (profilesRes.data || []).forEach((p: any) => { map[p.id] = p; });
        setPostAuthors(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const liveNow = livestreams.filter(s => s.status === 'live').length;

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('seller_applications').update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
      toast({ title: 'Application Approved ✅', description: 'Creator access granted.' });
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('seller_applications').update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejection_reason: rejectionReason } : a));
      setRejectingId(null);
      setRejectionReason('');
      toast({ title: 'Application Rejected' });
    }
  };

  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);

  const handleRevokeSeller = async () => {
    if (!revokingUser) return;
    setRevoking(true);
    const { error } = await supabase.rpc('admin_revoke_seller' as any, { _user_id: revokingUser.id });
    setRevoking(false);
    if (error) {
      toast({ title: 'Failed to revoke', description: error.message, variant: 'destructive' });
      return;
    }
    setSellerIds(prev => {
      const next = new Set(prev);
      next.delete(revokingUser.id);
      return next;
    });
    setApplications(prev => prev.map(a =>
      a.user_id === revokingUser.id && a.status === 'approved'
        ? { ...a, status: 'rejected', rejection_reason: a.rejection_reason || 'Creator access revoked by admin' }
        : a
    ));
    toast({ title: 'Creator access revoked', description: `${revokingUser.name || revokingUser.phone} is no longer a creator.` });
    setRevokingUser(null);
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPostId(postId);
    const { error } = await supabase.from('posts' as any).delete().eq('id', postId);
    setDeletingPostId(null);
    if (error) {
      toast({ title: 'Failed to delete post', description: error.message, variant: 'destructive' });
      return;
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast({ title: 'Post deleted' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Platform management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500' },
          { label: 'Total Posts', value: posts.length, icon: FileText, color: 'text-purple-500' },
          { label: 'Live Now', value: liveNow, icon: Radio, color: 'text-red-500' },
          { label: 'Pending Apps', value: pendingApps, icon: AlertCircle, color: 'text-yellow-500' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {pendingApps > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-5">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-foreground font-medium">{pendingApps} creator application{pendingApps > 1 ? 's' : ''} pending review</p>
        </div>
      )}

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
          <TabsTrigger value="applications" className="text-xs">Apps</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="streams" className="text-xs">Streams</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="space-y-3">
            {posts.length === 0 && <p className="text-center text-muted-foreground py-8">No posts yet.</p>}
            {posts.map(p => {
              const cover = (p.post_media || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
              const author = postAuthors[p.user_id];
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <button onClick={() => navigate(`/p/${p.id}`)} className="shrink-0">
                    {cover ? (
                      cover.kind === 'video' ? (
                        <LazyVideoThumbnail src={cover.url} className="w-14 h-14 rounded-xl overflow-hidden bg-black" />
                      ) : (
                        <img src={cover.url} alt="" className="w-14 h-14 rounded-xl object-cover" loading="lazy" decoding="async" />
                      )
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  <button onClick={() => navigate(`/p/${p.id}`)} className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {p.title || p.body || 'Untitled post'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {author?.name || author?.phone || 'Unknown user'} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comment_count}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this post permanently?')) handleDeletePost(p.id);
                    }}
                    disabled={deletingPostId === p.id}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-semibold disabled:opacity-50"
                  >
                    {deletingPostId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => setAppFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  appFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border'
                }`}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && ` (${pendingApps})`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredApps.length === 0 && <p className="text-center text-muted-foreground py-8">No applications found.</p>}
            {filteredApps.map(app => {
              const expanded = expandedAppId === app.id;
              return (
                <div key={app.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  <button onClick={() => setExpandedAppId(expanded ? null : app.id)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm">{app.store_name}</h3>
                      <p className="text-xs text-muted-foreground">{app.category}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge[app.status]}`}>
                      {app.status.toUpperCase()}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                      <p className="text-sm text-foreground">{app.description}</p>
                      {app.social_media_links && Array.isArray(app.social_media_links) && app.social_media_links.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Social</p>
                          {(app.social_media_links as string[]).map((l: string, i: number) => (
                            <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                              {l} <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                      {app.rejection_reason && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-semibold text-destructive mb-0.5">Rejection Reason</p>
                          <p className="text-sm text-foreground">{app.rejection_reason}</p>
                        </div>
                      )}
                      {app.status === 'pending' && (
                        <div className="pt-2 space-y-3">
                          {rejectingId === app.id ? (
                            <div className="space-y-2">
                              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection…" rows={2}
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
                              <div className="flex gap-2">
                                <button onClick={() => handleReject(app.id)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm">Confirm Reject</button>
                                <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(app.id)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm">
                                <Check className="w-4 h-4" /> Approve
                              </button>
                              <button onClick={() => setRejectingId(app.id)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm border border-destructive/20">
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
        </TabsContent>

        <TabsContent value="users">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-3">
            {users
              .filter(u => (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.phone || '').includes(searchQuery))
              .map(user => {
                const isSeller = sellerIds.has(user.id);
                return (
                <div key={user.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(user.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground text-sm truncate">{user.name || 'No name'}</p>
                      {isSeller && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">CREATOR</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.phone || 'No phone'}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  {isSeller && (
                    <button
                      onClick={() => setRevokingUser(user)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-semibold"
                    >
                      <ShieldOff className="w-3 h-3" /> Revoke
                    </button>
                  )}
                </div>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="streams">
          <div className="space-y-3">
            {livestreams.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No streams yet</p>
            )}
            {livestreams.map(stream => (
              <div key={stream.id} onClick={() => stream.status === 'live' && navigate(`/stream/${stream.id}`)}
                className={`flex items-center gap-3 p-4 rounded-2xl bg-card border border-border ${stream.status === 'live' ? 'cursor-pointer active:bg-secondary' : ''}`}>
                {stream.thumbnail_url ? (
                  <img src={stream.thumbnail_url} alt={stream.title} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                    <Radio className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{stream.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{stream.profiles?.name || 'Unknown creator'}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(stream.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge[stream.status] || statusBadge.scheduled}`}>
                  {String(stream.status).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {revokingUser && (
        <div className="fixed inset-0 bg-foreground/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setRevokingUser(null)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-foreground font-bold text-lg mb-2">Revoke creator access?</h3>
            <p className="text-muted-foreground text-sm mb-5">
              <span className="font-semibold text-foreground">{revokingUser.name || revokingUser.phone}</span> will no longer be able to go live.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRevokingUser(null)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold">Cancel</button>
              <button onClick={handleRevokeSeller} disabled={revoking} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-50">
                {revoking ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelPage;
