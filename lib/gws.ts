import { GwsKit } from 'gws-supabase-kit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const gws = new GwsKit({
  supabaseUrl,
  supabaseAnonKey,
});

export const supabase = gws.supabase;

/**
 * 既存のSupabase Edge Functionを直接呼ぶ（gws-supabase-kitのトークンサービスをバイパス）
 */
export async function callEdgeFunction(name: string, options?: { method?: string; body?: Record<string, unknown> }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw Object.assign(new Error('No session'), { code: 'NO_SESSION' });

  const url = `${supabaseUrl}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: options?.method || 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(err.error || `Edge Function error ${res.status}`),
      { status: res.status, code: err.code, reauthenticate: err.reauthenticate }
    );
  }

  return res.json();
}
