// FriendsScoreService.js
// Changes: Friends YOU row uses max(Play Games, local Open Space PB) so
// distance / obstacles are not "—" while the store board catches up.
// authenticate({ force }) still opens the Play Games sheet.

import { isAndroidNative } from '../core/platform.js'
import {
    playGamesAuthenticate,
    playGamesLoadFriends,
    playGamesSubmitScore,
} from '../native/index.js'
import {
    loadOpenWorldProgress,
    personalBestDestroyedFor,
    personalBestFor,
} from './OpenWorldProgress.js'

function overlayLocalBest(rows, tab, flightStyle) {
    const progress = loadOpenWorldProgress()
    const bestDist = personalBestFor(progress, flightStyle)
    const bestObs = personalBestDestroyedFor(progress, flightStyle)
    const bestValue = tab === 'obstacles' ? bestObs : bestDist
    let list = Array.isArray(rows) ? rows.slice() : []
    const local = list.find((row) => row.isLocal)
    const storeValue = local
        ? Math.floor(Number(tab === 'obstacles' ? local.obstacles_destroyed : local.score) || 0)
        : 0
    if (!local && (bestDist > 0 || bestObs > 0)) {
        const value = tab === 'obstacles' ? bestObs : bestDist
        list.push({
            player_name: 'You',
            player_id: 'local',
            score: bestDist,
            obstacles_destroyed: bestObs,
            ship_id: null,
            formattedScore: String(value),
            rank: 0,
            isLocal: true,
            photo: null,
        })
    }
    list = list.map((row) => {
        if (!row.isLocal) return row
        const storeDist = Math.floor(Number(row.score) || 0)
        const storeObs = Math.floor(Number(row.obstacles_destroyed) || 0)
        const score = Math.max(storeDist, bestDist)
        const obstacles = Math.max(storeObs, bestObs)
        const value = tab === 'obstacles' ? obstacles : score
        return {
            ...row,
            score,
            obstacles_destroyed: obstacles,
            formattedScore: String(value),
        }
    })
    if (bestValue > storeValue) {
        FriendsScoreService.submitRun(flightStyle, bestDist, bestObs)
    }
    return list
}

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
        return {
            signedIn: Boolean(result.signedIn),
            rows: result.signedIn ? overlayLocalBest(rows, tab, flightStyle) : rows,
        }
    }
}
