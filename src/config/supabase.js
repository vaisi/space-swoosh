// supabase.js
// Supabase client for the online leaderboard.
// Changes:
// - Credentials moved out of source into Vite env vars (VITE_SUPABASE_URL /
//   VITE_SUPABASE_ANON_KEY, see .env.example). They still ship in the client
//   bundle — the anon key is public by design — but they are no longer literals
//   in a file that CI and the App Store binary both carry.
// - The client is now nullable. A build without credentials (fresh clone,
//   misconfigured CI) must still boot into a playable game, so `supabase` is
//   `null` when unconfigured and `isLeaderboardConfigured()` lets ScoreService
//   report "unavailable" instead of throwing on import.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const configured = Boolean(supabaseUrl && supabaseKey)

if (!configured) {
    console.warn(
        '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — ' +
        'the leaderboard is disabled for this build. Copy .env.example to .env.'
    )
}

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase = configured
    ? createClient(supabaseUrl, supabaseKey, {
        // The game has no accounts; skip every auth side effect so no session
        // is persisted and the URL is never parsed for tokens.
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            flowType: 'implicit',
            storage: null,
            storageKey: null
        }
    })
    : null

export function isLeaderboardConfigured() {
    return configured
}
