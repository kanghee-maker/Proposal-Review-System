import 'server-only';
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (process.env.NODE_ENV !== 'production' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') || 'unconfigured-server-key';
export const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
