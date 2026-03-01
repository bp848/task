import { GwsKit } from 'gws-supabase-kit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const gws = new GwsKit({
  supabaseUrl,
  supabaseAnonKey,
});

// 全ファイルで gws.supabase を使う（lib/supabase.ts は不要）
export const supabase = gws.supabase;
