
-- Notify active members on new community event
CREATE OR REPLACE FUNCTION public.notify_members_new_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    AND public.can_access_community_tier(m.user_id, NEW.community_id, COALESCE(NEW.required_tier_level, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_members_new_event ON public.community_events;
CREATE TRIGGER trg_notify_members_new_event
AFTER INSERT ON public.community_events
FOR EACH ROW EXECUTE FUNCTION public.notify_members_new_event();

-- Notify active members on new community resource
CREATE OR REPLACE FUNCTION public.notify_members_new_resource()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_community_name text;
  v_slug text;
BEGIN
  SELECT name, slug INTO v_community_name, v_slug FROM public.communities WHERE id = NEW.community_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  SELECT m.user_id, 'community',
         'New resource in ' || COALESCE(v_community_name, 'your community'),
         NEW.title,
         '/c/' || v_slug || '/room?tab=resources'
  FROM public.memberships m
  WHERE m.community_id = NEW.community_id
    AND m.status = 'active'
    AND m.user_id <> NEW.created_by
    AND public.can_access_community_tier(m.user_id, NEW.community_id, COALESCE(NEW.required_tier_level, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_members_new_resource ON public.community_resources;
CREATE TRIGGER trg_notify_members_new_resource
AFTER INSERT ON public.community_resources
FOR EACH ROW EXECUTE FUNCTION public.notify_members_new_resource();
