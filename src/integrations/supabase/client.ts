import { createClient } from '@supabase/supabase-js';

// Single Supabase project: local env takes precedence for local development.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yxccaoiznqklgnxdsdlr.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
