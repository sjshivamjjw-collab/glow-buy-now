ALTER TABLE public.livestreams ADD COLUMN IF NOT EXISTS featured_product_id uuid;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestreams;
ALTER TABLE public.livestreams REPLICA IDENTITY FULL;