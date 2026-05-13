import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Sparkles, Users, Loader2, Globe } from 'lucide-react';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.9.9 1.4.2.4.4 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.9.7-1.4.9-.4.2-1 .4-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.9-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.9-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1C2.6 8.5 2.6 8.9 2.6 12s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.3-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z"/>
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.4-1.9.5-3.8.5-5.8s-.1-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/>
  </svg>
);

interface CommunityCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  member_count: number;
  creator_id: string;
  social_links: { instagram?: string; youtube?: string; website?: string; x?: string } | null;
}

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<CommunityCard[]>([]);
  const [creators, setCreators] = useState<Record<string, { name: string | null; username: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('communities' as any)
        .select('id, slug, name, description, cover_url, member_count, creator_id, social_links')
        .eq('is_published', true)
        .eq('approval_status', 'approved')
        .order('member_count', { ascending: false })
        .limit(50);
      const list = (data as any[] | null) ?? [];
      setCommunities(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map(c => c.creator_id)));
        const { data: profs } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p; });
        setCreators(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = communities.filter(c => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Discover</h1>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search communities…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold mb-1">No communities yet</p>
          <p className="text-muted-foreground text-sm">Be the first to launch one.</p>
          <button onClick={() => navigate('/profile')}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Become a creator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(c => {
            const creator = creators[c.creator_id];
            const social = c.social_links || {};
            const hasSocial = social.instagram || social.youtube || social.website;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/c/${c.slug}/room`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/c/${c.slug}/room`); }}
                className="w-full text-left rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                {c.cover_url ? (
                  <div className="aspect-[16/10] bg-secondary overflow-hidden">
                    <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover object-top" />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center">
                    <span className="text-3xl font-extrabold text-primary/40">{c.name[0]}</span>
                  </div>
                )}
                <div className="p-2.5">
                  <h3 className="font-bold text-foreground text-sm mb-1 line-clamp-2 leading-snug">{c.name}</h3>
                  {c.description && <p className="text-[11px] text-muted-foreground line-clamp-3 mb-2 leading-snug">{c.description}</p>}
                  {hasSocial && (
                    <div className="flex items-center gap-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
                      {social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground" aria-label="Instagram">
                          <Camera className="w-3 h-3" />
                        </a>
                      )}
                      {social.youtube && (
                        <a href={social.youtube} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground" aria-label="YouTube">
                          <Play className="w-3 h-3" />
                        </a>
                      )}
                      {social.website && (
                        <a href={social.website} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground" aria-label="Website">
                          <Globe className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      {creator?.avatar_url ? (
                        <img src={creator.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-secondary shrink-0" />
                      )}
                      <span className="truncate">{creator?.name || creator?.username || 'Creator'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Users className="w-3 h-3" />
                      <span>{c.member_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
