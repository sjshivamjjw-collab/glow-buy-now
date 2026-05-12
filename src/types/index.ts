export type UserRole = 'creator' | 'shopper' | 'admin';

export interface Community {
  id: string;
  creator_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  intro_video_url: string | null;
  key_outcomes: string[];
  social_links: SocialLinks;
  is_published: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  youtube?: string;
  instagram?: string;
  x?: string;
  website?: string;
}

export type TierKind = 'free' | 'paid_monthly' | 'paid_one_time';

export interface CommunityTier {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  kind: TierKind;
  price_inr: number | null;
  razorpay_plan_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export type MembershipStatus = 'active' | 'pending' | 'expired' | 'cancelled';
export type MembershipSource = 'free' | 'razorpay_sub' | 'razorpay_order';

export interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  tier_id: string;
  status: MembershipStatus;
  source: MembershipSource;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  started_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
