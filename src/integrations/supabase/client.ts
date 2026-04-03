import { createClient } from '@supabase/supabase-js';

// External Supabase project (existing data: clients, projects, tasks, etc.)
const EXTERNAL_URL = "https://yxccaoiznqklgnxdsdlr.supabase.co";
const EXTERNAL_KEY = "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

export const supabase = createClient(EXTERNAL_URL, EXTERNAL_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Lovable Cloud Supabase (client_invites table + edge functions)
const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseCloud = createClient(CLOUD_URL, CLOUD_KEY, {
  auth: {
    storage: localStorage,
    persistSession: false,
    autoRefreshToken: false,
  }
});
