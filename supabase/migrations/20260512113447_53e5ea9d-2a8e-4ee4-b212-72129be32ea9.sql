-- 1. Channels table
CREATE TABLE public.community_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  required_tier_level integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

-- 2. Add tier gating fields
ALTER TABLE public.community_chat_messages ADD COLUMN channel_id uuid;
ALTER TABLE public.community_events ADD COLUMN required_tier_level integer NOT NULL DEFAULT 0;
ALTER TABLE public.community_resources ADD COLUMN required_tier_level integer NOT NULL DEFAULT 0;

-- 3. Seed default General channel for every existing community
INSERT INTO public.community_channels (community_id, name, slug, required_tier_level, sort_order)
SELECT id, 'General', 'general', 0, 0 FROM public.communities;

UPDATE public.community_chat_messages m
SET channel_id = (
  SELECT id FROM public.community_channels c
  WHERE c.community_id = m.community_id AND c.slug = 'general' LIMIT 1
)
WHERE channel_id IS NULL;

ALTER TABLE public.community_chat_messages ALTER COLUMN channel_id SET NOT NULL;

-- 4. Helpers
CREATE OR REPLACE FUNCTION public.user_community_tier_level(_user_id uuid, _community_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(MAX(t.sort_order), -1)
  FROM public.memberships m
  JOIN public.community_tiers t ON t.id = m.tier_id
  WHERE m.user_id = _user_id
    AND m.community_id = _community_id
    AND m.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.can_access_community_tier(_user_id uuid, _community_id uuid, _required_level integer)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id
  ) OR public.user_community_tier_level(_user_id, _community_id) >= _required_level;
$$;

-- 5. RLS for channels
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read channels"
  ON public.community_channels FOR SELECT TO authenticated
  USING (public.is_active_community_member(auth.uid(), community_id));

CREATE POLICY "Creators manage channels"
  ON public.community_channels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_channels.community_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_channels.community_id AND c.creator_id = auth.uid()));

-- 6. Update chat RLS to enforce channel tier
DROP POLICY IF EXISTS "Members read chat" ON public.community_chat_messages;
DROP POLICY IF EXISTS "Members post chat" ON public.community_chat_messages;

CREATE POLICY "Members read chat in accessible channel"
  ON public.community_chat_messages FOR SELECT TO authenticated
  USING (
    public.is_active_community_member(auth.uid(), community_id)
    AND public.can_access_community_tier(
      auth.uid(),
      community_id,
      COALESCE((SELECT required_tier_level FROM public.community_channels WHERE id = community_chat_messages.channel_id), 0)
    )
  );

CREATE POLICY "Members post chat in accessible channel"
  ON public.community_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_community_member(auth.uid(), community_id)
    AND public.can_access_community_tier(
      auth.uid(),
      community_id,
      COALESCE((SELECT required_tier_level FROM public.community_channels WHERE id = community_chat_messages.channel_id), 0)
    )
  );

-- (Events/resources keep existing SELECT policy so members see locked items; UI hides URL/RSVP for locked.)
