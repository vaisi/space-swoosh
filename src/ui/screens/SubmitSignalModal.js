// SubmitSignalModal.js
// Submit Signal canvas sheet. Changes: keyboard-open layout fills the
// remaining viewport above the IME (header, one recap line, call-sign
// field, Submit docked at the bottom). Idle stays a stacked stats card.
// Playtest: ?signal=1 opens sample stats; ?kb=N fakes IME height.

import { color } from '../../brand/tokens.js';
import { CALL_SIGN_MAX_LEN } from '../../services/NameFilter.js';
import { ScoreService } from '../../services/ScoreService.js';
import { dottedLine } from '../../utils/DrawUtils.js';
import {
    drawFramedTile,
    resetType,
    setLabelType,
    setMonoType,
} from '../../utils/BrandDraw.js';
function markImeOpen(open) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('ss-ime-open', !!open);
}

const PLAYTEST_SCORE = 17797;
const PLAYTEST_ASTEROIDS = 3;
const PLAYTEST_RANK = 68;

/**
 * `?signal=1` opens the modal with sample stats. `?kb=320` fakes IME height.
 * Call after game.start() so showMenu does not wipe the screen.
 *
 * @param {import('../../game/Game.js').Game} game
 */
export function applySubmitSignalPlaytest(game) {
    if (typeof window === 'undefined') return;
    let params;
    try {
        params = new URLSearchParams(window.location.search);
    } catch {
        return;
    }
    if (!params.has('signal')) return;

    game.appScreen = 'gameover';
    game.isGameOver = true;
    game.gameOverAlpha = 1;
    // Sit past updateExplosion's Mission Failed fade window so the sheet
    // stays up on the first frame (alpha would otherwise drop mid-ramp).
    game.gameOverStartTime = performance.now() - 10000;
    game.gameOverScreen = 'main';
    game.runOutcome = null;
    game.finalScore = PLAYTEST_SCORE;
    game.obstaclesDestroyed = PLAYTEST_ASTEROIDS;
    game.currentRank = PLAYTEST_RANK;
    game.pendingHighScore = {
        score: PLAYTEST_SCORE,
        obstaclesDestroyed: PLAYTEST_ASTEROIDS,
        isWinner: false,
        shouldPromptName: true,
        rank: PLAYTEST_RANK,
    };

    const kb = Number(params.get('kb'));
    if (Number.isFinite(kb) && kb > 0) {
        game.softKeyboardHeight = kb;
        game.playtestKeyboardHeight = kb;
        markImeOpen(true);
    }
}

/**
 * Paint the Submit Signal modal. Sets game.closeButton and game.submitButton.
 *
 * @param {import('../../game/Game.js').Game} game
 */
export function paintSubmitSignal(game) {
    const ctx = game.ctx;
    ctx.fillStyle = color.paper;
    ctx.fillRect(0, 0, game.width, game.height);

    const view = game.getVisibleCanvasBounds();
    if (game.isSoftKeyboardOpen()) {
        paintKeyboardSheet(game, view);
        return;
    }
    paintIdleCard(game, view);
}

function rankLabel(game) {
    const rank = game.pendingHighScore?.rank ?? game.currentRank;
    if (rank == null || rank === '') return '#?';
    const text = String(rank);
    return text.startsWith('#') ? text : `#${text}`;
}

function recapCopy(game) {
    return {
        values: `${ScoreService.formatScore(game.finalScore)} KM  ·  ${ScoreService.formatScore(game.obstaclesDestroyed)}  ·  ${rankLabel(game)}`,
        captions: 'DISTANCE  ·  ASTEROIDS  ·  RANK',
    };
}

