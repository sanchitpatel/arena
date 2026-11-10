import { createClient } from '@supabase/supabase-js';

// Resolve URL: on localhost, directly connects to Supabase on port 8000.
// On remote mobile tunnels (e.g. Cloudflare tunnel), routes via window.location.origin
// so Vite proxies API and Realtime traffic seamlessly.
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isTunnel = window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('tunnel');
    if (isTunnel) {
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
  },
  realtime: {
    params: {
      eventsPerSecond: 40 // Raised for high-density live event scoreboard sync
    }
  }
});
