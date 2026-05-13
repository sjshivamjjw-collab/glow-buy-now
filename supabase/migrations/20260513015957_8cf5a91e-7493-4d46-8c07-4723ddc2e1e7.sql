CREATE TYPE public.dispute_status AS ENUM ('open', 'resolved', 'rejected');

CREATE TABLE public.membership_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL,
  user_id uuid NOT NULL,
  community_id uuid NOT NULL,
  reason text NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own disputes"
ON public.membership_disputes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users view own disputes"
ON public.membership_disputes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all disputes"
ON public.membership_disputes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update disputes"
ON public.membership_disputes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_membership_disputes_updated_at
BEFORE UPDATE ON public.membership_disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_membership_disputes_user ON public.membership_disputes(user_id);
CREATE INDEX idx_membership_disputes_status ON public.membership_disputes(status);

-- Notify user when dispute resolved
CREATE OR REPLACE FUNCTION public.notify_dispute_resolved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.status IN ('resolved','rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (NEW.user_id, 'membership',
      'Dispute ' || NEW.status::text,
      COALESCE(NEW.admin_notes, 'Your subscription dispute has been ' || NEW.status::text || '.'),
      '/subscriptions');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dispute_resolved
AFTER UPDATE ON public.membership_disputes
FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_resolved();