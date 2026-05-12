-- ============================================================
-- 1. Rename role enum value seller -> creator
-- ============================================================
ALTER TYPE public.app_role RENAME VALUE 'seller' TO 'creator';

-- Patch DB functions that hard-coded 'seller'::app_role
CREATE OR REPLACE FUNCTION public.get_seller_public_profile(_seller_id uuid)
 RETURNS TABLE(id uuid, name text, username text, avatar_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = _seller_id
    AND public.has_role(p.id, 'creator'::app_role);
$function$;

CREATE OR REPLACE FUNCTION public.get_seller_public_profiles(_ids uuid[])
 RETURNS TABLE(id uuid, name text, username text, avatar_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND public.has_role(p.id, 'creator'::app_role);
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_seller(_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can revoke creator access';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'creator'::app_role;
  UPDATE public.seller_applications
  SET status = 'rejected'::application_status,
      rejection_reason = COALESCE(rejection_reason, 'Creator access revoked by admin'),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE user_id = _user_id AND status = 'approved'::application_status;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_seller_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'creator')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop dormant RLS policies that referenced the old enum literal (tables stay, just unused)
DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
DROP POLICY IF EXISTS "Sellers can create livestreams" ON public.livestreams;

-- ============================================================
-- 2. New enums
-- ============================================================
CREATE TYPE public.tier_kind AS ENUM ('free', 'paid_monthly', 'paid_one_time');
CREATE TYPE public.membership_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE public.membership_source AS ENUM ('free', 'razorpay_sub', 'razorpay_order');

-- ============================================================
-- 3. communities
-- ============================================================
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  cover_url text,
  intro_video_url text,
  key_outcomes text[] NOT NULL DEFAULT '{}',
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb, -- { youtube, instagram, x, website }
  is_published boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_communities_creator ON public.communities(creator_id);
CREATE INDEX idx_communities_published ON public.communities(is_published) WHERE is_published = true;

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published communities"
ON public.communities FOR SELECT TO public
USING (is_published = true);

CREATE POLICY "Creators can view own communities"
ON public.communities FOR SELECT TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Admins can view all communities"
ON public.communities FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can create communities"
ON public.communities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id AND public.has_role(auth.uid(), 'creator'::app_role));

CREATE POLICY "Creators can update own communities"
ON public.communities FOR UPDATE TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own communities"
ON public.communities FOR DELETE TO authenticated
USING (auth.uid() = creator_id);

CREATE TRIGGER set_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. community_tiers
-- ============================================================
CREATE TABLE public.community_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  kind public.tier_kind NOT NULL,
  price_inr numeric, -- null for free
  razorpay_plan_id text, -- set after publishing a paid_monthly tier
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tier_price_check CHECK (
    (kind = 'free' AND price_inr IS NULL) OR
    (kind <> 'free' AND price_inr IS NOT NULL AND price_inr > 0)
  )
);
CREATE INDEX idx_tiers_community ON public.community_tiers(community_id);

ALTER TABLE public.community_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tiers of published communities"
ON public.community_tiers FOR SELECT TO public
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = community_tiers.community_id AND c.is_published = true
  )
);

CREATE POLICY "Creators can view own tiers"
ON public.community_tiers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = community_tiers.community_id AND c.creator_id = auth.uid()
));

CREATE POLICY "Creators can manage own tiers"
ON public.community_tiers FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = community_tiers.community_id AND c.creator_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = community_tiers.community_id AND c.creator_id = auth.uid()
));

CREATE TRIGGER set_tiers_updated_at
BEFORE UPDATE ON public.community_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. memberships
-- ============================================================
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.community_tiers(id) ON DELETE RESTRICT,
  status public.membership_status NOT NULL DEFAULT 'pending',
  source public.membership_source NOT NULL,
  razorpay_subscription_id text,
  razorpay_payment_id text,
  razorpay_order_id text,
  started_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, community_id)
);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_community ON public.memberships(community_id);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_memberships_period_end ON public.memberships(current_period_end) WHERE current_period_end IS NOT NULL;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
ON public.memberships FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Creators can view memberships in own communities"
ON public.memberships FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.communities c
  WHERE c.id = memberships.community_id AND c.creator_id = auth.uid()
));

CREATE POLICY "Admins can view all memberships"
ON public.memberships FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Free-tier self-join allowed; paid memberships are inserted server-side via edge functions
CREATE POLICY "Users can self-join free tiers"
ON public.memberships FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND source = 'free'
  AND EXISTS (
    SELECT 1 FROM public.community_tiers t
    WHERE t.id = memberships.tier_id AND t.kind = 'free'
  )
);

-- Users can cancel (mark cancelled) their own memberships
CREATE POLICY "Users can update own memberships"
ON public.memberships FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER set_memberships_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. Notification triggers for memberships
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_membership_status_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_community_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT name INTO v_community_name FROM public.communities WHERE id = NEW.community_id;
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (NEW.user_id, 'membership',
      'Welcome to ' || COALESCE(v_community_name, 'the community'),
      'Your membership is now active.',
      '/c/' || NEW.community_id::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    SELECT name INTO v_community_name FROM public.communities WHERE id = NEW.community_id;
    IF NEW.status = 'active' THEN
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (NEW.user_id, 'membership',
        'Welcome to ' || COALESCE(v_community_name, 'the community'),
        'Your membership is now active.',
        '/c/' || NEW.community_id::text);
    ELSIF NEW.status IN ('expired','cancelled') THEN
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (NEW.user_id, 'membership',
        'Membership ended',
        'Your access to ' || COALESCE(v_community_name, 'the community') || ' has ended.',
        '/c/' || NEW.community_id::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_membership_notify_insert
AFTER INSERT ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.notify_membership_status_change();

CREATE TRIGGER trg_membership_notify_update
AFTER UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.notify_membership_status_change();

-- Maintain member_count
CREATE OR REPLACE FUNCTION public.maintain_community_member_count()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'active' AND NEW.status = 'active' THEN
      UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.community_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_member_count_ins AFTER INSERT ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.maintain_community_member_count();
CREATE TRIGGER trg_member_count_upd AFTER UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.maintain_community_member_count();
CREATE TRIGGER trg_member_count_del AFTER DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.maintain_community_member_count();

-- ============================================================
-- 7. Storage bucket: community-media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read community media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'community-media');

CREATE POLICY "Creators can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Creators can update own community media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Creators can delete own community media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 8. Auto-grant creator role helper RPC
-- (Phase 1: anyone authenticated can self-promote to creator)
-- ============================================================
CREATE OR REPLACE FUNCTION public.become_creator()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'creator'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$function$;

-- ============================================================
-- 9. Extensions for cron + http
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;