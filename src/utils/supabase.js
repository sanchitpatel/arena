import { createClient } from '@supabase/supabase-js';

// Resolve URL: when accessed remotely (e.g. mobile phone via Cloudflare tunnel or LAN),
// use window.location.origin so Vite's reverse proxy securely routes /rest and /realtime to Supabase port 8000.
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return window.location.origin;
    }
  }
  return (
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.PUBLIC_SUPABASE_URL || 
    'http://localhost:8000'
  );
};

const supabaseUrl = getSupabaseUrl();

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'arena_auth_token'
  }
});
