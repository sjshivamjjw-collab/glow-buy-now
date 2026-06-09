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
    // Demo/admin phones bypass Twilio and use fixed OTP "123456" (per user request).
    const DEV_PHONES = [
      "+911111111111",
      "+919619846170", // admin
      "+919821046171",
      "+919821046170",
      "+919082036638",
      "+918921046170",
      "+918921046171",
      "+919619836638",
      "+919999966666",
      "+910000000001",
      "+910000000002",
      "+910000000003",
      "+910000000004",
      "+910000000005",
      "+910000000006",
      "+910000000007",
      "+910000000008",
      "+910000000009",
      "+910000000010",
      "+910000000011",
      "+910000000012",
      "+910000000013",
      "+910000000014",
      "+910000000015",
      "+910000000016",
      "+910000000017",
      "+910000000018",
      "+910000000019",
      "+910000000020",
      "+910000000021",
      "+910000000022",
      "+910000000023",
      "+910000000024",
      "+910000000025",
      "+910000000026",
      "+910000000027",
      "+910000000028",
      "+910000000029",
      "+910000000030",
      "+910000000031",
      "+910000000032",
      "+910000000033",
      "+910000000034",
      "+910000000035",
      "+910000000036",
      "+910000000037",
      "+910000000038",
      "+910000000039",
      "+910000000040",
      "+917471660869",
      "+916584115104",
      "+917768739919",
    ];
    // Per-phone OTP overrides (default dev OTP is "123456")
    const DEV_PHONE_OTPS: Record<string, string> = {
      "+917471660869": "121212",
      "+917768739919": "000000",
    };
    const isDevPhone = DEV_PHONES.includes(normalizedPhone);

    const code = isDevPhone
      ? (DEV_PHONE_OTPS[normalizedPhone] ?? "123456")
      : String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

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
        Body: `Your Ripple verification code is: ${code}. Valid for 10 minutes.`,
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
