import { createClient } from "@supabase/supabase-js";

// Get from env, or fallback to hardcoded (BOM character bug in .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dhcdfaetjzbcabycvxvu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Debug: Log what we're getting
console.log('Supabase URL:', supabaseUrl ? '✅ Loaded' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Loaded' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment Variables Status:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey);
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are in your .env file. ' +
    'You may need to restart your dev server after editing .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
