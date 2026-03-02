/**
 * gws.ts
 *
 * Google Workspace (Calendar / Gmail / Drive) + Gemini AI
 * Supabase Edge Function 経由のトークン管理 + Google ログインボタン
 *
 * 使い方:
 *   import { gws, GoogleLoginButton, useGoogleAuthCallback } from "@/lib/gws";
 *
 * 必要な環境変数 (.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   VITE_GOOGLE_CLIENT_ID
 *   VITE_GOOGLE_REDIRECT_URI
 */

import React, { useState, useCallback, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Supabase クライアント
// ============================================================

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ============================================================
// 定数
// ============================================================

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Supabase Edge Function を呼び出すヘルパー
 */
export async function callEdgeFunction(
  name: string,
  options?: { body?: Record<string, unknown> }
): Promise<any> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error("Supabase にログインしていません");

  const res = await fetch(`${EDGE_BASE}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error ?? `Edge Function ${name} failed`), {
      code: err?.code,
      reauthenticate: err?.reauthenticate,
    });
  }

  return res.json();
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string;

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly",
];

// ============================================================
// PKCE helpers
// ============================================================

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ============================================================
// Token Service (access_token 取得・キャッシュ)
// ============================================================

class GoogleTokenService {
  private cachedToken: string | null = null;
  private expiresAt = 0;

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.expiresAt - 60_000) {
      return this.cachedToken;
    }

    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) throw new Error("Supabase にログインしていません");

    const res = await fetch(`${EDGE_BASE}/get-google-token`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = Object.assign(new Error(err?.error ?? "トークン取得失敗"), {
        code: err?.code,
        reauthenticate: err?.reauthenticate,
      });
      throw error;
    }

    const { access_token, expires_in } = await res.json();
    this.cachedToken = access_token;
    this.expiresAt = Date.now() + expires_in * 1000;
    return access_token;
  }

  clearCache() {
    this.cachedToken = null;
    this.expiresAt = 0;
  }
}

// ============================================================
// Calendar Service
// ============================================================

const CAL_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  status?: string;
  htmlLink?: string;
}

class GoogleCalendarService {
  constructor(private getToken: () => Promise<string>) {}

  private async fetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${CAL_BASE}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Calendar ${res.status}: ${e?.error?.message ?? res.statusText}`);
    }
    return res.json();
  }

  async listEvents(opts: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}): Promise<CalendarEvent[]> {
    const { calendarId = "primary", timeMin = new Date().toISOString(), timeMax, maxResults = 10 } = opts;
    const q = new URLSearchParams({ timeMin, maxResults: String(maxResults), orderBy: "startTime", singleEvents: "true" });
    if (timeMax) q.set("timeMax", timeMax);
    const data = await this.fetch<{ items?: CalendarEvent[] }>(`/calendars/${encodeURIComponent(calendarId)}/events?${q}`);
    return data.items ?? [];
  }

  async createEvent(event: CalendarEvent, calendarId = "primary"): Promise<CalendarEvent> {
    return this.fetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST", body: JSON.stringify(event),
    });
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId = "primary"): Promise<CalendarEvent> {
    return this.fetch(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "PATCH", body: JSON.stringify(event),
    });
  }

  async deleteEvent(eventId: string, calendarId = "primary"): Promise<void> {
    const token = await this.getToken();
    await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
  }
}

// ============================================================
// Gmail Service
// ============================================================

const GMAIL_BASE = "https://www.googleapis.com/gmail/v1/users/me";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

class GoogleGmailService {
  constructor(private getToken: () => Promise<string>) {}

  private async fetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${GMAIL_BASE}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async listMessages(opts: { maxResults?: number; q?: string; labelIds?: string[] } = {}): Promise<GmailMessage[]> {
    const { maxResults = 10, q, labelIds } = opts;
    const query = new URLSearchParams({ maxResults: String(maxResults) });
    if (q) query.set("q", q);
    if (labelIds?.length) labelIds.forEach((id) => query.append("labelIds", id));

    const list = await this.fetch<{ messages?: Array<{ id: string }> }>(`/messages?${query}`);
    if (!list.messages?.length) return [];
    return Promise.all(list.messages.map((m) => this.getMessage(m.id)));
  }

