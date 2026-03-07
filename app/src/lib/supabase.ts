import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ekrdvptkeagygkhujnvl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcmR2cHRrZWFneWdraHVqbnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDYxMDAsImV4cCI6MjA4ODQ4MjEwMH0.-szgIoHm_OQ5CIuqf0k6N-w3Wc0q-n-p4NajcW1fnPk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
