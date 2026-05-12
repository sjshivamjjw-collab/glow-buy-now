ALTER TABLE public.livestreams
ADD COLUMN IF NOT EXISTS hms_room_id text;