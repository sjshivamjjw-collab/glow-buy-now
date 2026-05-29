import { useEffect, useState, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Sparkles, Heart, MessageCircle, Loader2, Play, Images, MapPin, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import LazyVideoThumbnail from '@/components/LazyVideoThumbnail';
import { PenguinAvatar, RIPPLER_NAME } from '@/components/RipplerIdentity';
import { scoreInterestMatch } from '@/lib/interests';

interface TrendingPost {
  id: string;
  user_id: string | null;
  title: string | null;
  body: string | null;
  location: string | null;
  hashtags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  cover_url: string | null;
  cover_kind: 'image' | 'video' | null;
  media_count: number;
  category?: string | null;
  is_anonymous?: boolean;
}

const CATEGORY_META: Record<string, { label: string }> = {
  everyday_vibes: { label: 'Daily Life' },
  showcase: { label: 'Show & Tell' },
  trip: { label: 'Travel Diaries' },
  review: { label: 'Review' },
  real_talk: { label: 'Advice and Tips' },
  hidden_gems: { label: 'Work Diaries' },
};

const CATEGORY_FILTERS = [
  { key: 'everyday_vibes', label: 'Daily Life' },
  { key: 'trip', label: 'Travel Diaries' },
  { key: 'review', label: 'Review' },
  { key: 'real_talk', label: 'Advice and Tips' },
  { key: 'hidden_gems', label: 'Work Diaries' },
];


interface AuthorInfo {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// Deterministic staggered heights for richer masonry feel when images
// don't expose their natural ratio yet.
const LEFT_HEIGHTS = [240, 260, 230, 250, 245, 255];
const RIGHT_HEIGHTS = [200, 220, 190, 215, 205, 210];

const DiscoverPage = () => {
  const navigate = useNavigate();
  const { userName, userAvatar, userId } = useAuth() as any;
  const firstName = (userName || '').trim().split(' ')[0] || 'there';
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string>('For you');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Only show nudge when truly at top; otherwise keep it collapsed.
      setCollapsed(y > 20);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  const NUDGE_PROMPTS: { category: string; label: string }[] = [
    { category: 'trip', label: 'Best weekend getaway near you?' },
    { category: 'review', label: 'A restaurant worth the hype?' },
    { category: 'hidden_gems', label: 'Career advice you wish you knew?' },
  ];

  useEffect(() => {
    if (!userId) { setInterests([]); return; }
    supabase.from('profiles').select('interests' as any).eq('id', userId).maybeSingle().then(({ data }) => {
      setInterests(((data as any)?.interests as string[] | null) || []);
    });
  }, [userId]);

  useEffect(() => {
    const onClick = (e: Event) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, []);


  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_trending_posts' as any, { _limit: 30, _offset: 0 });
      const list = (data as TrendingPost[] | null) ?? [];
      list.forEach(p => {
        // Trust the safe feed RPC to mask anonymous authors; enforce it defensively in UI too.
        if (p.is_anonymous) p.user_id = null;
      });
      setPosts(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map(p => p.user_id).filter((u): u is string => !!u)));
        if (ids.length) {
          const { data: profs } = await supabase.rpc('get_public_profiles' as any, { _ids: ids });
          const map: Record<string, AuthorInfo> = {};
          ((profs as any[]) || []).forEach(p => { map[p.id] = p; });
          setAuthors(map);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const baseChips = useMemo(() => ['For you', 'Trending'], []);
  const labelToKey = useMemo(() => Object.fromEntries(CATEGORY_FILTERS.map(c => [c.label, c.key])), []);

  const fuse = useMemo(() => new Fuse(posts, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'hashtags', weight: 0.25 },
      { name: 'location', weight: 0.2 },
      { name: 'body', weight: 0.15 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  }), [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (activeChip === 'Trending') {
      list = [...list].sort((a, b) => (b.like_count + b.comment_count) - (a.like_count + a.comment_count));
    } else if (activeChip === 'Category' && activeCategory) {
      list = list.filter(p => p.category === activeCategory);
    } else if (activeChip === 'For you' && interests.length > 0) {
      // Curate: score posts by interest-keyword matches in title/body/hashtags/location/category.
      list = [...list]
        .map(p => ({ p, s: scoreInterestMatch(interests, p) }))
        .sort((a, b) => b.s - a.s)
        .map(x => x.p);
    }
    const q = query.trim().replace(/^#/, '');
    if (!q) return list;
    // Fuzzy search across the (chip/category-prefiltered) list
    const scoped = list === posts ? fuse : new Fuse(list, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'hashtags', weight: 0.25 },
        { name: 'location', weight: 0.2 },
        { name: 'body', weight: 0.15 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    return scoped.search(q).map(r => r.item);
  }, [posts, query, activeChip, activeCategory, fuse, interests]);


  return (
    <div className="min-h-screen max-w-lg mx-auto pb-24 font-[Figtree] bg-[linear-gradient(180deg,#0a0a0a_0%,#111111_40%,#000000_100%)]">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a0a]/70 border-b border-[#2a2a2a]/40 px-4 pt-3 pb-3">
        <div className="overflow-hidden mb-2">

          <div className="flex items-center gap-2.5">
            {userAvatar ? (
              <img src={userAvatar} alt={firstName} className="w-9 h-9 rounded-full object-cover ring-1 ring-[#2a2a2a]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#ef4444] flex items-center justify-center text-[#fafafa] text-sm font-bold">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-[#dc2626]/80">
                Welcome Back,
              </p>
              <h1 className="font-[Outfit] text-base font-bold tracking-tight text-[#fafafa]">
                {firstName}
              </h1>
            </div>
          </div>
        </div>


        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#dc2626]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search reviews, places, ideas, recommendations..."
            className="w-full pl-11 pr-4 py-3 rounded-full bg-[#1a1a1a]/80 border border-[#2a2a2a]/60 text-[#fafafa] placeholder:text-[#dc2626]/60 focus:outline-none focus:ring-2 focus:ring-[#ef4444]/40 text-sm font-medium"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 items-center">
          {baseChips.map(chip => {
            const active = chip === activeChip;
            return (
              <button
                key={chip}
                onClick={() => { setActiveChip(chip); setCategoryOpen(false); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#fafafa] text-[#1a1a1a] shadow-sm'
                    : 'bg-[#1a1a1a]/70 text-[#a0a0a0] border border-[#2a2a2a]/60 hover:border-[#ef4444]'
                }`}
              >
                {chip === 'Trending' ? (
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{chip}</span>
                ) : chip}
              </button>
            );
          })}

          {/* Category dropdown tab */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => { setActiveChip('Category'); setCategoryOpen(o => !o); }}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeChip === 'Category'
                  ? 'bg-[#fafafa] text-[#1a1a1a] shadow-sm'
                  : 'bg-[#1a1a1a]/70 text-[#a0a0a0] border border-[#2a2a2a]/60 hover:border-[#ef4444]'
              }`}
            >
              {activeChip === 'Category' && activeCategory
                ? CATEGORY_META[activeCategory]?.label || 'Category'
                : 'Category'}
              <ChevronDown className={`w-3 h-3 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {categoryOpen && (
              <div className="absolute left-0 mt-2 w-44 rounded-xl bg-[#161616] border border-[#2a2a2a]/60 shadow-xl shadow-black/40 overflow-hidden z-30">
                {CATEGORY_FILTERS.map(c => {
                  const selected = activeCategory === c.key && activeChip === 'Category';
                  return (
                    <button
                      key={c.key}
                      onClick={() => { setActiveCategory(c.key); setActiveChip('Category'); setCategoryOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors ${
                        selected ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'text-[#fafafa] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {c.label}
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Curiosity nudge rows */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-32 opacity-100 mt-3'
          }`}
        >
          <div className="relative rounded-2xl p-3 border border-[#ef4444]/20 bg-[linear-gradient(135deg,#1a0d12_0%,#16161c_55%,#1a0d12_100%)] shadow-[0_4px_20px_-8px_rgba(239,68,68,0.25)] overflow-hidden">
            {/* subtle glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#ef4444]/10 blur-2xl" />
            <div className="relative flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-[#ef4444]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#dc2626]">
                Popular conversations near you
              </p>

            </div>
            <div className="relative flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {NUDGE_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => navigate(`/post/new?category=${p.category}`)}
                  className="group/chip shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#fafafa]/[0.04] backdrop-blur-sm border border-[#fafafa]/10 text-[#fafafa] text-[13px] font-medium whitespace-nowrap hover:bg-[#ef4444]/15 hover:border-[#ef4444]/50 hover:text-white transition-all"
                >
                  <span className="text-[#ef4444]">+</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#dc2626]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#ef4444]/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-[#dc2626]" />
            </div>
            <p className="font-[Outfit] text-[#fafafa] font-bold text-lg mb-1">Nothing here yet</p>
            <p className="text-[#a0a0a0] text-sm mb-5">Be the first to share something beautiful.</p>
            <button onClick={() => navigate('/post/new')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-br from-[#ef4444] to-[#dc2626] text-white text-sm font-semibold shadow-md shadow-[#dc2626]/30">
              Create a post
            </button>
          </div>
        ) : (() => {
          const renderCard = (p: TrendingPost, h: number) => {
            const author = p.user_id ? authors[p.user_id] : undefined;
            const isAnon = !!p.is_anonymous;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/p/${p.id}`)}
                className="group mb-1.5 w-full text-left rounded-3xl overflow-hidden bg-[#161616] border border-[#2a2a2a]/50 hover:border-[#ef4444] hover:shadow-lg hover:shadow-[#dc2626]/10 transition-all duration-300"
              >
                {/* Media */}
                <div className="relative w-full bg-[#1a1a1a] overflow-hidden" style={{ height: `${h}px` }}>
                  {p.cover_url ? (
                    p.cover_kind === 'video' ? (
                      <>
                        <LazyVideoThumbnail src={p.cover_url} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                        <span className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </span>
                      </>
                    ) : (
                      <img src={p.cover_url} alt={p.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a]/60 to-[#ef4444]/40 flex items-center justify-center p-4">
                      <span className="font-[Outfit] text-[#fafafa] text-sm font-semibold line-clamp-5 text-center">
                        {p.title || p.body || 'Post'}
                      </span>
                    </div>
                  )}
                  {p.category && CATEGORY_META[p.category] && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-[2px] rounded-md bg-black/55 backdrop-blur-sm text-white/90 text-[9px] font-medium tracking-wide">
                      {CATEGORY_META[p.category].label}
                    </span>
                  )}
                  {p.media_count > 1 && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1">
                      <Images className="w-3 h-3" /> {p.media_count}
                    </span>
                  )}


                </div>

                {/* Footer */}
                <div className="px-3 pt-3 pb-3">
                  {p.title && (
                    <p className="font-[Outfit] font-semibold text-[#fafafa] text-[15px] leading-[1.3] line-clamp-3 mb-2.5">
                      {p.title}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isAnon ? (
                        <PenguinAvatar size={22} />
                      ) : author?.avatar_url ? (
                        <img src={author.avatar_url} className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-[#2a2a2a]" alt="" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#ef4444] shrink-0" />
                      )}
                      <span className="truncate text-[12px] font-semibold text-[#cfcfcf]">
                        {isAnon ? (
                          <>
                            {RIPPLER_NAME}
                            <span className="ml-1 text-[10px] font-medium text-[#a0a0a0]">(anonymous)</span>
                          </>
                        ) : (
                          author?.username ? `@${author.username}` : author?.name || 'User'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-0.5 text-[12px] text-[#ef4444] font-semibold">
                        <Heart className="w-3.5 h-3.5 fill-[#ef4444] text-[#ef4444]" />{formatCount(p.like_count)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[12px] text-[#ef4444] font-semibold">
                        <MessageCircle className="w-3.5 h-3.5" />{formatCount(p.comment_count)}
                      </span>
                    </div>
                  </div>
                </div>


              </button>
            );
          };

          const leftItems = filtered.filter((_, i) => i % 2 === 0);
          const rightItems = filtered.filter((_, i) => i % 2 === 1);

          return (
            <div className="grid grid-cols-2 gap-1.5">
              <div>{leftItems.map((p, i) => renderCard(p, LEFT_HEIGHTS[i % LEFT_HEIGHTS.length]))}</div>
              <div>{rightItems.map((p, i) => renderCard(p, RIGHT_HEIGHTS[i % RIGHT_HEIGHTS.length]))}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DiscoverPage;
