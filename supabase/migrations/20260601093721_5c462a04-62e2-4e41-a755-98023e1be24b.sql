-- Attach handle_new_user trigger to auth.users (was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth users without one
INSERT INTO public.profiles (id, phone, onboarding_completed, name)
SELECT u.id,
       CASE WHEN u.phone IS NULL THEN NULL WHEN u.phone LIKE '+%' THEN u.phone ELSE '+' || u.phone END,
       false,
       NULL
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Backfill creator role for any user missing it
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'creator'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'creator'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;