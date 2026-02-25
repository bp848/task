/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// bp-erp Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rwjhpfghhgstvplmggks.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3amhwZmdoaGdzdHZwbG1nZ2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDgzNDYsImV4cCI6MjA3NDI4NDM0Nn0.RfCRooN6YVTHJ2Mw-xFCWus3wUVMLkJCLSitB8TNiIo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
