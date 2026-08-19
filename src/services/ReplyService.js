// ReplyService.js
// Journey epilogue replies: insert via RPC (bodies are not publicly readable)
// and return the live ordinal. Offline / RPC failure is non-fatal — the lights
// still play and the card falls back to ENDING_EPILOGUE.offlineCounterCard.
// One reply per device is enforced in JourneyProgress (`epilogueReplyDone`);
// this service still inserts whenever called, so the epilogue must not call it
// again on replay.
// Changes:
// - Created file: submitJourneyReply({ text, skipped }) → { ordinal } | null.

import { supabase, isLeaderboardConfigured } from '../config/supabase.js';
import { validateReply } from './ReplyFilter.js';

export class ReplyRejectedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReplyRejectedError';
    }
}

export class ReplyService {
    static isAvailable() {
        return isLeaderboardConfigured();
    }

    /**
     * @param {{ text?: string, skipped?: boolean }} payload
     * @returns {Promise<number | null>} ordinal, or null if offline / error
     */
    static async submitJourneyReply({ text = '', skipped = false } = {}) {
        let body = null;
        if (!skipped) {
            const check = validateReply(text);
            if (!check.ok) throw new ReplyRejectedError(check.message);
            body = check.text;
        }

        if (!supabase) return null;

        try {
            const { data, error } = await supabase.rpc('submit_journey_reply', {
                p_body: body,
                p_skipped: Boolean(skipped),
            });
            if (error) {
                console.warn('[replies] submit failed:', error.message);
                return null;
            }
            const ordinal = Math.floor(Number(data) || 0);
            return ordinal > 0 ? ordinal : null;
        } catch (err) {
            console.warn('[replies] submit failed:', err);
            return null;
        }
    }
}
