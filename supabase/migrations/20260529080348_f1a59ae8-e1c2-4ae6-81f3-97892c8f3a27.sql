REVOKE EXECUTE ON FUNCTION public.get_post_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_post_public(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_post_public(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_post_comments_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_post_comments_public(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_post_comments_public(uuid) TO authenticated;