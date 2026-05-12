
-- New order -> notify seller
CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    NEW.seller_id,
    'order',
    'New order received',
    'You have a new order worth ₹' || NEW.total_amount::text || '.',
    '/order/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_new_order();

-- Order status change -> notify buyer
CREATE OR REPLACE FUNCTION public.notify_buyer_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
  v_msg text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_title := 'Order ' || NEW.status::text;
  v_msg := 'Your order is now ' || NEW.status::text || '.';

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (NEW.buyer_id, 'order', v_title, v_msg, '/order/' || NEW.id::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyer_order_status ON public.orders;
CREATE TRIGGER trg_notify_buyer_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_order_status();

-- New follower -> notify seller
CREATE OR REPLACE FUNCTION public.notify_seller_new_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_follower_name text;
BEGIN
  SELECT COALESCE(name, username, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    NEW.seller_id,
    'follow',
    'New follower',
    v_follower_name || ' started following you.',
    '/seller/' || NEW.seller_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_follower ON public.follows;
CREATE TRIGGER trg_notify_seller_new_follower
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_new_follower();

-- Seller application reviewed -> notify applicant
CREATE OR REPLACE FUNCTION public.notify_seller_application_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.user_id,
      'application',
      'You are now a seller!',
      'Your seller application has been approved. Start listing products.',
      '/products'
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.user_id,
      'application',
      'Seller application rejected',
      COALESCE(NEW.rejection_reason, 'Your seller application was not approved.'),
      '/become-seller'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_application_reviewed ON public.seller_applications;
CREATE TRIGGER trg_notify_seller_application_reviewed
AFTER UPDATE OF status ON public.seller_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_application_reviewed();

-- Cancellation request created -> notify seller
CREATE OR REPLACE FUNCTION public.notify_on_cancellation_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
  v_buyer_id uuid;
BEGIN
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM public.orders WHERE id = NEW.order_id;

  -- Notify the other party
  IF NEW.requested_by = v_buyer_id AND v_seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (v_seller_id, 'order', 'Cancellation requested',
            'A buyer requested to cancel an order.', '/order/' || NEW.order_id::text);
  ELSIF NEW.requested_by = v_seller_id AND v_buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (v_buyer_id, 'order', 'Seller requested cancellation',
            'The seller requested to cancel your order.', '/order/' || NEW.order_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_cancellation_request ON public.cancellation_requests;
CREATE TRIGGER trg_notify_on_cancellation_request
AFTER INSERT ON public.cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_cancellation_request();

-- Cancellation request reviewed -> notify requester
CREATE OR REPLACE FUNCTION public.notify_on_cancellation_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    NEW.requested_by,
    'order',
    'Cancellation ' || NEW.status,
    'Your cancellation request was ' || NEW.status || '.',
    '/order/' || NEW.order_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_cancellation_reviewed ON public.cancellation_requests;
CREATE TRIGGER trg_notify_on_cancellation_reviewed
AFTER UPDATE OF status ON public.cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_cancellation_reviewed();

-- Return request created -> notify seller
CREATE OR REPLACE FUNCTION public.notify_on_return_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT seller_id INTO v_seller_id FROM public.orders WHERE id = NEW.order_id;
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (v_seller_id, 'order', 'Return requested',
            'A buyer requested a return on an order.', '/order/' || NEW.order_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_return_request ON public.return_requests;
CREATE TRIGGER trg_notify_on_return_request
AFTER INSERT ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_return_request();

-- Return request reviewed -> notify requester
CREATE OR REPLACE FUNCTION public.notify_on_return_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    NEW.requested_by,
    'order',
    'Return ' || NEW.status,
    'Your return request was ' || NEW.status || '.',
    '/order/' || NEW.order_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_return_reviewed ON public.return_requests;
CREATE TRIGGER trg_notify_on_return_reviewed
AFTER UPDATE OF status ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_return_reviewed();
