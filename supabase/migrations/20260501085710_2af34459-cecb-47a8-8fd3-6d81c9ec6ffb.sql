-- Livestream status enum
CREATE TYPE public.livestream_status AS ENUM ('scheduled', 'live', 'ended');

CREATE TABLE public.livestreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status livestream_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  product_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

-- Anyone can view scheduled or live streams (public discovery)
CREATE POLICY "Anyone can view livestreams"
  ON public.livestreams FOR SELECT
  USING (true);

-- Sellers can create their own streams
CREATE POLICY "Sellers can create livestreams"
  ON public.livestreams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

-- Sellers can update their own streams
CREATE POLICY "Sellers can update own livestreams"
  ON public.livestreams FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Sellers can delete their own streams
CREATE POLICY "Sellers can delete own livestreams"
  ON public.livestreams FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Admins can update any livestream (e.g. moderate)
CREATE POLICY "Admins can update all livestreams"
  ON public.livestreams FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_livestreams_updated_at
  BEFORE UPDATE ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_livestreams_seller ON public.livestreams(seller_id);
CREATE INDEX idx_livestreams_status ON public.livestreams(status);
CREATE INDEX idx_livestreams_scheduled_at ON public.livestreams(scheduled_at);