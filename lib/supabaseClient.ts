import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkhskdtgvlwlkmgzbpyl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_oy_o0E4qYubDWuLpPc-15A_XQCIkO2B';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
