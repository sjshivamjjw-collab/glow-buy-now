
ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS audience_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Replace member read policy to honor audience targeting
DROP POLICY IF EXISTS "Members read events" ON public.community_events;

CREATE POLICY "Members read events"
ON public.community_events
FOR SELECT
TO authenticated
USING (
  public.is_active_community_member(auth.uid(), community_id)
  AND (
    coalesce(array_length(audience_user_ids, 1), 0) = 0
    OR auth.uid() = ANY (audience_user_ids)
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid())
  )
);

-- Update notification function to skip non-targeted members on 1-1 events
CREATE OR REPLACE FUNCTION public.notify_members_new_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_community_name text;
  v_slug text;
BEGIN
  SELECT name, slug INTO v_community_name, v_slug FROM public.communities WHERE id = NEW.community_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  SELECT m.user_id, 'community',
         'New event in ' || COALESCE(v_community_name, 'your community'),
         NEW.title,
         '/c/' || v_slug || '/room?tab=events'
  FROM public.memberships m
  WHERE m.community_id = NEW.community_id
    AND m.status = 'active'
    AND m.user_id <> NEW.created_by
    AND public.can_access_community_tier(m.user_id, NEW.community_id, COALESCE(NEW.required_tier_level, 0))
    AND (
      COALESCE(array_length(NEW.audience_user_ids, 1), 0) = 0
      OR m.user_id = ANY (NEW.audience_user_ids)
    );
  RETURN NEW;
END;
$function$;
