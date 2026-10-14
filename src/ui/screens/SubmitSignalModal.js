// SubmitSignalModal.js
// Submit Signal canvas sheet. Changes: one card for idle and keyboard —
// distance (no KM) and the call sign. No asteroids, rank, or character
// count. The card stays centered in the space above the IME instead of
// pinning to the top. The call-sign field starts with the last saved name.
// Playtest: ?signal=1 opens sample stats; ?kb=N fakes IME height.
// ?death=1 paints the Mission Failed strip without opening the sheet.
// The fixture includes n−2 and n+2 so the wider neighborhood is visible.

import { color } from '../../brand/tokens.js';
import { CALL_SIGN_MAX_LEN } from '../../services/NameFilter.js';
import { ScoreService } from '../../services/ScoreService.js';
import { dottedLine } from '../../utils/DrawUtils.js';
import {
    drawFramedTile,
    resetType,
    setHintType,
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
    if (params.has('death')) {
        game.appScreen = 'gameover';
        game.isGameOver = true;
        game.gameOverAlpha = 1;
        game.gameOverStartTime = performance.now() - 10000;
        game.gameOverScreen = 'main';
        game.runOutcome = null;
        game.finalScore = 4280;
        game.obstaclesDestroyed = 1;
        game.sparklesCollected = 0;
        game.currentRank = 113;
        game.shipSkinId = 'saber';
        game.scorePreview = {
            rank: 113,
            top: { name: 'Adrian Nastase', score: 189720, shipId: 'ember' },
            above: [
                { name: 'Benzz', score: 4778, shipId: 'echo', rank: 112 },
                { name: 'try a swoosh', score: 8885, shipId: 'echo', rank: 111 },
            ],
            below: [
                { name: 'okok', score: 4089, shipId: 'flicker', rank: 114 },
                { name: 'alcoholic', score: 3900, shipId: 'nyan', rank: 115 },
            ],
        };
        game.pendingHighScore = null;
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

    if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) {
        window.scrollTo(0, 0);
    }

    paintSignalCard(game, game.getVisibleCanvasBounds());
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
        border-radius: 0;
        outline: none;
        padding: 0;
        background: transparent;
        color: var(--ss-ink, #1A1A1A);
        font-family: var(--ss-font-ui, 'Space Grotesk', 'Segoe UI', system-ui, sans-serif);
        font-weight: 600;
        font-size: 32px;
        letter-spacing: 0.06em;
        z-index: 5;
    `;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            game.submitHighScore(input.value.trim());
        }
    });
    const holdPage = () => {
        if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) {
            window.scrollTo(0, 0);
        }
    };
    input.addEventListener('focus', () => {
        holdPage();
        setTimeout(holdPage, 60);
        setTimeout(holdPage, 280);
    });
    const parent = game.canvas.parentElement || document.body;
    parent.appendChild(input);
    try {
        const saved = localStorage.getItem('playerName');
        if (saved && saved.trim()) input.value = saved.trim();
    } catch {
        // A missing call sign just leaves the field empty.
    }
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

function cardMetrics(game) {
    const pad = 28;
    const distPx = 56;
    const fieldH = 52;
    const buttonH = 52;
    const errorH = game.submitError ? 28 : 0;
    const h = pad
        + 28 + 26
        + distPx + 38
        + 18
        + 24
        + fieldH + 14
        + 18
        + errorH
        + 22
        + buttonH
        + pad;
    return { pad, distPx, fieldH, buttonH, h };
}

function paintTransmit(game, x, y, w, h) {
    const ctx = game.ctx;
    ctx.save();
    ctx.fillStyle = color.signal;
    ctx.fillRect(x, y, w, h);
    setLabelType(ctx, Math.min(15, h * 0.3));
    ctx.fillStyle = '#101418';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TRANSMIT  \u2191', x + w / 2, y + h / 2 + 1);
    resetType(ctx);
    ctx.restore();
    game.submitButton = { x, y, width: w, height: h };
    game.submitButton.enabled = !!(game.nameInput?.value && game.nameInput.value.trim().length > 0);
}

function paintSignalCard(game, view) {
    const ctx = game.ctx;
    const metrics = cardMetrics(game);
    const modalWidth = Math.min(400, Math.max(280, game.width - 32));
    const modalX = (game.width - modalWidth) / 2;
    const availTop = view.top + 8;
    const availBottom = view.top + view.height - 8;
    const availH = Math.max(0, availBottom - availTop);
    let modalY = availTop + Math.max(0, (availH - metrics.h) / 2);
    if (metrics.h > availH) modalY = Math.max(availTop, availBottom - metrics.h);

    const { pad, distPx, fieldH, buttonH } = metrics;
    const left = modalX + pad;
    const right = modalX + modalWidth - pad;
    const width = right - left;

    drawFramedTile(ctx, modalX, modalY, modalWidth, metrics.h, { surface: color.paperTint });

    let y = paintHeaderRow(game, left, right, modalY + pad, 12);
    y += 26;

    const dist = ScoreService.formatScore(game.finalScore ?? 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setMonoType(ctx, distPx);
    ctx.fillStyle = color.ink;
    ctx.fillText(dist, modalX + modalWidth / 2, y + distPx * 0.42);
    resetType(ctx);
    ctx.restore();
    y += distPx;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setLabelType(ctx, 11);
    ctx.fillStyle = color.ink55;
    ctx.fillText('DISTANCE', modalX + modalWidth / 2, y + 8);
    resetType(ctx);
    ctx.restore();
    y += 16 + 22;

    dottedLine(ctx, left, right, y, 1.4, 7, color.ink30);
    y += 18;

    ctx.save();
    setLabelType(ctx, 11);
    ctx.fillStyle = color.ink55;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CALL SIGN', left, y + 12);
    resetType(ctx);
    ctx.restore();
    y += 16 + 8;

    placeCallSignInput(game, left, y, width, fieldH - 4);
    const focused = typeof document !== 'undefined' && document.activeElement === game.nameInput;
    ctx.save();
    ctx.strokeStyle = focused ? color.signal : color.ink30;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, y + fieldH);
    ctx.lineTo(right, y + fieldH);
    ctx.stroke();
    ctx.restore();
    y += fieldH + 14;

    ctx.save();
    const hint = 'This is how the Index will remember you.';
    let hintPx = 13;
    setHintType(ctx, hintPx);
    while (hintPx > 10 && ctx.measureText(hint).width > width) {
        hintPx -= 0.5;
        setHintType(ctx, hintPx);
    }
    ctx.fillStyle = color.ink55;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(hint, left, y + 14);
    resetType(ctx);
    ctx.restore();
    y += 18;

    if (game.submitError) {
        ctx.save();
        setLabelType(ctx, 10);
        ctx.fillStyle = color.signal;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(String(game.submitError).toUpperCase(), left, y + 16);
        resetType(ctx);
        ctx.restore();
        y += 28;
    }

    y += 22;
    paintTransmit(game, left, y, width, buttonH);
}
