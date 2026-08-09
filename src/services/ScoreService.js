// ScoreService.js
// Supabase read/write for the online leaderboard, plus score formatting.
// Changes:
// - saveScore / getTopScores / getAllScoresCount take flightStyle so Arc and
//   Zigzag land on separate boards (`flight_style` column).
// - getTopScores default limit is 100 (10 leaderboard pages × 10 rows).
// - saveScore accepts optional shipId (roster skin id) and writes `ship_id`.
// - Inserts omit client `created_at` (DB default `now()`) to avoid timestamp
//   serialization edge cases from the browser.
// - The Supabase client is now nullable (credentials come from env vars), so
//   every network path guards on it. Reads degrade to an empty board; writes and
//   rank lookups throw a labelled error the callers in Game.js already catch and
//   render as "unavailable" / rank "?".
// - Call signs pass through NameFilter before insert (UGC moderation for Apple
//   1.2). Invalid names throw CallSignRejectedError with a player-facing message.
// - `formatScore` stays pure — it is called from the HUD every frame and must
//   never depend on the backend being configured.

import { supabase, isLeaderboardConfigured } from '../config/supabase.js'
import { FLIGHT_STYLE } from '../config/flightStyle.js'
import { resolveShipSkinId, skins } from '../ships/skins.js'
import { validateCallSign } from './NameFilter.js'

const TABLE = 'high_scores';

export class LeaderboardUnavailableError extends Error {
    constructor() {
        super('Leaderboard is not configured for this build.');
        this.name = 'LeaderboardUnavailableError';
    }
}

export class CallSignRejectedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CallSignRejectedError';
    }
}

/** Only known roster ids are stored — never free-form ship text. */
function sanitizeShipId(shipId) {
    if (!shipId || typeof shipId !== 'string') return null;
    const id = resolveShipSkinId(shipId);
    return skins[id] ? id : null;
}

/** Arc | Zigzag only; unknown values fall back to zigzag (legacy board). */
function sanitizeFlightStyle(flightStyle) {
    return flightStyle === FLIGHT_STYLE.arc ? FLIGHT_STYLE.arc : FLIGHT_STYLE.zigzag;
}

export class ScoreService {
    /** @returns {boolean} Whether any network call can succeed at all. */
    static isAvailable() {
        return isLeaderboardConfigured();
    }

    static requireClient() {
        if (!supabase) throw new LeaderboardUnavailableError();
        return supabase;
    }

    /**
     * @param {number} score
     * @param {string} playerName
     * @param {number} obstaclesDestroyed
     * @param {string} [shipId] active skin id for the run
     * @param {string} [flightStyle] 'arc' | 'zigzag'
     */
    static async saveScore(score, playerName, obstaclesDestroyed, shipId, flightStyle) {
        const check = validateCallSign(playerName);
        if (!check.ok) throw new CallSignRejectedError(check.message);

        const client = ScoreService.requireClient();
        const ship = sanitizeShipId(shipId);
        const style = sanitizeFlightStyle(flightStyle);

        try {
            const row = {
                score: Math.floor(score),
                player_name: check.name,
                obstacles_destroyed: Math.max(0, Math.floor(obstaclesDestroyed || 0)),
                flight_style: style,
            };
            if (ship) row.ship_id = ship;

            const { data, error } = await client
                .from(TABLE)
                .insert([row])

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error saving score:', error)
            throw error
        }
    }

    static formatScore(score) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(score);
    }

    // An unconfigured build shows an empty board rather than an error screen —
    // the leaderboard is a side feature and must never block the menu.
    static async getTopScores(type = 'distance', limit = 100, flightStyle = FLIGHT_STYLE.zigzag) {
        if (!supabase) return [];

        const style = sanitizeFlightStyle(flightStyle);

        try {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('flight_style', style)
                .order(type === 'distance' ? 'score' : 'obstacles_destroyed', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data?.map(score => ({
                ...score,
                formattedScore: this.formatScore(type === 'distance' ? score.score : score.obstacles_destroyed)
            })) || [];
        } catch (error) {
            console.error('Error fetching scores:', error);
            throw error;
        }
    }

    static async getAllScoresCount(score, flightStyle = FLIGHT_STYLE.zigzag) {
        const client = ScoreService.requireClient();
        const style = sanitizeFlightStyle(flightStyle);

        try {
            const { count, error } = await client
                .from(TABLE)
                .select('*', { count: 'exact', head: true })
                .eq('flight_style', style)
                .gt('score', Math.floor(score));

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting scores count:', error);
            throw error;
        }
    }
}
