// ScoreService.js
// Supabase read/write for the online leaderboard, plus score formatting.
// Changes:
// - The Supabase client is now nullable (credentials come from env vars), so
//   every network path guards on it. Reads degrade to an empty board; writes and
//   rank lookups throw a labelled error the callers in Game.js already catch and
//   render as "unavailable" / rank "?".
// - `formatScore` stays pure — it is called from the HUD every frame and must
//   never depend on the backend being configured.

import { supabase, isLeaderboardConfigured } from '../config/supabase.js'

const TABLE = 'high_scores';

export class LeaderboardUnavailableError extends Error {
    constructor() {
        super('Leaderboard is not configured for this build.');
        this.name = 'LeaderboardUnavailableError';
    }
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

    static async saveScore(score, playerName, obstaclesDestroyed) {
        const client = ScoreService.requireClient();

        try {
            const { data, error } = await client
                .from(TABLE)
                .insert([
                    {
                        score: Math.floor(score),
                        player_name: playerName,
                        obstacles_destroyed: obstaclesDestroyed,
                        created_at: new Date()
                    }
                ])

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
    static async getTopScores(type = 'distance', limit = 20) {
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
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

    static async getAllScoresCount(score) {
        const client = ScoreService.requireClient();

        try {
            const { count, error } = await client
                .from(TABLE)
                .select('*', { count: 'exact', head: true })
                .gt('score', Math.floor(score));

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting scores count:', error);
            throw error;
        }
    }
}
