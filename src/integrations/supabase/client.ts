import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yxccaoiznqklgnxdsdlr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
