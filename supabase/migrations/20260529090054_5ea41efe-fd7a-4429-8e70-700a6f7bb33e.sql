
CREATE OR REPLACE FUNCTION public.get_user_post_saves_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::int
  FROM public.post_saves s
  JOIN public.posts p ON p.id = s.post_id
  WHERE p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_post_saves_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_post_saves_count(uuid) TO authenticated;
