CREATE OR REPLACE FUNCTION public.get_chat_author_names(_user_ids uuid[])
RETURNS TABLE(id uuid, name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_user_ids)
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_author_names(uuid[]) TO anon, authenticated;