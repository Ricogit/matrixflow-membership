import { createClient } from '@supabase/supabase-js';

// Get your Supabase URL and Anon Key from the Lovable Cloud dashboard
// Navigate to the Cloud tab in your project to find these credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
