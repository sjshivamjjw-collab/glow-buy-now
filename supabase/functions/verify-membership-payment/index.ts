// Verifies a Razorpay payment and creates/activates a membership in one shot.
// Memberships are only ever created with status='active' here.
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
    const tier_id = String(body?.tier_id || '');
    const razorpay_payment_id = String(body?.razorpay_payment_id || '');
    const razorpay_order_id = String(body?.razorpay_order_id || '');
    const razorpay_signature = String(body?.razorpay_signature || '');
    if (!tier_id || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return json(400, { error: 'Missing fields' });
    }

    // Verify HMAC signature: hmac_sha256(order_id + "|" + payment_id, secret)
    const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      console.error('Signature mismatch');
      return json(400, { error: 'Invalid signature' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the Razorpay order was originally created for THIS user and THIS tier.
    // Without this check, an attacker could pay for a cheap tier and activate an expensive one.
    const { data: intent, error: piErr } = await admin
      .from('payment_intents')
      .select('user_id, tier_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (piErr || !intent) {
      console.error('payment_intent lookup failed', piErr);
      return json(400, { error: 'Unknown payment order' });
    }
    if (intent.user_id !== user.id || intent.tier_id !== tier_id) {
      console.error('payment intent mismatch', { intent, user_id: user.id, tier_id });
      return json(400, { error: 'Payment does not match selected plan' });
    }

    const { data: tier, error: tErr } = await admin
      .from('community_tiers')
      .select('id, community_id, kind, billing_period_months, is_active')
      .eq('id', tier_id)
      .maybeSingle();
    if (tErr || !tier) return json(404, { error: 'Tier not found' });
    if (!tier.is_active) return json(400, { error: 'Tier inactive' });
    if (tier.kind === 'free') return json(400, { error: 'Free tier does not need verification' });

    const now = new Date();
    let current_period_end: string | null = null;
    if (tier.kind === 'paid_monthly') {
      const months = Number(tier.billing_period_months || 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + months);
      current_period_end = end.toISOString();
    }

    const source = tier.kind === 'paid_monthly' ? 'razorpay_sub' : 'razorpay_order';

    // Upsert: if a membership row exists for this user+community (e.g. they
    // were on the free tier), update it to the new active paid tier.
    const { data: existing } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', tier.community_id)
      .maybeSingle();

    const payload = {
      tier_id: tier.id,
      status: 'active' as const,
      source,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id: null,
      started_at: now.toISOString(),
      current_period_end,
      cancelled_at: null,
      updated_at: now.toISOString(),
    };

    if (existing) {
      const { error: uErr } = await admin.from('memberships').update(payload).eq('id', existing.id);
      if (uErr) { console.error(uErr); return json(500, { error: 'Could not activate membership' }); }
    } else {
      const { error: iErr } = await admin.from('memberships').insert({
        user_id: user.id,
        community_id: tier.community_id,
        ...payload,
      });
      if (iErr) { console.error(iErr); return json(500, { error: 'Could not create membership' }); }
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
