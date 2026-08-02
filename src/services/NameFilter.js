// NameFilter.js
// Call-sign validation for the online leaderboard (user-generated content).
// Changes:
// - Created file: Apple guideline 1.2 expects moderation for UGC. A short
//   blocklist plus character/length rules is enough for a call sign — we are
//   not building a chat app. Rejected names never hit Supabase.

// Compact list aimed at obvious slurs / sexual terms that show up on public
// boards. Not exhaustive; report address is on the support page.
const BLOCKED = [
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'rape', 'rapist',
    'porn', 'porno', 'hentai', 'onlyfans',
    'fuck', 'fucker', 'motherfuck', 'shit', 'asshole', 'cunt', 'cock', 'dick',
    'bitch', 'whore', 'slut',
    'hitler', 'nazi',
];

const MAX_LEN = 15;
const MIN_LEN = 2;
// Letters, numbers, spaces, hyphen, underscore, period.
const ALLOWED = /^[A-Za-z0-9 _.\-]+$/;

function normalize(raw) {
    return String(raw || '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        // light leetspeak so "f.u.c.k" / "fuk" still trip the list
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/\$/g, 's')
        .replace(/@/g, 'a')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * @returns {{ ok: true, name: string } | { ok: false, message: string }}
 */
export function validateCallSign(raw) {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');

    if (name.length < MIN_LEN) {
        return { ok: false, message: 'Call sign too short.' };
    }
    if (name.length > MAX_LEN) {
        return { ok: false, message: 'Call sign too long.' };
    }
    if (!ALLOWED.test(name)) {
        return { ok: false, message: 'Use letters, numbers, spaces, - _ .' };
    }

    const compact = normalize(name);
    for (const word of BLOCKED) {
        if (compact.includes(word)) {
            return { ok: false, message: 'Choose a different call sign.' };
        }
    }

    return { ok: true, name };
}

export const SUPPORT_EMAIL = 'hello@orbi.gg';
export const PRIVACY_URL = 'https://orbi.gg/privacy.html';
export const SUPPORT_URL = 'https://orbi.gg/support.html';
