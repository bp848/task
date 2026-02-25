import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://baguoeszmjwwvdpqrkdu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ3VvZXN6bWp3d3ZkcHFya2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDgyNzMsImV4cCI6MjA3NDI4NDI3M30.hJtGAgvsOe-N7R-U-NL1ED-7JoIB805c6OOSJdipGzY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
