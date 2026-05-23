// Category-aware comment input placeholders.
// Used in PostDetailPage's comment bar.

export type PostCategory =
  | 'everyday_vibes'
  | 'showcase'
  | 'review'
  | 'real_talk'
  | 'hidden_gems'
  | string;

export type ReviewSubcategory =
  | 'restaurant'
  | 'hotel'
  | 'trip'
  | 'product'
  | 'media'
  | 'activity'
  | string;

const REVIEW_SUB_PROMPTS: Record<string, string> = {
  restaurant: 'Been here? Share your must-try dish or skip…',
  hotel: 'Stayed here? How was the room, vibe or service…',
  trip: 'Visited this place? Drop tips, hidden spots, or warnings…',
  product: 'Used this product? Share what worked or didn’t…',
  media: 'Watched/read it? Share your honest take, no spoilers…',
  activity: 'Tried this? Was it worth the time and money…',
};

const CATEGORY_PROMPTS: Record<string, string> = {
  everyday_vibes: 'React to this moment… use @ to tag friends',
  showcase: 'Hype it up or ask how they made it… use @ to tag',
  real_talk: 'Share your advice or own experience… use @ to tag',
  hidden_gems: 'Been there? Add tips or your own gems… use @ to tag',
  review: 'Share your honest take… use @ to tag people',
};

export const getCommentPrompt = (
  category?: PostCategory | null,
  reviewSub?: ReviewSubcategory | null,
  isReply = false,
): string => {
  if (isReply) return 'Write a reply…';
  if (category === 'review' && reviewSub && REVIEW_SUB_PROMPTS[reviewSub]) {
    return REVIEW_SUB_PROMPTS[reviewSub] + ' (use @ to tag)';
  }
  if (category && CATEGORY_PROMPTS[category]) return CATEGORY_PROMPTS[category];
  return 'Add a comment… use @ to tag people';
};
