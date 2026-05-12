
-- Extend community chat messages with attachments + polls
ALTER TABLE public.community_chat_messages
  ALTER COLUMN body DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS poll jsonb;

-- Sanity check: kind allowed values enforced via trigger to keep flexibility
CREATE OR REPLACE FUNCTION public.validate_community_chat_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind NOT IN ('text','image','file','poll') THEN
    RAISE EXCEPTION 'Invalid message kind: %', NEW.kind;
  END IF;
  IF NEW.kind = 'text' AND (NEW.body IS NULL OR length(trim(NEW.body)) = 0) THEN
    RAISE EXCEPTION 'Text message cannot be empty';
  END IF;
  IF NEW.kind IN ('image','file') AND NEW.attachment_url IS NULL THEN
    RAISE EXCEPTION 'Attachment url required';
  END IF;
  IF NEW.kind = 'poll' AND (NEW.poll IS NULL OR (NEW.poll->'question') IS NULL OR jsonb_array_length(COALESCE(NEW.poll->'options','[]'::jsonb)) < 2) THEN
    RAISE EXCEPTION 'Poll requires question and >=2 options';
  END IF;
  RETURN NEW;
END $$ SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_community_chat_message ON public.community_chat_messages;
CREATE TRIGGER trg_validate_community_chat_message
  BEFORE INSERT OR UPDATE ON public.community_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_community_chat_message();

-- Poll votes
CREATE TABLE IF NOT EXISTS public.community_chat_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.community_chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read poll votes" ON public.community_chat_poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_chat_messages m
    WHERE m.id = community_chat_poll_votes.message_id
      AND public.is_active_community_member(auth.uid(), m.community_id)
  ));

CREATE POLICY "Members cast own poll vote" ON public.community_chat_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.community_chat_messages m
    WHERE m.id = community_chat_poll_votes.message_id
      AND public.is_active_community_member(auth.uid(), m.community_id)
  ));

CREATE POLICY "Members change own poll vote" ON public.community_chat_poll_votes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Members delete own poll vote" ON public.community_chat_poll_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_chat_poll_votes;

-- Storage policies for community-media bucket for chat uploads under chat/{community_id}/...
CREATE POLICY "Members upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = 'chat'
    AND public.is_active_community_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Members read chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = 'chat'
    AND public.is_active_community_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Authors delete chat media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = 'chat'
    AND owner = auth.uid()
  );
