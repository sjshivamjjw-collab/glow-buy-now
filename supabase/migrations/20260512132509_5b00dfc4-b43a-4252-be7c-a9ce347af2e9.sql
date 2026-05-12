ALTER TABLE public.community_tiers
  ADD COLUMN IF NOT EXISTS billing_period_months integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0;