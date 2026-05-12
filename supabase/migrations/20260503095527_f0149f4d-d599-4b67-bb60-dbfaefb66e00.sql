ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_secret text;
-- Existing SELECT/UPDATE policies use specific column lists in app code; this column will only ever
-- be touched by edge functions via the service role, which bypasses RLS.