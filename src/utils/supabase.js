import { createClient } from '@supabase/supabase-js';

// Supabase Cloud Project URL and Public Client Key
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.PUBLIC_SUPABASE_URL || 
  'https://ocnuhgvoicjgznfymmhj.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_4Zuy1bxqLNdbflwxdFvz7w_InZ5nP5-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'arena_auth_token'
  },
  realtime: {
    params: {
      eventsPerSecond: 40 // Tuned for high-density live event scoreboard sync
    }
  }
});
