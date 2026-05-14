-- Platform admins (user_roles.role = 'admin') can enter any community,
-- post in any channel, and bypass tier gating.
CREATE OR REPLACE FUNCTION public.is_active_community_member(_user_id uuid, _community_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.community_tiers t ON t.id = m.tier_id
    WHERE m.user_id = _user_id
      AND m.community_id = _community_id
      AND m.status = 'active'
      AND (
        t.kind = 'free'
        OR m.razorpay_payment_id IS NOT NULL
        OR m.razorpay_subscription_id IS NOT NULL
      )
      AND (m.current_period_end IS NULL OR m.current_period_end > now())
  ) OR EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = _community_id AND creator_id = _user_id
  ) OR public.has_role(_user_id, 'admin'::app_role);
$function$;

CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id uuid, _community_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.community_admins WHERE community_id = _community_id AND user_id = _user_id)
      OR public.has_role(_user_id, 'admin'::app_role);
$function$;

CREATE OR REPLACE FUNCTION public.can_access_community_tier(_user_id uuid, _community_id uuid, _required_level integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id
  )
  OR public.has_role(_user_id, 'admin'::app_role)
  OR public.user_community_tier_level(_user_id, _community_id) >= _required_level;
$function$;

CREATE OR REPLACE FUNCTION public.can_post_in_channel(_user_id uuid, _community_id uuid, _channel_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND creator_id = _user_id)
    OR public.has_role(_user_id, 'admin'::app_role)
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
$function$;

-- Returns all platform admin user IDs (so the chat UI can badge their messages).
CREATE OR REPLACE FUNCTION public.get_platform_admin_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role;
$function$;