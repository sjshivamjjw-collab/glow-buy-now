
-- Relax the CHECK constraint to allow 'admins'
ALTER TABLE public.community_channels DROP CONSTRAINT IF EXISTS community_channels_post_permission_check;
ALTER TABLE public.community_channels
  ADD CONSTRAINT community_channels_post_permission_check
  CHECK (post_permission IN ('all_members','admins','moderators','creator_only'));

UPDATE public.community_channels SET post_permission = 'admins' WHERE post_permission = 'moderators';

ALTER TABLE public.community_moderators RENAME TO community_admins;

CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.community_admins WHERE community_id = _community_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_post_in_channel(_user_id uuid, _community_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id)
    OR (
      SELECT CASE COALESCE(ch.post_permission, 'all_members')
        WHEN 'all_members' THEN true
        WHEN 'admins'      THEN public.is_community_admin(_user_id, _community_id)
        WHEN 'moderators'  THEN public.is_community_admin(_user_id, _community_id)
        WHEN 'creator_only' THEN false
        ELSE false
      END
      FROM public.community_channels ch
      WHERE ch.id = _channel_id
    );
$$;

DROP FUNCTION IF EXISTS public.is_community_moderator(uuid, uuid);

DROP POLICY IF EXISTS "Creators manage moderators" ON public.community_admins;
DROP POLICY IF EXISTS "Members read moderators" ON public.community_admins;

CREATE POLICY "Creators manage admins"
ON public.community_admins
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_admins.community_id AND c.creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_admins.community_id AND c.creator_id = auth.uid()));

CREATE POLICY "Members read admins"
ON public.community_admins
FOR SELECT TO authenticated
USING (public.is_active_community_member(auth.uid(), community_id));
