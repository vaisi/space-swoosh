// LaunchVoice.js
// Per-ship NAV line at round start, plus the subtitle clock from navCues.json.
// Changes:
// - Open Space only. Each ship speaks once per page session, then stays quiet
//   on Play Again, a crash, or a return to that hull. Journey and Hazard Lab
//   never arm a ship line.
// - Subtitles type the display cues, hold 1.2s, then fade. Tags are never shown.

import { hangarEntry } from '../config/HangarLore.js';
import { color, font } from '../brand/tokens.js';
import { PLAY_MODE } from '../modes/RunProfile.js';

const LAST_KEY = 'navLastLineByShip';
const HIDDEN_KEY = 'navHiddenLaunched';
const AUDIO_DELAY_S = 0.6;
const FADE_IN_S = 0.15;
const HOLD_S = 1.2;
const FADE_OUT_S = 0.3;

function readJson(key) {
    try {
        const raw = JSON.parse(localStorage.getItem(key) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
    } catch {
        return {};
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* private mode */
    }
}

function rememberLine(skinId, lineId) {
    const map = readJson(LAST_KEY);
    map[skinId] = lineId;
    writeJson(LAST_KEY, map);
}

function hiddenLaunched(skinId) {
    return Boolean(readJson(HIDDEN_KEY)[skinId]);
}

function markHiddenLaunched(skinId) {
    const map = readJson(HIDDEN_KEY);
    map[skinId] = true;
    writeJson(HIDDEN_KEY, map);
}

function pickLine(skinId) {
    const entry = hangarEntry(skinId);
    const lines = entry?.lines || [];
    if (lines.length === 0) return null;

    if (entry.hidden && !hiddenLaunched(skinId)) {
        markHiddenLaunched(skinId);
        rememberLine(skinId, lines[0].id);
        return lines[0];
    }

    const last = readJson(LAST_KEY)[skinId];
    const pool = lines.filter((line) => line.id !== last);
    const choice = (pool.length ? pool : lines)[Math.floor(Math.random() * (pool.length || lines.length))];
    if (!choice) return null;
    rememberLine(skinId, choice.id);
    return choice;
}

/**
 * Called when controls go live. Journey, Hazard Lab, and a ship already
 * flown this page session stay silent.
 */
export function armLaunchVoice(game, { story = false } = {}) {
    game.launchLine = null;
    game.launchArmAt = null;
    game.launchClock = null;
    game.launchIsRetry = false;
    if (story || game.playMode !== PLAY_MODE.openWorld) return;

    const skinId = game.shipSkinId;
    if (!game.launchShipsHeard) game.launchShipsHeard = new Set();
    if (game.launchShipsHeard.has(skinId)) return;

    const line = pickLine(skinId);
    if (!line) return;
    game.launchShipsHeard.add(skinId);
    game.launchLine = line;
    game.launchArmAt = performance.now();
}

export function tickLaunchVoice(game, now = performance.now()) {
    if (!game.launchLine || game.launchClock != null || game.launchArmAt == null) return;
    if (now < game.launchArmAt + AUDIO_DELAY_S * 1000) return;
    game.launchClock = now;
    const file = game.launchLine.file;
    if (file) game.soundManager?.playCueVoice?.(file);
}

function subtitleBody(line, elapsed) {
    let out = '';
    for (const cue of line.cues || []) {
        const text = cue.text || '';
        if (elapsed >= cue.end) {
            out = out ? `${out} ${text}` : text;
            continue;
        }
        if (elapsed < cue.start) break;
        const span = Math.max(0.05, cue.end - cue.start);
        const count = Math.max(1, Math.ceil(text.length * Math.min(1, (elapsed - cue.start) / span)));
        const partial = text.slice(0, count);
        out = out ? `${out} ${partial}` : partial;
        break;
    }
    return out;
}

export function paintLaunchSubtitle(game) {
    const line = game.launchLine;
    if (!line || game.launchClock == null) return;
    const elapsed = (performance.now() - game.launchClock) / 1000;
    const est = Number(line.est_seconds) || 0;
    const holdEnd = est + HOLD_S;
    const fadeOutEnd = holdEnd + FADE_OUT_S;
    if (elapsed >= fadeOutEnd) {
        game.launchLine = null;
        return;
    }
    let alpha = 1;
    if (elapsed < FADE_IN_S) alpha = elapsed / FADE_IN_S;
    else if (elapsed > holdEnd) alpha = 1 - (elapsed - holdEnd) / FADE_OUT_S;
    const text = subtitleBody(line, elapsed);
    if (!text || alpha <= 0.01) return;

    const ctx = game.ctx;
    const unit = game.baseUnit;
    const px = Math.max(14, Math.min(unit * 1.35, 18));
    const maxW = game.width * 0.86;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${px}px ${font.ui}`;
    const words = text.split(/\s+/);
    const lines = [];
    let row = '';
    for (const word of words) {
        const next = row ? `${row} ${word}` : word;
        if (row && ctx.measureText(next).width > maxW) {
            lines.push(row);
            row = word;
        } else {
            row = next;
        }
    }
    if (row) lines.push(row);
    const y0 = game.height * 0.72;
    lines.forEach((lineText, i) => {
        const y = y0 + i * px * 1.35;
        ctx.fillStyle = color.ink;
        ctx.globalAlpha = alpha;
        ctx.fillText(lineText, game.width / 2, y);
    });
    ctx.restore();
}
