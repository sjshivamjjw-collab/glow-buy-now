
-- Helper: is user an active member of community? (security definer to skip RLS recursion)
CREATE OR REPLACE FUNCTION public.is_active_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = _community_id AND creator_id = _user_id
  );
$$;

-- Chat messages
CREATE TABLE public.community_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_community_created ON public.community_chat_messages (community_id, created_at DESC);
ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read chat" ON public.community_chat_messages
  FOR SELECT TO authenticated
  USING (public.is_active_community_member(auth.uid(), community_id));
CREATE POLICY "Members post chat" ON public.community_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_community_member(auth.uid(), community_id));
CREATE POLICY "Authors delete own chat" ON public.community_chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Creators delete chat in own community" ON public.community_chat_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_chat_messages;
ALTER TABLE public.community_chat_messages REPLICA IDENTITY FULL;

-- Events
CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location_url text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_community_starts ON public.community_events (community_id, starts_at);
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read events" ON public.community_events
  FOR SELECT TO authenticated
  USING (public.is_active_community_member(auth.uid(), community_id));
CREATE POLICY "Creators manage events" ON public.community_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid()));

CREATE TRIGGER community_events_updated BEFORE UPDATE ON public.community_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Event RSVPs
CREATE TYPE public.event_rsvp_status AS ENUM ('going','maybe','declined');
CREATE TABLE public.community_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status public.event_rsvp_status NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read rsvps" ON public.community_event_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_events e
                 WHERE e.id = event_id AND public.is_active_community_member(auth.uid(), e.community_id)));
CREATE POLICY "Members upsert own rsvp" ON public.community_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.community_events e
              WHERE e.id = event_id AND public.is_active_community_member(auth.uid(), e.community_id)));
CREATE POLICY "Members update own rsvp" ON public.community_event_rsvps
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members delete own rsvp" ON public.community_event_rsvps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Resources
CREATE TYPE public.resource_kind AS ENUM ('file','link');
CREATE TABLE public.community_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  kind public.resource_kind NOT NULL,
  url text NOT NULL,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_community ON public.community_resources (community_id, created_at DESC);
ALTER TABLE public.community_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read resources" ON public.community_resources
  FOR SELECT TO authenticated
  USING (public.is_active_community_member(auth.uid(), community_id));
CREATE POLICY "Creators manage resources" ON public.community_resources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid()));

-- Storage: community-resources bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('community-resources', 'community-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read community resources" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-resources');
CREATE POLICY "Creators upload community resources" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-resources'
    AND EXISTS (SELECT 1 FROM public.communities c
                WHERE c.creator_id = auth.uid()
                AND c.id::text = (storage.foldername(name))[1])
  );
CREATE POLICY "Creators delete own community resources" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-resources'
    AND EXISTS (SELECT 1 FROM public.communities c
                WHERE c.creator_id = auth.uid()
                AND c.id::text = (storage.foldername(name))[1])
  );
