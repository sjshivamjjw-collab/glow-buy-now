import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Phone and code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find latest unused OTP for this phone
    const { data: otpRecord, error: fetchErr } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", normalizedPhone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as verified
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    const fakeEmail = `${normalizedPhone.replace("+", "")}@phone.livecart.app`;

    // Generate a fresh, cryptographically random password each login.
    const genPassword = () => {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    const newPassword = genPassword();

    let userId: string;
    let isNewUser = false;

    // Try to create user first; if exists, look them up
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: fakeEmail,
      password: newPassword,
      phone: normalizedPhone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone: normalizedPhone },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered") || createErr.message?.includes("already exists")) {
        // User exists — look them up via auth admin by email
        let foundUserId: string | null = null;
        const phoneVariants = [normalizedPhone, normalizedPhone.replace("+", "")];

        // Try profiles table first (fast path)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .in("phone", phoneVariants)
          .maybeSingle();

        if (existingProfile) {
          foundUserId = existingProfile.id;
        } else {
          // Fallback: page through auth users to find by email
          for (let page = 1; page <= 20 && !foundUserId; page++) {
            const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
            if (listErr) break;
            const match = list.users.find((u) => u.email === fakeEmail || u.phone === normalizedPhone || u.phone === normalizedPhone.replace("+", ""));
            if (match) foundUserId = match.id;
            if (!list.users.length || list.users.length < 200) break;
          }
        }

        if (!foundUserId) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = foundUserId;

        // Ensure profile row exists so future logins use the fast path
        await supabase.from("profiles").upsert(
          { id: userId, phone: normalizedPhone },
          { onConflict: "id" }
        );

        // Rotate password to a fresh random value for this login
        await supabase.auth.admin.updateUserById(userId, { password: newPassword, email: fakeEmail });
      } else {
        console.error("Create user error:", createErr);
        return new Response(JSON.stringify({ error: "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user.id;
      isNewUser = true;
    }

    // Generate a real Supabase session via signInWithPassword using a service-level client
    // We use a separate client with the anon key to get a proper session
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: fakeEmail,
      password: newPassword,
    });

    if (signInErr) {
      console.error("Sign in error:", signInErr);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = roles?.map((r) => r.role) || ["shopper"];

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        roles: userRoles,
        profile,
        session: {
          access_token: signInData.session?.access_token,
          refresh_token: signInData.session?.refresh_token,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});