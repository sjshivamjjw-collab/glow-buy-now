
CREATE TABLE public.community_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX idx_community_reviews_community ON public.community_reviews(community_id, created_at DESC);

ALTER TABLE public.community_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews of approved + published communities
CREATE POLICY "Anyone can view reviews of approved communities"
ON public.community_reviews FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = community_reviews.community_id
    AND c.is_published = true
    AND c.approval_status = 'approved'
));

-- Creators can view all reviews on their own community
CREATE POLICY "Creators can view reviews on own community"
ON public.community_reviews FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = community_reviews.community_id AND c.creator_id = auth.uid()
));

-- Admins can view all
CREATE POLICY "Admins can view all reviews"
ON public.community_reviews FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members (current or past) can leave a review; cannot review own community
CREATE POLICY "Members can create own review"
ON public.community_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.creator_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.community_id = community_reviews.community_id
  )
);

CREATE POLICY "Users update own review"
ON public.community_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own review"
ON public.community_reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins delete reviews"
ON public.community_reviews FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_community_reviews_updated
BEFORE UPDATE ON public.community_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify creator when a new review arrives
CREATE OR REPLACE FUNCTION public.notify_creator_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_name text;
  v_slug text;
BEGIN
  SELECT creator_id, name, slug INTO v_creator, v_name, v_slug
  FROM public.communities WHERE id = NEW.community_id;
  IF v_creator IS NOT NULL AND v_creator <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (v_creator, 'community',
      'New review on ' || COALESCE(v_name,'your community'),
      NEW.rating || '★ ' || COALESCE(LEFT(NEW.body, 120), ''),
      '/c/' || v_slug);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_review
AFTER INSERT ON public.community_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_creator_new_review();
