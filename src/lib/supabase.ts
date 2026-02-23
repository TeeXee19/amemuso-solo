import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If credentials are missing, we'll export a null or a dummy client 
// and handle it in the UI to show a nice setup guide.
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null as any;

