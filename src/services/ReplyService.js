// ReplyService.js
// Journey epilogue replies: insert via RPC (bodies are not publicly readable)
// and return the live ordinal. Offline / RPC failure is non-fatal — the lights
// still play and the card falls back to ENDING_EPILOGUE.offlineCounterCard.
// One reply per device is enforced in JourneyProgress (`epilogueReplyDone`);
// this service still inserts whenever called, so the epilogue must not call it
// again on replay.
// Changes:
// - submitJourneyReply sends p_platform (ios|android|web) with the reply.
// - submitJourneyReply also sends shipId (roster skin) as p_ship_id.

import { supabase, isLeaderboardConfigured } from '../config/supabase.js';
import { skins } from '../ships/skins.js';
import { validateReply } from './ReplyFilter.js';
import { clientPlatform } from '../core/platform.js';

/** Only known roster ids are stored — never free-form ship text. */
function sanitizeShipId(shipId) {
    if (!shipId || typeof shipId !== 'string') return null;
    return skins[shipId] ? shipId : null;
}

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
     * @param {{ text?: string, skipped?: boolean, shipId?: string }} payload
     * @returns {Promise<number | null>} ordinal, or null if offline / error
     */
    static async submitJourneyReply({ text = '', skipped = false, shipId = null } = {}) {
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
                p_ship_id: sanitizeShipId(shipId),
                p_platform: clientPlatform(),
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
