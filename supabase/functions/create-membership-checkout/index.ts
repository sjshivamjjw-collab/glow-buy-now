// Creates a Razorpay order for a community tier. No membership row is created
// here — the membership is inserted with status='active' only after
// verify-membership-payment confirms the Razorpay signature.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return json(503, { error: 'Payments are not configured.' });
    }

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
    if (!tier_id) return json(400, { error: 'tier_id required' });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tier, error: tErr } = await admin
      .from('community_tiers')
      .select('id, community_id, kind, price_inr, is_active, name')
      .eq('id', tier_id)
      .maybeSingle();
    if (tErr || !tier) return json(404, { error: 'Tier not found' });
    if (!tier.is_active) return json(400, { error: 'Tier inactive' });
    if (tier.kind === 'free') return json(400, { error: 'Free tier does not need checkout' });
    const amount = Number(tier.price_inr || 0);
    if (!amount || amount <= 0) return json(400, { error: 'Tier has no price' });

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `mem_${tier.id.slice(0, 8)}_${Date.now()}`,
        notes: { tier_id, user_id: user.id, community_id: tier.community_id },
      }),
    });
    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order error', rzpData);
      return json(502, { error: 'Failed to create payment order' });
    }

    return json(200, {
      order_id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      key_id: RAZORPAY_KEY_ID,
      tier_id,
    });
  } catch (e) {
    console.error(e);
    return json(500, { error: 'Internal error' });
  }
});
