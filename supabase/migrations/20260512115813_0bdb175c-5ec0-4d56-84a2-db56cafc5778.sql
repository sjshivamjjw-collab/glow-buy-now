
-- 1. Add post_permission to channels
ALTER TABLE public.community_channels
  ADD COLUMN IF NOT EXISTS post_permission text NOT NULL DEFAULT 'all_members'
  CHECK (post_permission IN ('all_members','moderators','creator_only'));

-- 2. Moderators table
CREATE TABLE IF NOT EXISTS public.community_moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

ALTER TABLE public.community_moderators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read moderators"
  ON public.community_moderators FOR SELECT TO authenticated
  USING (public.is_active_community_member(auth.uid(), community_id));

CREATE POLICY "Creators manage moderators"
  ON public.community_moderators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c
                 WHERE c.id = community_moderators.community_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.communities c
                      WHERE c.id = community_moderators.community_id AND c.creator_id = auth.uid()));

-- 3. Helper to check if a user is a moderator (or creator)
CREATE OR REPLACE FUNCTION public.is_community_moderator(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.community_moderators
    WHERE community_id = _community_id AND user_id = _user_id
  );
$$;

-- 4. Helper to check posting permission for a channel
CREATE OR REPLACE FUNCTION public.can_post_in_channel(_user_id uuid, _community_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Creator can always post
    EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id)
    OR (
      -- Otherwise check the channel's post_permission
      SELECT CASE COALESCE(ch.post_permission, 'all_members')
        WHEN 'all_members' THEN true
        WHEN 'moderators'  THEN public.is_community_moderator(_user_id, _community_id)
        WHEN 'creator_only' THEN false
        ELSE false
      END
      FROM public.community_channels ch
      WHERE ch.id = _channel_id
    );
$$;

-- 5. Update INSERT policy on community_chat_messages to also enforce posting permission
DROP POLICY IF EXISTS "Members post chat in accessible channel" ON public.community_chat_messages;

CREATE POLICY "Members post chat in accessible channel"
  ON public.community_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_community_member(auth.uid(), community_id)
    AND public.can_access_community_tier(
          auth.uid(), community_id,
          COALESCE((SELECT required_tier_level FROM public.community_channels WHERE id = community_chat_messages.channel_id), 0)
        )
    AND public.can_post_in_channel(auth.uid(), community_id, channel_id)
  );
