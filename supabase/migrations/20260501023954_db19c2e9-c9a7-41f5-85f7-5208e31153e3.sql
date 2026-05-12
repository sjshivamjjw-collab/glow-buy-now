
REVOKE EXECUTE ON FUNCTION public.has_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_seller_approval FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column FROM anon, authenticated;
