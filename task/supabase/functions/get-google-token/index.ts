// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

declare const Deno: any;

/**
 * get-google-token
 *
 * 1. Validates Supabase JWT
 * 2. Fetches encrypted refresh_token from DB
 * 3. Decrypts with AES-256-GCM
 * 4. Exchanges with Google for a fresh access_token
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   TOKEN_ENCRYPTION_KEY  (same key used in exchange-google-code)
 *   ALLOWED_ORIGIN  (comma-separated for multiple origins)
 */

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*").split(",").map((s: string) => s.trim());

function getCors(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*"
    : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), { status, headers: getCors(req) });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCors(req) });

  try {
    // 1. JWT validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization header" }, 401, req);
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return json({ error: "Invalid user session" }, 401, req);
    }

    // 2. Fetch encrypted refresh_token from DB
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await service
      .from("user_google_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .single();

    if (error || !data?.refresh_token) {
      return json({ error: "No Google token found. Please connect Google.", code: "NO_REFRESH_TOKEN" }, 409, req);
    }

    // 3. Decrypt AES-256-GCM encrypted token
    let refreshToken: string;
    try {
      refreshToken = await decrypt(data.refresh_token);
    } catch (e: any) {
      console.error("Decryption error:", e?.message);
      return json({ error: "Token decryption failed. Check TOKEN_ENCRYPTION_KEY.", code: "DECRYPT_FAILED" }, 500, req);
    }

    // 4. Exchange refresh_token for access_token with Google
    const params = new URLSearchParams({
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    });

    const googleRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const googleJson = await googleRes.json();

    if (!googleRes.ok) {
      return json({ error: "Failed to refresh Google token", detail: googleJson?.error, reauthenticate: true }, 401, req);
    }

    return json({ access_token: googleJson.access_token, expires_in: googleJson.expires_in }, 200, req);

  } catch (err) {
    console.error("get-google-token error:", err);
    return json({ error: "Internal server error" }, 500, req);
  }
});