function ensureCallSignInput(game) {
    if (game.nameInput) return game.nameInput;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = CALL_SIGN_MAX_LEN;
    input.placeholder = 'ENTER CALL SIGN';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'done';
    // 16px minimum avoids Android WebView zoom-on-focus.
    input.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        box-sizing: border-box;
        font-size: 16px;
        border: none;
        border-bottom: 2px solid var(--ss-ink, #1A1A1A);
        border-radius: 0;
        outline: none;
        padding: 0 4px;
        background: transparent;
        color: var(--ss-ink, #1A1A1A);
        font-family: var(--ss-font-ui, 'Space Grotesk', 'Segoe UI', system-ui, sans-serif);
        font-weight: 500;
        letter-spacing: 0.04em;
        z-index: 5;
    `;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            game.submitHighScore(input.value.trim());
        }
    });
    const parent = game.canvas.parentElement || document.body;
    parent.appendChild(input);
    game.nameInput = input;
    return input;
}

function placeCallSignInput(game, x, y, width, height) {
    const input = ensureCallSignInput(game);
    const parent = game.canvas.parentElement || document.body;
    const canvasRect = game.canvas.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const sx = canvasRect.width / Math.max(1, game.width);
    const sy = canvasRect.height / Math.max(1, game.height);
    input.style.left = `${(canvasRect.left - parentRect.left) + x * sx}px`;
    input.style.top = `${(canvasRect.top - parentRect.top) + y * sy}px`;
    input.style.width = `${width * sx}px`;
    input.style.height = `${height * sy}px`;
}

function paintCloseX(game, x, y, size) {
    const ctx = game.ctx;
    game.closeButton = { x, y, width: size, height: size };
    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 7);
    ctx.lineTo(x + size - 7, y + size - 7);
    ctx.moveTo(x + size - 7, y + 7);
    ctx.lineTo(x + 7, y + size - 7);
    ctx.stroke();
    ctx.restore();
}

function paintHeaderRow(game, left, right, y, titlePx) {
    const ctx = game.ctx;
    const closeSize = 28;
    paintCloseX(game, right - closeSize, y, closeSize);

    ctx.save();
    setLabelType(ctx, titlePx);
    ctx.fillStyle = color.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT SIGNAL', left, y + closeSize / 2);
    resetType(ctx);
    ctx.restore();

    return y + closeSize;
}

function paintRecap(game, left, y) {
    const ctx = game.ctx;
    const recap = recapCopy(game);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    setMonoType(ctx, 16);
    ctx.fillStyle = color.ink;
    ctx.fillText(recap.values, left, y + 16);
    setLabelType(ctx, 9);
    ctx.fillStyle = color.ink55;
    ctx.fillText(recap.captions, left, y + 16 + 8 + 10);
    resetType(ctx);
    ctx.restore();
    return y + 16 + 8 + 10;
}

function paintCallSignBlock(game, left, width, y, fieldH) {
    const ctx = game.ctx;
    ctx.save();
    setLabelType(ctx, 10);
    ctx.fillStyle = color.ink55;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CALL SIGN', left, y + 10);
    resetType(ctx);
    ctx.restore();

    const fieldY = y + 18;
    placeCallSignInput(game, left, fieldY, width, fieldH);
    return fieldY + fieldH;
}

function paintError(game, left, y) {
    if (!game.submitError) return y;
    const ctx = game.ctx;
    ctx.save();
    setLabelType(ctx, 10);
    ctx.fillStyle = color.signal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(game.submitError).toUpperCase(), left, y + 12);
    resetType(ctx);
    ctx.restore();
    return y + 20;
}

function paintSubmit(game, left, y, width, height) {
    game.submitButton = game.drawBrandButton(
        left, y, width, height, 'Submit', {
            primary: true,
            tag: '\u2191',
        }
    );
    game.submitButton.enabled = !!(game.nameInput?.value && game.nameInput.value.trim().length > 0);
    return y + height;
}

function paintKeyboardSheet(game, view) {
    const margin = 16;
    const pad = 24;
    const sheet = {
        x: margin,
        y: view.top + margin,
        w: Math.max(200, game.width - margin * 2),
        h: Math.max(240, view.height - margin * 2),
    };
    const left = sheet.x + pad;
    const right = sheet.x + sheet.w - pad;
    const width = right - left;
    const fieldH = 48;
    const buttonH = 52;

    drawFramedTile(game.ctx, sheet.x, sheet.y, sheet.w, sheet.h, { surface: color.paperTint });

    let y = paintHeaderRow(game, left, right, sheet.y + pad, 12);
    y += 20;
    y = paintRecap(game, left, y);
    y += 20;
    dottedLine(game.ctx, left, right, y, 1.4, 7, color.ink30);
    y += 20;
    y = paintCallSignBlock(game, left, width, y, fieldH);
    y = paintError(game, left, y + 8);

    const submitY = sheet.y + sheet.h - pad - buttonH;
    paintSubmit(game, left, Math.max(y + 16, submitY), width, buttonH);
}

function paintIdleCard(game, view) {
    const ctx = game.ctx;
    const pad = 28;
    const fieldH = 44;
    const buttonH = 50;
    const modalWidth = Math.min(360, game.width * 0.88);
    const modalHeight = Math.min(460, Math.max(320, view.height - 32));
    const modalX = (game.width - modalWidth) / 2;
    const modalY = view.top + Math.max(16, (view.height - modalHeight) / 2);
    const left = modalX + pad;
    const right = modalX + modalWidth - pad;
    const width = right - left;

    drawFramedTile(ctx, modalX, modalY, modalWidth, modalHeight, { surface: color.paperTint });

    let y = paintHeaderRow(game, left, right, modalY + pad, 12);
    y += 20;
    dottedLine(ctx, left, right, y, 1.4, 7, color.ink30);
    y += 24;
    y = paintStackedStat(ctx, left, y, ScoreService.formatScore(game.finalScore), 'KM', 'DISTANCE');
    y = paintStackedStat(ctx, left, y, ScoreService.formatScore(game.obstaclesDestroyed), null, 'ASTEROIDS DESTROYED');
    y = paintStackedStat(ctx, left, y, rankLabel(game), null, 'YOUR RANK');
    dottedLine(ctx, left, right, y, 1.4, 7, color.ink30);
    y += 22;
    y = paintCallSignBlock(game, left, width, y, fieldH);
    y = paintError(game, left, y + 8);
    paintSubmit(game, left, y + 18, width, buttonH);
}

function paintStackedStat(ctx, left, y, value, unitLabel, caption) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    setMonoType(ctx, 28);
    ctx.fillStyle = color.ink;
    ctx.fillText(value, left, y + 26);
    if (unitLabel) {
        const cursor = left + ctx.measureText(value).width;
        setLabelType(ctx, 11);
        ctx.fillStyle = color.ink55;
        ctx.fillText(unitLabel, cursor + 8, y + 26);
    }
    setLabelType(ctx, 10);
    ctx.fillStyle = color.ink55;
    ctx.fillText(caption, left, y + 26 + 8 + 12);
    resetType(ctx);
    ctx.restore();
    return y + 26 + 8 + 12 + 22;
}