  async getMessage(id: string): Promise<GmailMessage> {
    const data = await this.fetch<{
      id: string; threadId: string; snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string } }> };
    }>(`/messages/${id}?format=full`);

    const h = data.payload?.headers ?? [];
    const hdr = (name: string) => h.find((x) => x.name.toLowerCase() === name)?.value;
    const rawBody = data.payload?.parts?.find((p) => p.mimeType === "text/plain")?.body?.data ?? data.payload?.body?.data;
    const body = rawBody ? atob(rawBody.replace(/-/g, "+").replace(/_/g, "/")) : "";

    return { id: data.id, threadId: data.threadId, subject: hdr("subject"), from: hdr("from"), to: hdr("to"), date: hdr("date"), snippet: data.snippet, body };
  }

  async sendMessage(opts: { to: string; subject: string; body: string; isHtml?: boolean }): Promise<void> {
    const { to, subject, body, isHtml = false } = opts;
    const raw = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`, "", body].join("\r\n");
    const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    await this.fetch("/messages/send", { method: "POST", body: JSON.stringify({ raw: encoded }) });
  }
}

// ============================================================
// Drive Service
// ============================================================

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string; name: string; mimeType: string;
  modifiedTime?: string; size?: string; webViewLink?: string;
}

class GoogleDriveService {
  constructor(private getToken: () => Promise<string>) {}

  private async fetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${DRIVE_BASE}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) throw new Error(`Drive ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async listFiles(opts: { maxResults?: number; q?: string; orderBy?: string } = {}): Promise<DriveFile[]> {
    const { maxResults = 20, q, orderBy = "modifiedTime desc" } = opts;
    const query = new URLSearchParams({ pageSize: String(maxResults), orderBy, fields: "files(id,name,mimeType,modifiedTime,size,webViewLink)" });
    if (q) query.set("q", q);
    const data = await this.fetch<{ files?: DriveFile[] }>(`/files?${query}`);
    return data.files ?? [];
  }

  async searchFiles(keyword: string): Promise<DriveFile[]> {
    return this.listFiles({ q: `name contains '${keyword.replace(/'/g, "\\'")}' and trashed = false` });
  }

  async getFileContent(fileId: string): Promise<string> {
    const token = await this.getToken();
    const res = await fetch(`${DRIVE_BASE}/files/${fileId}/export?mimeType=text/plain`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const res2 = await fetch(`${DRIVE_BASE}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      return res2.text();
    }
    return res.text();
  }
}

// ============================================================
// Gemini Service
// ============================================================

export interface GeminiMessage { role: "user" | "model"; parts: Array<{ text: string }> }

class GeminiService {
  async chat(messages: GeminiMessage[], opts: { model?: string; systemInstruction?: string } = {}): Promise<string> {
    const { model = "gemini-2.0-flash", systemInstruction } = opts;

    const body: Record<string, unknown> = { model, contents: messages };
    if (systemInstruction) body.config = { systemInstruction };

    const res = await fetch(`${EDGE_BASE}/gemini-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  }

  async complete(prompt: string, opts?: { model?: string; systemInstruction?: string }): Promise<string> {
    return this.chat([{ role: "user", parts: [{ text: prompt }] }], opts);
  }
}

// ============================================================
// GwsKit — メインクラス
// ============================================================

class GwsKit {
  readonly token: GoogleTokenService;
  readonly calendar: GoogleCalendarService;
  readonly gmail: GoogleGmailService;
  readonly drive: GoogleDriveService;
  readonly gemini: GeminiService;

  get exchangeCodeUrl() { return `${EDGE_BASE}/exchange-google-code`; }

  constructor() {
    this.token = new GoogleTokenService();
    const getToken = () => this.token.getAccessToken();
    this.calendar = new GoogleCalendarService(getToken);
    this.gmail = new GoogleGmailService(getToken);
    this.drive = new GoogleDriveService(getToken);
    this.gemini = new GeminiService();
  }
}

/** シングルトンインスタンス */
export const gws = new GwsKit();

// ============================================================
// Google ログイン React コンポーネント
// ============================================================

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#4caf50" />
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: "gws-spin 0.8s linear infinite" }} aria-hidden="true">
      <style>{`@keyframes gws-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export interface GoogleLoginButtonProps {
  /** ボタンラベル (デフォルト: "Google でログイン") */
  label?: string;
  /** 接続済み時のラベル */
  connectedLabel?: string;
  /** 初期接続状態 */
  defaultConnected?: boolean;
  /** スコープ (省略時: Calendar + Gmail + Drive) */
  scopes?: string[];
  /** variant */
  variant?: "default" | "outline" | "minimal";
  /** 成功コールバック */
  onSuccess?: () => void;
  /** エラーコールバック */
  onError?: (error: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function GoogleLoginButton({
  label = "Google でログイン",
  connectedLabel = "Google 連携済み",
  defaultConnected = false,
  scopes = DEFAULT_SCOPES,
  variant = "default",
  onSuccess,
  onError,
  style,
  className,
}: GoogleLoginButtonProps) {
  const [isConnected, setIsConnected] = useState(defaultConnected);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (isConnected || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      sessionStorage.setItem("gws_code_verifier", verifier);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        code_challenge: challenge,
        code_challenge_method: "S256",
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OAuth 開始失敗";
      setError(msg);
      setIsLoading(false);
      onError?.(msg);
    }
  }, [isConnected, isLoading, scopes, onError]);

  const variantStyle: React.CSSProperties =
    variant === "outline"
      ? { background: "transparent", color: isConnected ? "#2e7d32" : "#1a73e8", border: `2px solid ${isConnected ? "#4caf50" : "#1a73e8"}` }
      : variant === "minimal"
      ? { background: "transparent", color: isConnected ? "#2e7d32" : "#5f6368", padding: "8px 12px" }
      : { background: isConnected ? "#e8f5e9" : "#fff", color: isConnected ? "#2e7d32" : "#3c4043", border: "1px solid #dadce0", boxShadow: isConnected ? "none" : "0 1px 3px rgba(0,0,0,0.12)" };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "6px" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isConnected || isLoading}
        aria-busy={isLoading}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
          padding: "10px 20px", borderRadius: "8px", fontSize: "15px", fontWeight: 500,
          fontFamily: "inherit", cursor: isConnected ? "default" : isLoading ? "wait" : "pointer",
          transition: "all 0.15s ease", outline: "none", userSelect: "none", whiteSpace: "nowrap",
          ...variantStyle, ...style,
        }}
      >
        {isLoading ? <Spinner /> : isConnected ? <CheckIcon /> : <GoogleIcon />}
        <span>{isConnected ? connectedLabel : label}</span>
      </button>
      {error && <p role="alert" style={{ margin: 0, fontSize: "12px", color: "#d93025" }}>⚠ {error}</p>}
    </div>
  );
}

// ============================================================
// useGoogleAuthCallback — コールバックページ用フック
// ============================================================

export function useGoogleAuthCallback(opts: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const jwt = data.session?.access_token;
      if (!jwt) throw new Error("Supabase にログインしていません");

      const codeVerifier = sessionStorage.getItem("gws_code_verifier");
      sessionStorage.removeItem("gws_code_verifier");

      const body: Record<string, string> = { code, redirect_uri: GOOGLE_REDIRECT_URI };
      if (codeVerifier) body.code_verifier = codeVerifier;

      const res = await fetch(`${EDGE_BASE}/exchange-google-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Token exchange failed");

      setIsComplete(true);
      opts.onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "認証失敗";
      setError(msg);
      opts.onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  }, [opts]);

  // URL に code があれば自動実行
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) handleCode(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleCode, isLoading, error, isComplete };
}
