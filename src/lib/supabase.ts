import { createClient } from '@supabase/supabase-js';

// User's configured Supabase project for ZARU ENTERPRISE
const DEFAULT_SUPABASE_URL = 'https://jzyhyaukweojueihvwtz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eWh5YXVrd2VvanVlaWh2d3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDQ1NjAsImV4cCI6MjEwNjEyMDU2MH0.5iQbZ5O3Ooi-Yk5LwJU8gGTpIosMGVz9_TyOSE1esfk';

// Helper to sanitize project URL in case /rest/v1 or trailing slash was included
const sanitizeSupabaseUrl = (url: string): string => {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
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
