REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_post_mentions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_post_mentions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_post_mentions() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM authenticated;