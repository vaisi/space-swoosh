// ScoreService.js
// Supabase read/write for the online leaderboard, plus score formatting.
// Changes:
// - Open Space submits go through start_score_run / submit_verified_score.
//   saveScore no longer inserts high_scores directly. A missing run id throws
//   ScoreRejectedError ("This run was not started online."). P0001 messages
//   from the clock (too fast, already submitted, too old) surface the same way.
// - saveScore writes `platform` (ios|android|web) for operator queries; not shown
//   on the public SPACE BOARD.
// - saveScore / getTopScores / getAllScoresCount take flightStyle so Arc and
//   Zigzag land on separate boards (`flight_style` column).
// - getScorePage reads one Space Board page plus the real row count, so the
//   pager is not capped at 10 pages.
// - saveScore accepts optional shipId (roster skin id) and writes `ship_id`.
// - Inserts omit client `created_at` (DB default `now()`) to avoid timestamp
//   serialization edge cases from the browser.
// - The Supabase client is now nullable (credentials come from env vars), so
//   every network path guards on it. Reads degrade to an empty board; writes and
//   rank lookups throw a labelled error the callers in Game.js already catch and
//   render as "unavailable" / rank "?".
// - Call signs pass through NameFilter before insert (UGC moderation for Apple
//   1.2). Invalid names throw CallSignRejectedError with a player-facing message.
// - getDeathPreview reads the Open Space neighborhood for the death screen:
//   rank, the #1 row, the closest higher score, and the closest lower score.
//   deathPreviewLines turns that into the strip (#1 is not repeated when you
//   are #1 or #2). A rank jump inserts a gap row so #1 is not read as
//   sitting next to the neighborhood.
// - `formatScore` stays pure — it is called from the HUD every frame and must
//   never depend on the backend being configured.

import { supabase, isLeaderboardConfigured } from '../config/supabase.js'
import { FLIGHT_STYLE } from '../config/flightStyle.js'
import { resolveShipSkinId, skins } from '../ships/skins.js'
import { validateCallSign } from './NameFilter.js'
import { clientPlatform } from '../core/platform.js'

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

