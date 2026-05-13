
-- =========================================================================
-- 1. Memberships: prevent privilege escalation via self-update
-- =========================================================================
DROP POLICY IF EXISTS "Users can update own memberships" ON public.memberships;

-- Users may only flag their own membership as cancelled. They cannot change
-- tier, payment ids, status to active, or extend their period.
CREATE POLICY "Users can cancel own memberships"
ON public.memberships
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('cancelled','expired')
);

-- Belt and suspenders: a trigger blocks any change to sensitive columns
-- regardless of which policy lets the row through.
CREATE OR REPLACE FUNCTION public.guard_membership_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service-role / definer functions to bypass (no auth.uid()).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tier_id IS DISTINCT FROM OLD.tier_id
     OR NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id
     OR NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id
     OR NEW.razorpay_subscription_id IS DISTINCT FROM OLD.razorpay_subscription_id
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.community_id IS DISTINCT FROM OLD.community_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Cannot modify protected membership fields';
  END IF;

  IF NEW.status NOT IN ('cancelled','expired') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change membership status to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_membership_self_update ON public.memberships;
CREATE TRIGGER guard_membership_self_update
BEFORE UPDATE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.guard_membership_self_update();

-- =========================================================================
-- 2. New public bucket for community covers / videos / info attachments
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-public', 'community-public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read community-public" ON storage.objects;
CREATE POLICY "Public read community-public"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-public');

DROP POLICY IF EXISTS "Users upload own community-public" ON storage.objects;
CREATE POLICY "Users upload own community-public"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-public'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own community-public" ON storage.objects;
CREATE POLICY "Users update own community-public"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'community-public'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own community-public" ON storage.objects;
CREATE POLICY "Users delete own community-public"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-public'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================================
-- 3. Make community-media private + scoped read access
-- =========================================================================
UPDATE storage.buckets SET public = false WHERE id = 'community-media';

DROP POLICY IF EXISTS "Public can read community media" ON storage.objects;

-- Chat attachments live under chat/<community_id>/<user_id>/...
DROP POLICY IF EXISTS "Members read chat media" ON storage.objects;
CREATE POLICY "Members read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = 'chat'
  AND public.is_active_community_member(
    auth.uid(),
    ((storage.foldername(name))[2])::uuid
  )
);

-- DM attachments live under dm/<community_id>/<user_id>/...
-- Only members can read; we cannot easily check thread participation from
-- the path alone, so we restrict to active community membership which is
-- the same gate we apply to the message rows themselves.
DROP POLICY IF EXISTS "Members read dm media" ON storage.objects;
CREATE POLICY "Members read dm media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] = 'dm'
  AND public.is_active_community_member(
    auth.uid(),
    ((storage.foldername(name))[2])::uuid
  )
);

-- Allow authenticated users to upload their own chat/dm files.
DROP POLICY IF EXISTS "Members upload chat media" ON storage.objects;
CREATE POLICY "Members upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] IN ('chat','dm')
  AND (storage.foldername(name))[3] = auth.uid()::text
  AND public.is_active_community_member(
    auth.uid(),
    ((storage.foldername(name))[2])::uuid
  )
);

DROP POLICY IF EXISTS "Owners delete own chat media" ON storage.objects;
CREATE POLICY "Owners delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- =========================================================================
-- 4. Make community-resources private + tier-checked read access
-- =========================================================================
UPDATE storage.buckets SET public = false WHERE id = 'community-resources';

DROP POLICY IF EXISTS "Public read community resources" ON storage.objects;

-- Files live under <community_id>/<filename>. Active members only, and the
-- caller must satisfy the resource's required tier level.
DROP POLICY IF EXISTS "Members read community resources by tier" ON storage.objects;
CREATE POLICY "Members read community resources by tier"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'community-resources'
  AND public.is_active_community_member(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
  AND public.can_access_community_tier(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    COALESCE((
      SELECT r.required_tier_level FROM public.community_resources r
      WHERE r.community_id = ((storage.foldername(name))[1])::uuid
        AND r.url LIKE '%/' || objects.name
      LIMIT 1
    ), 0)
  )
);

-- =========================================================================
-- 5. Realtime authorization for DM topics (dm:<thread_id>)
-- =========================================================================
DROP POLICY IF EXISTS "DM participants can read realtime topic" ON realtime.messages;
CREATE POLICY "DM participants can read realtime topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'dm:%'
  AND EXISTS (
    SELECT 1 FROM public.community_dm_threads t
    WHERE t.id::text = split_part(realtime.topic(), ':', 2)
      AND (t.user_a = auth.uid() OR t.user_b = auth.uid())
  )
);
