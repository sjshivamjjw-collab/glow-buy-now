ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_initiated';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_completed';