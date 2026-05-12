import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCommunityMembership } from '@/hooks/useCommunityMembership';
import { ArrowLeft, MessageSquare, Calendar, FileBox, Loader2 } from 'lucide-react';
import { ChatPanel } from '@/components/community/ChatPanel';
import { EventsPanel } from '@/components/community/EventsPanel';
import { ResourcesPanel } from '@/components/community/ResourcesPanel';

type Tab = 'chat' | 'events' | 'resources';

const CommunityRoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [community, setCommunity] = useState<{ id: string; name: string } | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const { isMember, isCreator, loading: loadingMembership } = useCommunityMembership(community?.id);
  const initialTab = (searchParams.get('tab') as Tab) || 'chat';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoadingCommunity(true);
      const { data } = await supabase.from('communities' as any)
        .select('id, name').eq('slug', slug).maybeSingle();
      setCommunity(data as any);
      setLoadingCommunity(false);
    })();
  }, [slug]);

  useEffect(() => { setSearchParams({ tab }, { replace: true }); }, [tab]);

  const loading = loadingCommunity || loadingMembership;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-10 text-center">
        <p className="text-muted-foreground">Community not found.</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Members only</h1>
        <p className="text-sm text-muted-foreground">Join this community to access chat, events, and resources.</p>
        <button onClick={() => navigate(`/c/${slug}`)}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          View community
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'resources', label: 'Resources', icon: FileBox },
  ];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(`/c/${slug}`)} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{community.name}</h1>
          <p className="text-xs text-muted-foreground">{isCreator ? 'You host this' : 'Member'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 bg-card border border-border rounded-2xl mb-5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatPanel communityId={community.id} isCreator={isCreator} />}
      {tab === 'events' && <EventsPanel communityId={community.id} isCreator={isCreator} />}
      {tab === 'resources' && <ResourcesPanel communityId={community.id} isCreator={isCreator} />}
    </div>
  );
};

export default CommunityRoomPage;
