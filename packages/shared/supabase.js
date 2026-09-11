import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY — set in .env');
}

export const supabase = createClient(supabaseUrl || 'https://vmcdlygpprywurypzlmj.supabase.co', supabaseAnonKey || 'placeholder', {
  realtime: { params: { eventsPerSecond: 10 } }
})

export const SUPPORT_COURS_URL = 'https://t.me/roqaya_2328'
export const SUPPORT_RECLAMATION_URL = 'https://t.me/walidvisa'
