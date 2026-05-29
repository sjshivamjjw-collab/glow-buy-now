export interface InterestOption {
  key: string;
  label: string;
  emoji: string;
  keywords: string[];
  categories?: string[];
}

export const INTEREST_OPTIONS: InterestOption[] = [
  {
    key: 'travel_trips',
    label: 'Travel & Trips',
    emoji: '✈️',
    keywords: ['travel', 'trip', 'trips', 'vacation', 'holiday', 'tour', 'journey', 'getaway', 'flight', 'hotel', 'stay', 'destination', 'wanderlust', 'roadtrip', 'backpacking'],
    categories: ['trip'],
  },
  {
    key: 'food_places',
    label: 'Food & Places',
    emoji: '🍜',
    keywords: ['food', 'foodie', 'restaurant', 'cafe', 'café', 'bar', 'dining', 'eat', 'meal', 'brunch', 'dinner', 'lunch', 'breakfast', 'cuisine', 'street food', 'bakery', 'dessert', 'drinks'],
  },
  {
    key: 'beauty_skincare',
    label: 'Beauty & Skincare',
    emoji: '💄',
    keywords: ['beauty', 'skincare', 'skin', 'makeup', 'cosmetics', 'haircare', 'hair', 'salon', 'spa', 'serum', 'moisturizer', 'sunscreen', 'glow', 'routine'],
  },
  {
    key: 'work_career',
    label: 'Work & Career',
    emoji: '💼',
    keywords: ['work', 'career', 'job', 'office', 'workplace', 'corporate', 'startup', 'hiring', 'interview', 'salary', 'promotion', 'manager', 'colleague', 'wfh', 'remote'],
    categories: ['hidden_gems'],
  },
];

export function scoreInterestMatch(
  selectedKeys: string[],
  post: {
    title?: string | null;
    body?: string | null;
    hashtags?: string[] | null;
    location?: string | null;
    category?: string | null;
  }
): number {
  if (!selectedKeys.length) return 0;
  const haystack = [
    post.title || '',
    post.body || '',
    post.location || '',
    (post.hashtags || []).join(' '),
  ].join(' ').toLowerCase();
  let score = 0;
  for (const key of selectedKeys) {
    const opt = INTEREST_OPTIONS.find(o => o.key === key);
    if (!opt) continue;
    if (post.category && opt.categories?.includes(post.category)) score += 2;
    for (const kw of opt.keywords) {
      if (haystack.includes(kw)) { score += 1; break; }
    }
  }
  return score;
}
