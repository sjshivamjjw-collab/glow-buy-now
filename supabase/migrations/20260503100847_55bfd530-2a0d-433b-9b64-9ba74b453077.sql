-- Drop overly broad policy exposing all profile columns for sellers
DROP POLICY IF EXISTS "Authenticated can view seller public info" ON public.profiles;

-- Create a safe public view exposing only non-sensitive fields for sellers
CREATE OR REPLACE VIEW public.seller_public_profiles AS
SELECT p.id, p.name, p.username, p.avatar_url
FROM public.profiles p
WHERE public.has_role(p.id, 'seller'::app_role);

-- View runs with definer rights so it bypasses RLS on profiles,
-- but only exposes the whitelisted columns above.
ALTER VIEW public.seller_public_profiles SET (security_invoker = off);

GRANT SELECT ON public.seller_public_profiles TO anon, authenticated;