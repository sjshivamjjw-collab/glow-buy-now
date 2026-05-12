
-- Tighten is_active_community_member: paid tiers require proof of payment
CREATE OR REPLACE FUNCTION public.is_active_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  );
$$;

-- Tighten user_community_tier_level with same rules
CREATE OR REPLACE FUNCTION public.user_community_tier_level(_user_id uuid, _community_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(t.sort_order), -1)
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
    AND (m.current_period_end IS NULL OR m.current_period_end > now());
$$;

-- Clean up any existing 'active' paid memberships without payment proof
UPDATE public.memberships m
SET status = 'pending', updated_at = now()
FROM public.community_tiers t
WHERE m.tier_id = t.id
  AND m.status = 'active'
  AND t.kind <> 'free'
  AND m.razorpay_payment_id IS NULL
  AND m.razorpay_subscription_id IS NULL;
