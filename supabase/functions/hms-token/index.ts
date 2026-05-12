// 100ms livestream helper edge function.
//
// Two actions, both POST:
//
// 1. action: "create-room"
//    Body: { livestreamId: string }
//    - Caller must be the owner (seller_id) of the livestream row
//    - Creates a 100ms room (or reuses the one already saved on the row)
//    - Persists hms_room_id back on the livestreams row
//    - Returns: { roomId, authToken } where authToken lets the seller join as broadcaster
//
// 2. action: "viewer-token"
//    Body: { livestreamId: string }
//    - Anyone authenticated can request this
//    - Looks up hms_room_id from the livestreams row (must already exist + be live)
//    - Returns: { roomId, authToken } where authToken lets caller join as viewer
//
// All 100ms management API calls are signed server-side using HMS_ACCESS_KEY + HMS_APP_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HMS_API_BASE = "https://api.100ms.live/v2";

// ---------- Helpers ----------

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** 100ms management token — used for server -> 100ms admin API calls. */
async function buildManagementToken(
  accessKey: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const now = getNumericDate(0);
  const payload = {
    access_key: accessKey,
    type: "management",
    version: 2,
    iat: now,
    nbf: now,
    exp: now + 60 * 60, // 1h is plenty
    jti: crypto.randomUUID(),
  };
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

/** 100ms app/auth token — used by browser to join a room as a given role. */
async function buildAppToken(
  accessKey: string,
  secret: string,
  roomId: string,
  userId: string,
  role: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const now = getNumericDate(0);
  const payload = {
    access_key: accessKey,
    type: "app",
    version: 2,
    room_id: roomId,
    user_id: userId,
    role,
    iat: now,
    nbf: now,
    exp: now + 60 * 60 * 24, // 24h
    jti: crypto.randomUUID(),
  };
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

async function createHmsRoom(
  managementToken: string,
  templateId: string,
  name: string,
): Promise<string> {
  const res = await fetch(`${HMS_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name.slice(0, 100),
      template_id: templateId,
      description: "Ripple livestream",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`100ms room create failed [${res.status}]: ${txt}`);
  }
  const data = await res.json();
  return data.id as string;
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const HMS_ACCESS_KEY = Deno.env.get("HMS_ACCESS_KEY");
    const HMS_APP_SECRET = Deno.env.get("HMS_APP_SECRET");
    const HMS_TEMPLATE_ID = Deno.env.get("HMS_TEMPLATE_ID");
    if (!HMS_ACCESS_KEY || !HMS_APP_SECRET || !HMS_TEMPLATE_ID) {
      return new Response(
        JSON.stringify({ error: "100ms credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const livestreamId = body?.livestreamId;
    if (!livestreamId || typeof livestreamId !== "string") {
      return new Response(JSON.stringify({ error: "livestreamId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for admin reads/writes on livestreams (RLS still allows
    // owner-update via JWT, but service role keeps this independent of policies).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: stream, error: streamErr } = await admin
      .from("livestreams")
      .select("id, seller_id, title, hms_room_id, status")
      .eq("id", livestreamId)
      .maybeSingle();

    if (streamErr || !stream) {
      return new Response(JSON.stringify({ error: "Livestream not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-room") {
      if (stream.seller_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Only the seller can start this stream" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let roomId = stream.hms_room_id as string | null;
      if (!roomId) {
        const mgmt = await buildManagementToken(HMS_ACCESS_KEY, HMS_APP_SECRET);
        roomId = await createHmsRoom(
          mgmt,
          HMS_TEMPLATE_ID,
          `livecart-${livestreamId}`,
        );
        await admin
          .from("livestreams")
          .update({ hms_room_id: roomId })
          .eq("id", livestreamId);
      }

      const authToken = await buildAppToken(
        HMS_ACCESS_KEY,
        HMS_APP_SECRET,
        roomId,
        userId,
        "broadcaster",
      );

      return new Response(
        JSON.stringify({ roomId, authToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "viewer-token") {
      if (!stream.hms_room_id) {
        return new Response(
          JSON.stringify({ error: "Stream is not live yet" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const authToken = await buildAppToken(
        HMS_ACCESS_KEY,
        HMS_APP_SECRET,
        stream.hms_room_id,
        userId,
        "viewer-realtime",
      );
      return new Response(
        JSON.stringify({ roomId: stream.hms_room_id, authToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hms-token error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
