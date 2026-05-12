DROP VIEW IF EXISTS public.seller_public_profiles;

CREATE OR REPLACE FUNCTION public.get_seller_public_profile(_seller_id uuid)
RETURNS TABLE(id uuid, name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = _seller_id
    AND public.has_role(p.id, 'seller'::app_role);
$$;

REVOKE ALL ON FUNCTION public.get_seller_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_public_profile(uuid) TO anon, authenticated;