// theme.js
// -----------------------------------------------------------------------------
// SPACE SWOOSH — Light / dark (night paper) theme switching.
//
// Changes:
// - Default theme is light (cream paper) when no `ssTheme` is stored.
// - Created: two palettes, localStorage persistence, applyTheme() mutates the
//   shared `color` / `semantic` objects + CSS vars + page shell so canvas and
//   DOM stay in sync. Clears hull/glow bake caches on switch.
// -----------------------------------------------------------------------------

import { color, semantic, motif, frame } from './tokens.js';
import { syncPaintConsts } from '../utils/DrawUtils.js';
import { clearGlowSpriteCache } from '../utils/GlowSprites.js';
import { clearHullCache } from '../ships/HullCache.js';

export const THEME_DARK = 'dark';
export const THEME_LIGHT = 'light';

const STORAGE_KEY = 'ssTheme';

/** @typedef {'dark' | 'light'} ThemeId */

/** Night paper — charcoal ground, bone ink, vivid mint signal. */
const DARK = {
    paper:        '#1C1A16',
    paperTint:    '#2A2620',
    paperDeep:    '#12100E',
    paperRgb:     '28, 26, 22',
    ink:          '#E1D9C1',
    ink80:        'rgba(225, 217, 193, 0.80)',
    ink55:        'rgba(225, 217, 193, 0.55)',
    ink30:        'rgba(225, 217, 193, 0.30)',
    ink12:        'rgba(225, 217, 193, 0.12)',
    ink06:        'rgba(225, 217, 193, 0.06)',
    inkRgb:       '225, 217, 193',
    signal:       '#3DFF9A',
    signalSoft:   'rgba(61, 255, 154, 0.32)',
    signalRgb:    '61, 255, 154',
    ember:        '#C47855',
    emberSoft:    'rgba(196, 120, 85, 0.22)',
    emberRgb:     '196, 120, 85',
};

/** Classic cream paper — warm ground, near-black ink, Signal Blue. */
const LIGHT = {
    paper:        '#E1D9C1',
    paperTint:    '#EAE4D2',
    paperDeep:    '#D3C9AC',
    paperRgb:     '225, 217, 193',
    ink:          '#1A1A1A',
    ink80:        'rgba(26, 26, 26, 0.80)',
    ink55:        'rgba(26, 26, 26, 0.55)',
    ink30:        'rgba(26, 26, 26, 0.30)',
    ink12:        'rgba(26, 26, 26, 0.12)',
    ink06:        'rgba(26, 26, 26, 0.06)',
    inkRgb:       '26, 26, 26',
    signal:       '#0000FF',
    signalSoft:   'rgba(0, 0, 255, 0.14)',
    signalRgb:    '0, 0, 255',
    ember:        '#A65D3F',
    emberSoft:    'rgba(166, 93, 63, 0.18)',
    emberRgb:     '166, 93, 63',
};

const PALETTES = {
    [THEME_DARK]: DARK,
    [THEME_LIGHT]: LIGHT,
};

/** @type {ThemeId} */
let currentTheme = THEME_LIGHT;

/** @returns {ThemeId} */
export function getTheme() {
    return currentTheme;
}

export function isDarkTheme() {
    return currentTheme === THEME_DARK;
}

/** Button label for the current theme (what you are *in*). */
export function themeLabel() {
    return currentTheme === THEME_DARK ? 'Dark Mode' : 'Light Mode';
}

/** @returns {ThemeId} */
export function loadStoredTheme() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === THEME_LIGHT || raw === THEME_DARK) return raw;
    } catch (_) {
        /* private mode */
    }
    return THEME_LIGHT;
}

/** @param {ThemeId} id */
function persistTheme(id) {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch (_) {
        /* ignore */
    }
}

function refreshDerivedTokens() {
    semantic.background = color.paper;
    semantic.surface = color.paperTint;
    semantic.surfaceSunk = color.paperDeep;
    semantic.textPrimary = color.ink;
    semantic.textSecondary = color.ink80;
    semantic.textMuted = color.ink55;
    semantic.stroke = color.ink;
    semantic.strokeSoft = color.ink30;
    semantic.divider = color.ink12;
    semantic.accent = color.signal;
    semantic.accentSoft = color.signalSoft;
    semantic.obstacle = color.ink;
    semantic.trail = color.ink30;
    semantic.reticle = color.ink;
    semantic.shield = color.signal;

    motif.teleportStates.entry.stroke = color.signal;
    motif.teleportStates.exit.stroke = color.ink;
    motif.teleportStates.spent.stroke = color.ink30;

    frame.border = `1.5px solid ${color.ink}`;
    frame.surface = color.paperTint;
    frame.divider = color.ink12;
    frame.labelTag = color.ink55;
}

function syncCssVars() {
    const root = document.documentElement;
    root.style.setProperty('--ss-paper', color.paper);
    root.style.setProperty('--ss-paper-tint', color.paperTint);
    root.style.setProperty('--ss-paper-deep', color.paperDeep);
    root.style.setProperty('--ss-ink', color.ink);
    root.style.setProperty('--ss-ink-80', color.ink80);
    root.style.setProperty('--ss-ink-55', color.ink55);
    root.style.setProperty('--ss-ink-30', color.ink30);
    root.style.setProperty('--ss-ink-12', color.ink12);
    root.style.setProperty('--ss-ink-06', color.ink06);
    root.style.setProperty('--ss-signal', color.signal);
    root.style.setProperty('--ss-signal-soft', color.signalSoft);
    root.dataset.theme = currentTheme;
}

/**
 * Letterbox surround is the opposite of the stage so edges still read:
 * dark stage → bone surround; cream stage → ink surround.
 */
function syncPageShell() {
    const surround = currentTheme === THEME_DARK ? color.ink : color.ink;
    // Dark: bone ink surround; Light: near-black ink surround (same token role).
    const themeColor = surround;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColor);

    document.documentElement.style.background = surround;
    if (document.body) document.body.style.background = surround;
}

/**
 * Apply a theme. Mutates shared brand tokens in place.
 * @param {ThemeId} id
 * @param {{ persist?: boolean }} [opts]
 */
export function applyTheme(id, { persist = true } = {}) {
    const palette = PALETTES[id] || PALETTES[THEME_LIGHT];
    currentTheme = PALETTES[id] ? id : THEME_LIGHT;
    Object.assign(color, palette);
    refreshDerivedTokens();
    syncPaintConsts();
    syncCssVars();
    syncPageShell();
    clearGlowSpriteCache();
    clearHullCache();
    if (persist) persistTheme(currentTheme);
    return currentTheme;
}

/** Boot helper — load preference and paint tokens before first canvas frame. */
export function initTheme() {
    return applyTheme(loadStoredTheme(), { persist: false });
}

/** Flip light ↔ dark and persist. @returns {ThemeId} */
export function toggleTheme() {
    const next = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    return applyTheme(next);
}
