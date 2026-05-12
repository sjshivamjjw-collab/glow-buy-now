CREATE OR REPLACE FUNCTION public.get_seller_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND public.has_role(p.id, 'seller'::app_role);
$$;

REVOKE ALL ON FUNCTION public.get_seller_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_public_profiles(uuid[]) TO anon, authenticated;