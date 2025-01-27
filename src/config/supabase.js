import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uglepmiodcpvafubwrvj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbGVwbWlvZGNwdmFmdWJ3cnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTc0NjIsImV4cCI6MjA1MDEzMzQ2Mn0.HbOxsCFEPA6dV6QMl9QRv1YBXC1m6CBhBgkh_huU9eo'

// Create Supabase client without auth redirect
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'implicit',
        storage: null,
        storageKey: null
    }
}) 