import { createClient } from '@supabase/supabase-js';

// Provided Supabase configuration for ZARU ENTERPRISE
const DEFAULT_SUPABASE_URL = 'https://civsvienryfifmxfgbtt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdnN2aWVucnlmaWZteGZnYnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTkzMTIsImV4cCI6MjEwNjA5NTMxMn0.12_yGSmW60fytoDNWHPkFI3qU4Z5jhCUYS8k4IyU6sU';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

/**
 * Supabase client instance with auto-refresh and session persistence.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Health check helper to test database connectivity.
 */
export const testSupabaseConnection = async (): Promise<{ ok: boolean; message: string; count?: number }> => {
  try {
    const { data, error } = await supabase.from('site_settings').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Connected to Supabase PostgreSQL', count: data?.length };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
};
