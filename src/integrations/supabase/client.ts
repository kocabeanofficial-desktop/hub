import { createClient } from '@supabase/supabase-js';

// Single Supabase project (external): all data, auth, edge functions, storage.
const SUPABASE_URL = "https://yxccaoiznqklgnxdsdlr.supabase.co";
const SUPABASE_KEY = "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
