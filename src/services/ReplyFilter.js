// ReplyFilter.js
// UGC filter for the Journey written epilogue (Apple 1.2). Longer than a call
// sign: one sentence to the senders, punctuation allowed. Rejected text never
// hits Supabase. Blocklist stays in lockstep with NameFilter.js.
// Changes:
// - Created file: 140-char reply, skip = empty, same slur/sexual blocklist.

export const REPLY_MAX_LEN = 140;
export const REPLY_MIN_LEN = 1;

const BLOCKED = [
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'rape', 'rapist',
    'porn', 'porno', 'hentai', 'onlyfans',
    'fuck', 'fucker', 'motherfuck', 'shit', 'asshole', 'cunt', 'cock', 'dick',
    'bitch', 'whore', 'slut',
    'hitler', 'nazi',
];

// Letters, numbers, spaces, and the punctuation a short farewell needs.
const ALLOWED = /^[A-Za-z0-9 .,'!?;:\-()"\n]+$/;

function normalize(raw) {
    return String(raw || '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
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
 * @returns {{ ok: true, text: string } | { ok: false, message: string }}
 */
export function validateReply(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();

    if (text.length < REPLY_MIN_LEN) {
        return { ok: false, message: 'Write something, or leave it unsaid.' };
    }
    if (text.length > REPLY_MAX_LEN) {
        return { ok: false, message: 'Keep it to one short thing.' };
    }
    if (!ALLOWED.test(text)) {
        return { ok: false, message: 'Letters, numbers, and simple punctuation.' };
    }

    const compact = normalize(text);
    for (const word of BLOCKED) {
        if (compact.includes(word)) {
            return { ok: false, message: 'Choose different words.' };
        }
    }

    return { ok: true, text };
}

/** 4102 → "4,102nd" */
export function formatOrdinal(n) {
    const num = Math.max(0, Math.floor(Number(n) || 0));
    const formatted = num.toLocaleString('en-US');
    const mod100 = num % 100;
    const mod10 = num % 10;
    let suffix = 'th';
    if (mod100 < 11 || mod100 > 13) {
        if (mod10 === 1) suffix = 'st';
        else if (mod10 === 2) suffix = 'nd';
        else if (mod10 === 3) suffix = 'rd';
    }
    return `${formatted}${suffix}`;
}
