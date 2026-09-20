// FriendsScoreService.js
// Changes: authenticate({ force }) for the Friends Sign in button. Rows still
// carry isLocal + store photo data-URL.

import { isAndroidNative } from '../core/platform.js'
import {
    playGamesAuthenticate,
    playGamesLoadFriends,
    playGamesSubmitScore,
} from '../native/index.js'

export class FriendsScoreService {
    static isAvailable() {
        return isAndroidNative()
    }

    static async authenticate(opts = {}) {
        if (!FriendsScoreService.isAvailable()) {
            return { signedIn: false, configured: false, rows: [] }
        }
        return playGamesAuthenticate(opts)
    }

    static submitRun(flightStyle, distance, obstacles) {
        if (!FriendsScoreService.isAvailable()) return
        playGamesSubmitScore({
            style: flightStyle === 'arc' ? 'arc' : 'zigzag',
            distance: Math.max(0, Math.floor(distance || 0)),
            obstacles: Math.max(0, Math.floor(obstacles || 0)),
        })
    }

    static async loadFriends(tab, flightStyle) {
        if (!FriendsScoreService.isAvailable()) {
            return { signedIn: false, rows: [] }
        }
        const result = await playGamesLoadFriends({
            tab: tab === 'obstacles' ? 'obstacles' : 'distance',
            style: flightStyle === 'arc' ? 'arc' : 'zigzag',
        })
        const rows = (result.rows || []).map((row, index) => {
            const value = Math.floor(Number(row.score) || 0)
            const rank = Number(row.rank) || 0
            return {
                player_name: row.playerName || 'Player',
                player_id: row.playerId || `friend-${index}`,
                score: tab === 'obstacles' ? 0 : value,
                obstacles_destroyed: tab === 'obstacles' ? value : 0,
                ship_id: null,
                formattedScore: String(value),
                rank,
                isLocal: Boolean(row.isLocal),
                photo: typeof row.photo === 'string' ? row.photo : null,
            }
        })
        return { signedIn: Boolean(result.signedIn), rows }
    }
}
