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
  restaurant: 'Been here? Agree, disagree, or got a question?',
  hotel: 'Stayed here? Got questions before booking?',
  trip: 'Done this trip? Planning it? Ask away.',
  product: 'Tried this? Thinking of buying? Weigh in.',
  media: 'Watched or read this? Agree with the take?',
  activity: 'Done this? Have more questions?',
};

const CATEGORY_PROMPTS: Record<string, string> = {
  everyday_vibes: 'Thoughts?',
  showcase: 'Curious about anything here? Ask.',
  real_talk: 'Been through this? Got a different take?',
  hidden_gems: 'Tried this? Know something even better?',
  review: 'Share your honest take…',
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
