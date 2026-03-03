// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";
import { encrypt } from "../_shared/crypto.ts";

declare const Deno: any;

/**
 * exchange-google-code
 *
 * 1. Validates Supabase JWT
 * 2. Exchanges Google OAuth code for refresh_token
 * 3. Encrypts refresh_token with AES-256-GCM before storing in DB
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   TOKEN_ENCRYPTION_KEY  (32-byte base64: openssl rand -base64 32)
 *   ALLOWED_ORIGIN  (comma-separated for multiple origins)
 */

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "*").split(",").map((s: string) => s.trim());

function getCors(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*"
    : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), { status, headers: getCors(req) });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCors(req) });

  try {
    // 1. JWT validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized", code: "NO_AUTH_HEADER" }, 401, req);
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return json({ error: "Invalid session", code: "INVALID_SESSION" }, 401, req);
    }

    // 2. Parse body
    let body: { code?: string; redirect_uri?: string; code_verifier?: string } = {};
    try { body = await req.json(); } catch {
      return json({ error: "Invalid JSON body", code: "INVALID_BODY" }, 400, req);
    }

    const code = body.code?.trim();
    if (!code) return json({ error: "code is required", code: "MISSING_CODE" }, 400, req);

    const redirectUri = body.redirect_uri?.trim() || Deno.env.get("GOOGLE_REDIRECT_URI") || "";
    if (!redirectUri) return json({ error: "redirect_uri required", code: "MISSING_REDIRECT_URI" }, 400, req);

    // 3. Exchange code for tokens with Google
    const tokenParams = new URLSearchParams({
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  redirectUri,
    });
    if (body.code_verifier) tokenParams.append("code_verifier", body.code_verifier.trim());

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    if (!tokenRes.ok) {
      console.error("Google token error:", await tokenRes.text());
      return json({ error: "Google token exchange failed", code: "GOOGLE_TOKEN_FAILED", reauthenticate: true }, 400, req);
    }

    const { refresh_token: refreshToken } = await tokenRes.json();
    if (!refreshToken) {
      return json({ error: "Google did not return refresh_token. Ensure prompt=consent.", code: "NO_REFRESH_TOKEN", reauthenticate: true }, 400, req);
    }

    // 4. Encrypt refresh_token with AES-256-GCM before storing
    let encryptedToken: string;
    try {
      encryptedToken = await encrypt(refreshToken);
    } catch (e: any) {
      console.error("Encryption error:", e?.message);
      return json({ error: "Token encryption failed. Check TOKEN_ENCRYPTION_KEY secret.", code: "ENCRYPT_FAILED" }, 500, req);
    }

    // 5. Upsert encrypted token to DB
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertErr } = await serviceClient
      .from("user_google_tokens")
      .upsert({ user_id: user.id, refresh_token: encryptedToken, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("Upsert failed:", upsertErr);
      return json({ error: "Failed to save token", code: "UPSERT_FAILED" }, 500, req);
    }

    return json({ ok: true }, 200, req);

  } catch (e: any) {
    console.error("exchange-google-code error:", e?.message || e);
    return json({ error: "Internal server error", code: "UNHANDLED" }, 500, req);
  }
});
