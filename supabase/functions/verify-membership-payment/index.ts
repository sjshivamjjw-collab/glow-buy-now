// Verifies a Razorpay payment for a community membership and activates it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) return json(503, { error: 'Payments not configured' });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Unauthorized' });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: 'Unauthorized' });

    const body = await req.json().catch(() => ({}));
    const membership_id = String(body?.membership_id || '');
    const razorpay_payment_id = String(body?.razorpay_payment_id || '');
    const razorpay_order_id = String(body?.razorpay_order_id || '');
    const razorpay_signature = String(body?.razorpay_signature || '');
    if (!membership_id || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return json(400, { error: 'Missing fields' });
    }

    // Verify HMAC signature: hmac_sha256(order_id + "|" + payment_id, secret)
    const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      console.error('Signature mismatch', { expected, got: razorpay_signature });
      return json(400, { error: 'Invalid signature' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: membership, error: mErr } = await admin
      .from('memberships')
      .select('id, user_id, tier_id, razorpay_order_id, community_tiers:tier_id(kind, billing_period_months)')
      .eq('id', membership_id)
      .maybeSingle();
    if (mErr || !membership) return json(404, { error: 'Membership not found' });
    if (membership.user_id !== user.id) return json(403, { error: 'Forbidden' });
    if (membership.razorpay_order_id && membership.razorpay_order_id !== razorpay_order_id) {
      return json(400, { error: 'Order mismatch' });
    }

    const tier = membership.community_tiers as any;
    const now = new Date();
    let current_period_end: string | null = null;
    if (tier?.kind === 'paid_monthly') {
      const months = Number(tier.billing_period_months || 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + months);
      current_period_end = end.toISOString();
    }

    const { error: uErr } = await admin.from('memberships').update({
      status: 'active',
      source: tier?.kind === 'paid_monthly' ? 'razorpay_sub' : 'razorpay_order',
      razorpay_payment_id,
      razorpay_order_id,
      started_at: now.toISOString(),
      current_period_end,
      updated_at: now.toISOString(),
    }).eq('id', membership_id);
    if (uErr) { console.error(uErr); return json(500, { error: 'Could not activate membership' }); }

    return json(200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
