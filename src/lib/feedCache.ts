// Lightweight in-memory cache shared across route mounts.
// Purpose: when a user opens a post and comes back to the feed,
// we should NOT show a loading spinner or re-fetch from scratch.
// Same for re-opening a post that was just viewed.

export interface CachedAuthor {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface CachedTrendingPost {
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

interface TrendingCache {
  posts: CachedTrendingPost[];
  authors: Record<string, CachedAuthor>;
  fetchedAt: number;
  scrollY: number;
}

let trending: TrendingCache | null = null;

export const getTrendingCache = (): TrendingCache | null => trending;

export const setTrendingCache = (
  posts: CachedTrendingPost[],
  authors: Record<string, CachedAuthor>,
) => {
  trending = {
    posts,
    authors,
    fetchedAt: Date.now(),
    scrollY: trending?.scrollY ?? 0,
  };
};

export const updateTrendingAuthors = (authors: Record<string, CachedAuthor>) => {
  if (!trending) return;
  trending = { ...trending, authors: { ...trending.authors, ...authors } };
};

export const setTrendingScrollY = (y: number) => {
  if (!trending) return;
  trending.scrollY = y;
};

// ----- Discover search/filter state (preserved across back-nav from a post) -----
interface DiscoverState {
  query: string;
  activeChip: string;
  activeCategory: string | null;
  locationFilter: string | null;
}
let discoverState: DiscoverState | null = null;
export const getDiscoverState = (): DiscoverState | null => discoverState;
export const setDiscoverState = (s: DiscoverState) => { discoverState = s; };
export const clearDiscoverState = () => { discoverState = null; };

export const TRENDING_STALE_MS = 60_000; // background-refresh after 60s

export const isTrendingStale = (): boolean => {
  if (!trending) return true;
  return Date.now() - trending.fetchedAt > TRENDING_STALE_MS;
};

// ----- Post detail cache -----

export interface CachedPostDetail {
  post: {
    id: string;
    user_id: string | null;
    title: string | null;
    body: string | null;
    location: string | null;
    hashtags: string[];
    category: string | null;
    review_subcategory: string | null;
    like_count: number;
    comment_count: number;
    created_at: string;
    music_url: string | null;
    music_title: string | null;
    is_anonymous?: boolean;
    is_hidden?: boolean;
  };
  media: { id: string; url: string; kind: 'image' | 'video'; sort_order: number }[];
  author?: CachedAuthor;
  fetchedAt: number;
}

const postDetails = new Map<string, CachedPostDetail>();

export const getPostDetailCache = (id: string): CachedPostDetail | undefined =>
  postDetails.get(id);

export const setPostDetailCache = (id: string, detail: Omit<CachedPostDetail, 'fetchedAt'>) => {
  postDetails.set(id, { ...detail, fetchedAt: Date.now() });
  // Cap cache to avoid memory growth on long sessions.
  if (postDetails.size > 80) {
    const oldestKey = postDetails.keys().next().value;
    if (oldestKey) postDetails.delete(oldestKey);
  }
};

export const POST_DETAIL_STALE_MS = 30_000;

export const isPostDetailStale = (id: string): boolean => {
  const c = postDetails.get(id);
  if (!c) return true;
  return Date.now() - c.fetchedAt > POST_DETAIL_STALE_MS;
};

export const invalidatePostDetail = (id: string) => {
  postDetails.delete(id);
};

export const invalidateTrending = () => {
  trending = null;
};
