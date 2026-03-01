import { GwsKit } from 'gws-supabase-kit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const gws = new GwsKit({
  supabaseUrl,
  supabaseAnonKey,
});

export const supabase = gws.supabase;
