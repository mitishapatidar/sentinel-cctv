import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://splqtcnmbxjojxjeauzt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9hk80O_040xKZDDqYvguKQ_0LpPRAUK";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
