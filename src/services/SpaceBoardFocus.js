// SpaceBoardFocus.js
// Changes: Helpers for Space Board open: Friends default, call-sign row
// match after Submit Signal, and page index for 10-row pages.

export const SPACE_BOARD_PAGE_SIZE = 10;

function normalizeCallSign(name) {
    return String(name || '').trim().toLowerCase();
}

/** Signed in and the list has a friend or a scored local row (not empty YOU). */
export function friendsListHasAnyone(result) {
    if (!result?.signedIn) return false;
    const rows = result.rows || [];
    return rows.some((row) => {
        if (!row.isLocal) return true;
        return (Number(row.score) || 0) > 0
            || (Number(row.obstacles_destroyed) || 0) > 0
            || (Number(row.rank) || 0) > 0;
    });
}

/** Index of the submitted Global row, or -1. Prefers matching metric then ship. */
export function findSubmittedRowIndex(rows, highlight, tab) {
    if (!highlight || !Array.isArray(rows) || rows.length === 0) return -1;
    const wantName = normalizeCallSign(highlight.name);
    if (!wantName) return -1;
    const named = [];
    for (let i = 0; i < rows.length; i += 1) {
        if (normalizeCallSign(rows[i].player_name) === wantName) named.push(i);
    }
    if (named.length === 0) return -1;
    const obstacles = tab === 'obstacles';
    const metric = obstacles
        ? Math.max(0, Math.floor(Number(highlight.obstacles) || 0))
        : Math.max(0, Math.floor(Number(highlight.score) || 0));
    const field = obstacles ? 'obstacles_destroyed' : 'score';
    const scored = named.filter((i) => Math.floor(Number(rows[i][field]) || 0) === metric);
    const pool = scored.length ? scored : named;
    if (highlight.shipId) {
        const withShip = pool.filter((i) => rows[i].ship_id === highlight.shipId);
        if (withShip.length) return withShip[0];
    }
    return pool[0];
}

export function findLocalFriendIndex(rows) {
    if (!Array.isArray(rows)) return -1;
    return rows.findIndex((row) => row.isLocal);
}

export function pageForRowIndex(index, pageSize = SPACE_BOARD_PAGE_SIZE) {
    if (!Number.isFinite(index) || index < 0) return 0;
    return Math.floor(index / pageSize);
}
