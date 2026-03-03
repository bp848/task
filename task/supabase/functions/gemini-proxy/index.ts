// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: any;

/**
 * gemini-proxy
 *
 * Proxies requests to the Gemini API.
 * Requires valid Supabase JWT — unauthenticated requests are rejected.
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 *   GEMINI_API_KEY
 *   ALLOWED_ORIGIN
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
    // ── JWT validation (added) ───────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized: missing Bearer token", code: "NO_AUTH_HEADER" }, 401, req);
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return json({ error: "Unauthorized: invalid or expired session", code: "INVALID_SESSION" }, 401, req);
    }

    // ── Gemini API key check ─────────────────────────────────
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json({ error: "Server misconfiguration: missing GEMINI_API_KEY" }, 500, req);
    }

    // ── Parse and validate payload ───────────────────────────
    let payload: {
      model?: string;
      contents?: unknown[];
      config?: {
        systemInstruction?: string;
        tools?: unknown[];
        thinkingConfig?: unknown;
      };
    };

    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, req);
    }

    const { model, contents = [], config = {} } = payload;
    if (!model) return json({ error: "Missing model" }, 400, req);

    // ── Build Gemini request body ────────────────────────────
    const requestBody: Record<string, unknown> = { contents };

    if (config.systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    }
    if (Array.isArray(config.tools) && config.tools.length > 0) {
      requestBody.tools = config.tools;
    }
    if (config.thinkingConfig) {
      requestBody.generationConfig = { thinkingConfig: config.thinkingConfig };
    }

    // ── Forward to Gemini ────────────────────────────────────
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const text = await geminiRes.text();
    return new Response(text, {
      status: geminiRes.status,
      headers: getCors(req),
    });

  } catch (error) {
    console.error("[gemini-proxy] Error:", error);
    return json({ error: "Internal server error" }, 500, req);
  }
});
