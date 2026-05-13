-- DM threads (one per pair of users per community)
CREATE TABLE public.community_dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_a_lt_user_b CHECK (user_a < user_b),
  CONSTRAINT uniq_dm_pair UNIQUE (community_id, user_a, user_b)
);
CREATE INDEX idx_dm_threads_community_user_a ON public.community_dm_threads(community_id, user_a, last_message_at DESC);
CREATE INDEX idx_dm_threads_community_user_b ON public.community_dm_threads(community_id, user_b, last_message_at DESC);

ALTER TABLE public.community_dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own DM threads" ON public.community_dm_threads
FOR SELECT TO authenticated
USING (
  (auth.uid() = user_a OR auth.uid() = user_b)
  AND public.is_active_community_member(auth.uid(), community_id)
);

CREATE POLICY "Participants create DM threads" ON public.community_dm_threads
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_a OR auth.uid() = user_b)
  AND public.is_active_community_member(auth.uid(), community_id)
  AND public.is_active_community_member(
    CASE WHEN auth.uid() = user_a THEN user_b ELSE user_a END,
    community_id
  )
);

-- DM messages
CREATE TABLE public.community_dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.community_dm_threads(id) ON DELETE CASCADE,
  community_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text,
  attachment_url text,
  attachment_name text,
  attachment_mime text,
  attachment_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dm_messages_thread_created ON public.community_dm_messages(thread_id, created_at);

ALTER TABLE public.community_dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read DM messages" ON public.community_dm_messages
FOR SELECT TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id)
  AND public.is_active_community_member(auth.uid(), community_id)
);

CREATE POLICY "Sender insert DM message" ON public.community_dm_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> recipient_id
  AND public.is_active_community_member(sender_id, community_id)
  AND public.is_active_community_member(recipient_id, community_id)
  AND EXISTS (
    SELECT 1 FROM public.community_dm_threads t
    WHERE t.id = thread_id
      AND t.community_id = community_dm_messages.community_id
      AND ((t.user_a = sender_id AND t.user_b = recipient_id)
        OR (t.user_b = sender_id AND t.user_a = recipient_id))
  )
);

CREATE POLICY "Sender deletes own DM" ON public.community_dm_messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_dm_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.kind NOT IN ('text','image','file') THEN
    RAISE EXCEPTION 'Invalid DM kind: %', NEW.kind;
  END IF;
  IF NEW.kind = 'text' AND (NEW.body IS NULL OR length(trim(NEW.body)) = 0) THEN
    RAISE EXCEPTION 'Text DM cannot be empty';
  END IF;
  IF NEW.kind IN ('image','file') AND NEW.attachment_url IS NULL THEN
    RAISE EXCEPTION 'Attachment url required';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_dm_message
BEFORE INSERT ON public.community_dm_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_dm_message();

-- Bump thread last_message_at
CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.community_dm_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bump_dm_thread
AFTER INSERT ON public.community_dm_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread();

-- Notify recipient of DM
CREATE OR REPLACE FUNCTION public.notify_dm_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
  v_slug text;
  v_preview text;
BEGIN
  SELECT COALESCE(name, username, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;
  SELECT slug INTO v_slug FROM public.communities WHERE id = NEW.community_id;
  v_preview := CASE
    WHEN NEW.kind = 'text' THEN LEFT(COALESCE(NEW.body, ''), 120)
    WHEN NEW.kind = 'image' THEN '📷 Photo'
    ELSE '📎 ' || COALESCE(NEW.attachment_name, 'File')
  END;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (NEW.recipient_id, 'dm',
    'New message from ' || v_sender_name,
    v_preview,
    '/c/' || v_slug || '/room?tab=chat&dm=' || NEW.sender_id::text);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_dm_recipient
AFTER INSERT ON public.community_dm_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_dm_recipient();

-- Helper: get or create thread
CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(_community_id uuid, _other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_me = _other_user_id THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  IF NOT public.is_active_community_member(v_me, _community_id) THEN
    RAISE EXCEPTION 'You are not a member of this community';
  END IF;
  IF NOT public.is_active_community_member(_other_user_id, _community_id) THEN
    RAISE EXCEPTION 'Recipient is not a member of this community';
  END IF;

  IF v_me < _other_user_id THEN v_a := v_me; v_b := _other_user_id;
  ELSE v_a := _other_user_id; v_b := v_me; END IF;

  SELECT id INTO v_id FROM public.community_dm_threads
  WHERE community_id = _community_id AND user_a = v_a AND user_b = v_b;

  IF v_id IS NULL THEN
    INSERT INTO public.community_dm_threads (community_id, user_a, user_b)
    VALUES (_community_id, v_a, v_b)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_dm_threads;
ALTER TABLE public.community_dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.community_dm_threads REPLICA IDENTITY FULL;