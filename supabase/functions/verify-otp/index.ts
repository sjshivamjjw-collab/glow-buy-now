import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;
const DEMO_PHONES = new Set([
  "+918921046170",
  "+918921046171",
  "+919082036638",
  "+919619836638",
  "+919999966666",
  "+911111111111",
  "+919821046171",
  "+919821046170",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Phone and 6-digit code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find latest unused, unexpired OTP for this phone (regardless of code)
    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", normalizedPhone)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((otpRecord.attempt_count ?? 0) >= MAX_ATTEMPTS) {
      // Lock this OTP so further guesses are useless until a new one is requested
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);
      return new Response(JSON.stringify({ error: "Too many failed attempts. Please request a new code." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otpRecord.code !== code) {
      await supabase
        .from("otp_codes")
        .update({ attempt_count: (otpRecord.attempt_count ?? 0) + 1 })
        .eq("id", otpRecord.id);
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
        let foundUserId: string | null = null;
        const phoneVariants = [normalizedPhone, normalizedPhone.replace("+", "")];

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .in("phone", phoneVariants)
          .maybeSingle();

        if (existingProfile) {
          foundUserId = existingProfile.id;
        } else {
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
    }

    const isDemoPhone = DEMO_PHONES.has(normalizedPhone);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, name, username, avatar_url, onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        phone: normalizedPhone,
        onboarding_completed: isDemoPhone ? true : existingProfile?.onboarding_completed ?? false,
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      console.error("Profile upsert error:", profileErr);
      return new Response(JSON.stringify({ error: "Failed to prepare user profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "shopper" }, { onConflict: "user_id,role" });

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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = roles?.map((r) => r.role) || ["shopper"];

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
