// Lives.js
// Free-player lives pool for Open Space and Journey. Pro subscribers bypass
// this entirely (unlimited). Changes:
// - LIVES_ENABLED kill switch (default false): gates, spend, and regen are
//   no-ops until we ship the economy; stored livesState is left untouched.
// - Created: start at 10; +6 every 6 hours while below cap; hard cap 10.
//   Spend on death / fuel-out (caller); gate starts when lives === 0.
//   Regen timer pauses at full. Catch-up applies multiple periods offline.

import { isProActive } from './Entitlements.js';

const STORAGE_KEY = 'livesState';
export const MAX_LIVES = 10;
export const REGEN_AMOUNT = 6;
export const REGEN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Kill switch for the free-lives economy. Off until we ship it. */
export const LIVES_ENABLED = false;

/** @type {{ lives: number, nextRegenAt: number | null }} */
let state = loadState();

function defaultState() {
    return { lives: MAX_LIVES, nextRegenAt: null };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        const lives = Number(parsed?.lives);
        if (!Number.isFinite(lives)) return defaultState();
        const next = parsed?.nextRegenAt;
        return {
            lives: Math.max(0, Math.min(MAX_LIVES, Math.floor(lives))),
            nextRegenAt:
                typeof next === 'number' && Number.isFinite(next) ? next : null,
        };
    } catch {
        return defaultState();
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* private mode */
    }
}

/** Pro players never touch the lives pool. */
export function isProUnlimited() {
    return isProActive();
}

/**
 * Apply any elapsed regen periods (+6 each), clamp to MAX_LIVES, and keep
 * nextRegenAt coherent. Safe to call every frame / screen enter.
 */
export function ensureRegen(now = Date.now()) {
    if (!LIVES_ENABLED) return state.lives;
    if (isProUnlimited()) return state.lives;

    if (state.lives >= MAX_LIVES) {
        if (state.nextRegenAt != null) {
            state.nextRegenAt = null;
            persist();
        }
        return state.lives;
    }

    if (state.nextRegenAt == null) {
        state.nextRegenAt = now + REGEN_INTERVAL_MS;
        persist();
        return state.lives;
    }

    let guard = 0;
    while (
        state.lives < MAX_LIVES
        && state.nextRegenAt != null
        && now >= state.nextRegenAt
        && guard < 48
    ) {
        state.lives = Math.min(MAX_LIVES, state.lives + REGEN_AMOUNT);
        guard += 1;
        if (state.lives >= MAX_LIVES) {
            state.nextRegenAt = null;
            break;
        }
        state.nextRegenAt += REGEN_INTERVAL_MS;
    }
    persist();
    return state.lives;
}

export function getLives() {
    ensureRegen();
    return state.lives;
}

export function canStartRun() {
    if (!LIVES_ENABLED || isProUnlimited()) return true;
    return getLives() > 0;
}

/**
 * Decrement one life on failure. No-op when the flag is off, for Pro, or
 * when already at 0.
 * @returns {number} lives remaining after spend
 */
export function spendLife() {
    if (!LIVES_ENABLED || isProUnlimited()) return getLives();
    ensureRegen();
    if (state.lives <= 0) return 0;
    state.lives -= 1;
    if (state.lives < MAX_LIVES && state.nextRegenAt == null) {
        state.nextRegenAt = Date.now() + REGEN_INTERVAL_MS;
    }
    persist();
    return state.lives;
}

/** Ms until the next +6 grant, or 0 if disabled / full / Pro / no timer. */
export function msUntilNextRegen(now = Date.now()) {
    if (!LIVES_ENABLED || isProUnlimited()) return 0;
    ensureRegen(now);
    if (state.lives >= MAX_LIVES || state.nextRegenAt == null) return 0;
    return Math.max(0, state.nextRegenAt - now);
}

/** Compact countdown like `5h 12m` or `3m 04s`. */
export function formatRegenCountdown(ms = msUntilNextRegen()) {
    if (ms <= 0) return '';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
}

/** Label for HUD chips: ∞ when Pro, else the count. */
export function livesDisplayLabel() {
    if (isProUnlimited()) return '∞';
    return String(getLives());
}
