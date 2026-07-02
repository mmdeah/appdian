import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Stub client when env vars are missing (Google OAuth simply won't work)
const noopClient = {
  auth: {
    signInWithOAuth: async () => ({ error: new Error('Supabase no configurado') }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => {},
  },
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : noopClient
