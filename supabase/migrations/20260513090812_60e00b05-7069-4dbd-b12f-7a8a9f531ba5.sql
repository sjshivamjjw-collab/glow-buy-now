
-- 1) OTP brute-force protection: track attempts per row
ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

-- 2) Payment intents table to bind razorpay_order_id <-> tier_id/user
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  tier_id uuid NOT NULL,
  community_id uuid NOT NULL,
  amount_inr numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
-- Only service role writes/reads; no user-facing policies (deny by default).

-- 3) Tighten community_resources SELECT to enforce tier gating on metadata
DROP POLICY IF EXISTS "Members read resources" ON public.community_resources;
CREATE POLICY "Members read resources"
  ON public.community_resources
  FOR SELECT
  TO authenticated
  USING (
    is_active_community_member(auth.uid(), community_id)
    AND can_access_community_tier(auth.uid(), community_id, COALESCE(required_tier_level, 0))
  );

-- 4) Realtime: restrict community chat topic subscriptions to active members.
-- Topic convention used by the client: 'community_chat:<community_id>'
DROP POLICY IF EXISTS "Community chat realtime members only" ON realtime.messages;
CREATE POLICY "Community chat realtime members only"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() LIKE 'community_chat:%'
       AND public.is_active_community_member(
         auth.uid(),
         NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
       ))
    OR (realtime.topic() LIKE 'community_chat_poll:%'
       AND public.is_active_community_member(
         auth.uid(),
         NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
       ))
  );
