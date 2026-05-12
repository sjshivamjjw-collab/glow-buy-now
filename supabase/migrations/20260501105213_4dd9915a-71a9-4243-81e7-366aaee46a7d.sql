-- Composite seller rating view
CREATE OR REPLACE VIEW public.seller_ratings AS
WITH order_stats AS (
  SELECT
    o.seller_id,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::numeric AS delivered_count,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::numeric AS cancelled_count,
    COUNT(*)::numeric AS total_count
  FROM public.orders o
  GROUP BY o.seller_id
),
return_stats AS (
  SELECT
    o.seller_id,
    COUNT(*)::numeric AS returned_count
  FROM public.return_requests rr
  JOIN public.orders o ON o.id = rr.order_id
  WHERE rr.status = 'approved'
  GROUP BY o.seller_id
)
SELECT
  os.seller_id,
  os.total_count::int AS total_orders,
  os.delivered_count::int AS delivered_orders,
  COALESCE(rs.returned_count, 0)::int AS returned_orders,
  os.cancelled_count::int AS cancelled_orders,
  ROUND(
    LEAST(5.0, GREATEST(0.0,
      (
        (CASE WHEN (os.delivered_count + os.cancelled_count + COALESCE(rs.returned_count, 0)) > 0
              THEN os.delivered_count / (os.delivered_count + os.cancelled_count + COALESCE(rs.returned_count, 0))
              ELSE 0.8 END) * 0.6
        +
        (CASE WHEN os.total_count > 0
              THEN 1 - (COALESCE(rs.returned_count, 0) / os.total_count)
              ELSE 0.8 END) * 0.3
        +
        LEAST(os.total_count / 50.0, 1.0) * 0.1
      ) * 5
    )),
    1
  ) AS rating
FROM order_stats os
LEFT JOIN return_stats rs ON rs.seller_id = os.seller_id;

GRANT SELECT ON public.seller_ratings TO anon, authenticated;