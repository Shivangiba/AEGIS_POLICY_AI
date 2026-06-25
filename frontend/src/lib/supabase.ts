import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guard 1: Catch missing or empty values before they reach createClient()
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. " +
    "Fill in frontend/.env.local with your real Supabase project values " +
    "(Dashboard → Settings → API)."
  );
}

// Guard 2: Validate URL format — catches placeholder values like "your-supabase-url"
// that are truthy strings but not real URLs, preventing a cryptic SDK error.
const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
if (!SUPABASE_URL_PATTERN.test(cleanUrl)) {
  throw new Error(
    `❌ NEXT_PUBLIC_SUPABASE_URL "${supabaseUrl}" is not a valid Supabase project URL. ` +
    "It must match the pattern: https://your-project-id.supabase.co\n" +
    "Find the correct value in: Supabase Dashboard → Settings → API → Project URL."
  );
}

// Ensure there are absolutely no trailing slashes or hidden whitespace characters
const cleanKey = supabaseAnonKey.trim();

export const supabase = createClient(cleanUrl, cleanKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});