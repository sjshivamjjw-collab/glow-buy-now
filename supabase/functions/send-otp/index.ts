import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone: ensure E.164 format
    const normalizedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    // Dev mode: known test numbers use fixed OTP "123456" and skip Twilio
    const DEV_PHONES = ["+911111111111", "+919619846170", "+919821046171", "+919821046170", "+919082036638"];
    const isDevPhone = DEV_PHONES.includes(normalizedPhone);

    const code = isDevPhone ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Store OTP
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from("otp_codes").insert({
      phone: normalizedPhone,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip Twilio for dev phones
    if (isDevPhone) {
      console.log(`DEV MODE: OTP for ${normalizedPhone} is ${code}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: `Your Ripple verification code is: ${code}. Valid for 5 minutes.`,
      }),
    });

    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error("Twilio error:", JSON.stringify(twilioData));

      // Check if this is a trial account limitation (unverified number)
      const isTrial = twilioData?.code === 21608;
      if (isTrial) {
        // Fallback: store OTP anyway so user can still log in during development
        // The OTP was already stored above, so just return success with a dev flag
        console.log(`TRIAL FALLBACK: OTP for ${normalizedPhone} is ${code}. SMS not sent (unverified number on trial account).`);
        return new Response(JSON.stringify({ 
          success: true, 
          dev_fallback: true,
          message: "SMS could not be sent (trial account). Check function logs for OTP code." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to send SMS. Please try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
