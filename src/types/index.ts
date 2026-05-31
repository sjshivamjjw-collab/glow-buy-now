export type UserRole = 'creator' | 'admin';

export interface Post {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  location: string | null;
  hashtags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  url: string;
  kind: 'image' | 'video';
  sort_order: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
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
