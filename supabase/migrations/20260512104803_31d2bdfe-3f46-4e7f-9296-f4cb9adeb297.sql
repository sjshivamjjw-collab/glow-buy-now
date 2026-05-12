
-- Approval status enum
DO $$ BEGIN
  CREATE TYPE public.community_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS approval_status public.community_approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Backfill: any community already published is treated as approved
UPDATE public.communities SET approval_status = 'approved' WHERE is_published = true AND approval_status = 'pending';

-- Replace public visibility policy to require approval
DROP POLICY IF EXISTS "Anyone can view published communities" ON public.communities;
CREATE POLICY "Anyone can view approved published communities"
  ON public.communities FOR SELECT
  TO public
  USING (is_published = true AND approval_status = 'approved');

-- Allow admins to update communities (for review actions)
DROP POLICY IF EXISTS "Admins can update communities" ON public.communities;
CREATE POLICY "Admins can update communities"
  ON public.communities FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tier visibility must also require approval
DROP POLICY IF EXISTS "Anyone can view tiers of published communities" ON public.community_tiers;
CREATE POLICY "Anyone can view tiers of approved communities"
  ON public.community_tiers FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_tiers.community_id
        AND c.is_published = true
        AND c.approval_status = 'approved'
    )
  );

-- Notify creator on approval/rejection
CREATE OR REPLACE FUNCTION public.notify_community_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = OLD.approval_status THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (NEW.creator_id, 'community',
      'Community approved 🎉',
      '"' || NEW.name || '" is now live and visible to everyone.',
      '/c/' || NEW.slug);
  ELSIF NEW.approval_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (NEW.creator_id, 'community',
      'Community needs changes',
      COALESCE(NEW.rejection_reason, 'Your community was not approved. Please update it and resubmit.'),
      '/creator');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_review ON public.communities;
CREATE TRIGGER trg_notify_community_review
  AFTER UPDATE OF approval_status ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_review();
