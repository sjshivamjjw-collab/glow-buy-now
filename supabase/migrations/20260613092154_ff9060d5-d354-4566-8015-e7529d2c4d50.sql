
-- Allow anonymous (logged-out) web visitors to READ public content.
-- Writes remain authenticated-only via existing policies.

-- posts: same rule as authenticated read (non-hidden, anon-author masking handled by RPCs/CASE)
CREATE POLICY "Anon can read public posts"
ON public.posts FOR SELECT TO anon
USING (is_hidden = false);

-- post_media: read all
CREATE POLICY "Anon can read post media"
ON public.post_media FOR SELECT TO anon
USING (true);

-- post_comments: same masking rule (anonymous author hidden via existing RPC layer)
CREATE POLICY "Anon can read comments"
ON public.post_comments FOR SELECT TO anon
USING (is_anonymous = false);

-- profiles: public read
CREATE POLICY "Anon can read profiles"
ON public.profiles FOR SELECT TO anon
USING (true);

-- user_follows: needed for follower counts
CREATE POLICY "Anon can read follows"
ON public.user_follows FOR SELECT TO anon
USING (true);

-- Table-level GRANT SELECT for anon
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.post_media TO anon;
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.user_follows TO anon;

-- Views used by feeds
GRANT SELECT ON public.posts_public TO anon;
GRANT SELECT ON public.post_comments_public TO anon;

-- Security-definer RPCs anon needs to execute (these already mask anon authors)
GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_post_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_post_comments_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.search_posts(text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_hashtags(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_chat_author_names(uuid[]) TO anon;