/** Server clock or a run that never checked in. Message is player-facing. */
export class ScoreRejectedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ScoreRejectedError';
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
     * Stamp an Open Space run on the server. Returns null when the leaderboard
     * is offline or the check-in fails — the flight still plays.
     * @param {string} [flightStyle] 'arc' | 'zigzag'
     * @returns {Promise<string | null>}
     */
    static async startRun(flightStyle) {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase.rpc('start_score_run', {
                p_platform: clientPlatform(),
                p_flight_style: sanitizeFlightStyle(flightStyle),
            });
            if (error || data == null || data === '') {
                console.warn('[scores] start failed:', error?.message || 'no run id');
                return null;
            }
            return String(data);
        } catch (error) {
            console.warn('[scores] start failed:', error);
            return null;
        }
    }

    /**
     * @param {number} score
     * @param {string} playerName
     * @param {number} obstaclesDestroyed
     * @param {string} [shipId] active skin id for the run
     * @param {string} [flightStyle] 'arc' | 'zigzag'
     * @param {string | null} [runId] id from startRun
     */
    static async saveScore(score, playerName, obstaclesDestroyed, shipId, flightStyle, runId) {
        const check = validateCallSign(playerName);
        if (!check.ok) throw new CallSignRejectedError(check.message);

        const client = ScoreService.requireClient();
        if (!runId) {
            throw new ScoreRejectedError('This run was not started online.');
        }

        const ship = sanitizeShipId(shipId);
        const style = sanitizeFlightStyle(flightStyle);

        try {
            const { data, error } = await client.rpc('submit_verified_score', {
                p_run_id: runId,
                p_score: Math.floor(score),
                p_player_name: check.name,
                p_obstacles: Math.max(0, Math.floor(obstaclesDestroyed || 0)),
                p_ship_id: ship,
                p_flight_style: style,
                p_platform: clientPlatform(),
            });

            if (error) {
                if (error.code === 'P0001' && error.message) {
                    throw new ScoreRejectedError(error.message);
                }
                throw error;
            }
            return data;
        } catch (error) {
            if (error instanceof ScoreRejectedError || error instanceof CallSignRejectedError) {
                throw error;
            }
            console.error('Error saving score:', error);
            throw error;
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
    // One page of rows plus the full count for this flight style and tab.
    static async getScorePage(type = 'distance', page = 0, pageSize = 10, flightStyle = FLIGHT_STYLE.zigzag) {
        if (!supabase) return { rows: [], total: 0 };

        const style = sanitizeFlightStyle(flightStyle);
        const size = Math.max(1, Math.floor(pageSize));
        const index = Math.max(0, Math.floor(page));
        const from = index * size;
        const to = from + size - 1;

        try {
            const { data, error, count } = await supabase
                .from(TABLE)
                .select('*', { count: 'exact' })
                .eq('flight_style', style)
                .order(type === 'distance' ? 'score' : 'obstacles_destroyed', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const rows = data?.map(score => ({
                ...score,
                formattedScore: this.formatScore(type === 'distance' ? score.score : score.obstacles_destroyed)
            })) || [];
            return { rows, total: count || 0 };
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

    /**
     * Where an unpublished Open Space distance would sit on this flight style.
     * Rank is the count of strictly higher scores, plus one.
     * @returns {Promise<{ rank: number, top: object | null, above: object | null, below: object | null }>}
     */
    static async getDeathPreview(score, flightStyle = FLIGHT_STYLE.zigzag) {
        const client = ScoreService.requireClient();
        const style = sanitizeFlightStyle(flightStyle);
        const value = Math.floor(score);

        const [higher, topRes, aboveRes, belowRes] = await Promise.all([
            client.from(TABLE).select('*', { count: 'exact', head: true })
                .eq('flight_style', style)
                .gt('score', value),
            client.from(TABLE).select('player_name,score,ship_id')
                .eq('flight_style', style)
                .order('score', { ascending: false })
                .limit(1),
            client.from(TABLE).select('player_name,score,ship_id')
                .eq('flight_style', style)
                .gt('score', value)
                .order('score', { ascending: true })
                .limit(1),
            client.from(TABLE).select('player_name,score,ship_id')
                .eq('flight_style', style)
                .lt('score', value)
                .order('score', { ascending: false })
                .limit(1),
        ]);

        if (higher.error) throw higher.error;
        if (topRes.error) throw topRes.error;
        if (aboveRes.error) throw aboveRes.error;
        if (belowRes.error) throw belowRes.error;

        const top = previewRow(topRes.data?.[0]);
        const above = previewRow(aboveRes.data?.[0]);
        const below = previewRow(belowRes.data?.[0]);

        const [aboveHigher, belowHigher] = await Promise.all([
            above ? ScoreService.getAllScoresCount(above.score, style) : null,
            below ? ScoreService.getAllScoresCount(below.score, style) : null,
        ]);

        return {
            rank: (higher.count || 0) + 1,
            top: top ? { ...top, rank: 1 } : null,
            above: above ? { ...above, rank: aboveHigher + 1 } : null,
            below: below ? { ...below, rank: belowHigher + 1 } : null,
        };
    }
}

function previewRow(row) {
    if (!row) return null;
    return {
        name: row.player_name || '',
        score: row.score,
        shipId: row.ship_id || null,
    };
}

/**
 * Strip order for the death screen. Rank 1 is only the preview row.
 * Rank 2 uses the row above as #1 so first place is not drawn twice.
 * A jump of more than one rank inserts `{ gap: true }` (the "· · ·" row).
 * @param {{ rank: number, top: object | null, above: object | null, below: object | null } | null} preview
 * @returns {Array<{ you?: boolean, gap?: boolean, rank: number, name?: string, score?: number, shipId?: string | null }>}
 */
export function deathPreviewLines(preview) {
    if (!preview || !Number.isFinite(preview.rank)) return [];
    const { rank, top, above, below } = preview;
    if (rank === 1) return [{ you: true, rank: 1 }];

    const lines = [];
    const aboveIsFirst = above && above.rank === 1;
    if (aboveIsFirst) {
        lines.push({ you: false, ...above });
    } else if (top) {
        lines.push({ you: false, rank: 1, name: top.name, score: top.score, shipId: top.shipId });
        if (above && above.rank !== 1) lines.push({ you: false, ...above });
    } else if (above) {
        lines.push({ you: false, ...above });
    }
    lines.push({ you: true, rank });
    if (below) lines.push({ you: false, ...below });
    return withRankGaps(lines);
}

function withRankGaps(lines) {
    const out = [];
    for (const line of lines) {
        const prev = out[out.length - 1];
        if (prev && !prev.gap && line.rank > prev.rank + 1) {
            out.push({ gap: true, rank: prev.rank });
        }
        out.push(line);
    }
    return out;
}
