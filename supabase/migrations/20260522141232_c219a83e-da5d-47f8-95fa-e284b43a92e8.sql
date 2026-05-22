
-- 1. DROP COMMUNITIES STACK
DROP TABLE IF EXISTS public.community_chat_poll_votes CASCADE;
DROP TABLE IF EXISTS public.community_chat_messages CASCADE;
DROP TABLE IF EXISTS public.community_channels CASCADE;
DROP TABLE IF EXISTS public.community_event_rsvps CASCADE;
DROP TABLE IF EXISTS public.community_events CASCADE;
DROP TABLE IF EXISTS public.community_resources CASCADE;
DROP TABLE IF EXISTS public.community_admins CASCADE;
DROP TABLE IF EXISTS public.community_reviews CASCADE;
DROP TABLE IF EXISTS public.community_dm_messages CASCADE;
DROP TABLE IF EXISTS public.community_dm_threads CASCADE;
DROP TABLE IF EXISTS public.membership_disputes CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.payment_intents CASCADE;
DROP TABLE IF EXISTS public.community_tiers CASCADE;
DROP TABLE IF EXISTS public.communities CASCADE;

DROP FUNCTION IF EXISTS public.is_active_community_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_community_tier_level(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_community_tier(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.can_post_in_channel(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_community_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_dm_thread(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.maintain_community_member_count() CASCADE;
DROP FUNCTION IF EXISTS public.validate_community_chat_message() CASCADE;
DROP FUNCTION IF EXISTS public.validate_dm_message() CASCADE;
DROP FUNCTION IF EXISTS public.bump_dm_thread() CASCADE;
DROP FUNCTION IF EXISTS public.notify_dm_recipient() CASCADE;
DROP FUNCTION IF EXISTS public.notify_members_new_event() CASCADE;
DROP FUNCTION IF EXISTS public.notify_members_new_resource() CASCADE;
DROP FUNCTION IF EXISTS public.notify_community_review() CASCADE;
DROP FUNCTION IF EXISTS public.notify_creator_new_review() CASCADE;
DROP FUNCTION IF EXISTS public.notify_membership_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_dispute_resolved() CASCADE;
DROP FUNCTION IF EXISTS public.guard_membership_self_update() CASCADE;

DROP TYPE IF EXISTS public.community_approval_status CASCADE;
DROP TYPE IF EXISTS public.membership_status CASCADE;
DROP TYPE IF EXISTS public.membership_source CASCADE;
DROP TYPE IF EXISTS public.tier_kind CASCADE;
DROP TYPE IF EXISTS public.event_rsvp_status CASCADE;
DROP TYPE IF EXISTS public.dispute_status CASCADE;
DROP TYPE IF EXISTS public.resource_kind CASCADE;

-- 2. POSTS
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  body text,
  location text,
  hashtags text[] NOT NULL DEFAULT '{}',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX posts_user_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX posts_hashtags_idx ON public.posts USING GIN (hashtags);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any post" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- post_media
CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_media_post_idx ON public.post_media (post_id, sort_order);
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read media" ON public.post_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages own media" ON public.post_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_media.post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_media.post_id AND p.user_id = auth.uid()));

-- post_likes
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX post_likes_user_idx ON public.post_likes (user_id);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like as themselves" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.maintain_post_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER post_likes_count_trg AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.maintain_post_like_count();

-- post_comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment as themselves" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(trim(body)) > 0);
CREATE POLICY "Users can delete own comment" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Post owner deletes comments" ON public.post_comments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.maintain_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER post_comments_count_trg AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.maintain_post_comment_count();

-- user_follows
CREATE TABLE public.user_follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX user_follows_following_idx ON public.user_follows (following_id);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read follows" ON public.user_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users follow as themselves" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow own" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_liker text;
BEGIN
  SELECT user_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(name, username, 'Someone') INTO v_liker FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'like', v_liker || ' liked your post', '', '/p/' || NEW.post_id::text);
  RETURN NEW;
END $$;
CREATE TRIGGER post_likes_notify_trg AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_commenter text;
BEGIN
  SELECT user_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(name, username, 'Someone') INTO v_commenter FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_owner, 'comment', v_commenter || ' commented on your post', LEFT(NEW.body, 140), '/p/' || NEW.post_id::text);
  RETURN NEW;
END $$;
CREATE TRIGGER post_comments_notify_trg AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

CREATE OR REPLACE FUNCTION public.notify_user_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_follower text;
BEGIN
  SELECT COALESCE(name, username, 'Someone') INTO v_follower FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (NEW.following_id, 'follow', v_follower || ' started following you', '', '/u/' || NEW.follower_id::text);
  RETURN NEW;
END $$;
CREATE TRIGGER user_follows_notify_trg AFTER INSERT ON public.user_follows FOR EACH ROW EXECUTE FUNCTION public.notify_user_follow();

-- Public profile lookup for any user
CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, name text, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.username, p.avatar_url FROM public.profiles p WHERE p.id = ANY(_ids)
$$;

-- Trending posts function
CREATE OR REPLACE FUNCTION public.get_trending_posts(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, user_id uuid, title text, body text, location text, hashtags text[],
  like_count integer, comment_count integer, created_at timestamptz,
  cover_url text, cover_kind text, media_count integer, score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.user_id, p.title, p.body, p.location, p.hashtags,
    p.like_count, p.comment_count, p.created_at,
    (SELECT url FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_url,
    (SELECT kind FROM public.post_media m WHERE m.post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS cover_kind,
    (SELECT count(*)::int FROM public.post_media m WHERE m.post_id = p.id) AS media_count,
    ((p.like_count + 1)::numeric / power(EXTRACT(EPOCH FROM (now() - p.created_at))/3600 + 2, 1.5)) AS score
  FROM public.posts p
  ORDER BY score DESC, p.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read post-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "Users upload own post-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own post-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
