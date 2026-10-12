// HangarScreen.js
// Full-screen ship launch step. The stage is a window onto Spacecraft.update,
// the same flight step a run uses. Copy comes from HangarLore.
// Changes:
// - Layout matches the 390×844 hangar mock: stage 372 tall, hint inside the
//   stage, 1px rule between stage and copy, copy block 214, ruler 48,
//   Launch bar inset 16 and full of that width. Slack sits above the bar.
// - Ruler ticks match the mock: owned 2×16, locked hollow 4×11, unlisted
//   hollow 4×7, current 3×30 signal, new hull a 5px dot, 12px gap before
//   the unlisted pair.
// - Locked and unlisted hulls draw in color. The flight lane is inset so
//   Merlin and Rook's hull and wake stay inside the stage. The bar still
//   shows the price or Locked, and those hulls still cannot be equipped.
//   Launch on Merlin or Rook keeps the last owned ship, unless `?anyship=1`.

import { color, font } from '../../brand/tokens.js';
import { resetType, setDisplayType, setLabelType, setMonoType } from '../../utils/BrandDraw.js';
import { wrapLines } from '../ScreenKit.js';
import { skins } from '../../ships/skins.js';
import {
    createHangarFlight,
    drawHangarFlight,
    flipHangarFlight,
    stepHangarFlight,
} from '../../ships/hangarFlight.js';
import {
    HANGAR_ROSTER,
    hangarFileLabel,
    hangarIndexOf,
    hangarOnFile,
    isHangarNew,
    markHangarSeen,
} from '../../config/HangarLore.js';
import { getSkinPriceLabel, isSkinOwned, purchaseSkin, unlockAllSkinsEnabled } from '../../services/Entitlements.js';
import { saveShipSkinId } from '../../ships/skins.js';
import { setUserProperty, track } from '../../services/Analytics.js';
import { hapticWallBoop } from '../../native/index.js';

const SWIPE_PX = 36;
const MOCK_W = 390;
// headerTop 22 + header 44 + stageGap 6 + stage 372 + copy 214 + ruler 48
// + launchGap 18 + launch 58 + launchPad 26
const MOCK_STACK = 808;
const RULE = '#2e2c27';

function entryAt(index) {
    const count = HANGAR_ROSTER.length;
    if (count === 0) return null;
    const i = Math.max(0, Math.min(count - 1, index));
    return HANGAR_ROSTER[i];
}

function skinFor(entry) {
    return entry ? skins[entry.id] : null;
}

function modeLabel(game) {
    return game.hangarLaunch?.mode === 'journey' ? 'JOURNEY' : 'OPEN SPACE';
}

function rosterGroups() {
    const listed = [];
    const hidden = [];
    HANGAR_ROSTER.forEach((entry, index) => {
        (entry.hidden ? hidden : listed).push(index);
    });
    return { listed, hidden };
}

function metrics(game) {
    const k = Math.min(game.width / MOCK_W, game.height / MOCK_STACK);
    const colW = MOCK_W * k;
    const x = (game.width - colW) / 2;
    const slack = Math.max(0, game.height - MOCK_STACK * k);
    const headerTop = 22 * k;
    const headerH = 44 * k;
    const stageTop = headerTop + headerH + 6 * k;
    const stageH = 372 * k;
    const stageBottom = stageTop + stageH;
    const copyH = 214 * k;
    const rulerTop = stageBottom + copyH;
    const rulerH = 48 * k;
    const launchH = 58 * k;
    const launchY = rulerTop + rulerH + slack + 18 * k;
    return {
        k,
        x,
        colW,
        headerTop,
        headerH,
        stageTop,
        stageH,
        stageBottom,
        copyTop: stageBottom,
        copyH,
        rulerTop,
        rulerH,
        launchY,
        launchH,
        inset16: 16 * k,
        inset26: 26 * k,
        seatY: stageTop + 168 * k,
        textLeft: x + 26 * k,
        textWidth: colW - 52 * k,
    };
}

export function resetHangar(game) {
    game.hangarIndex = hangarIndexOf(game.shipSkinId);
    game.hangarFlight = null;
    game.hangarSuppressClick = false;
    const entry = entryAt(game.hangarIndex);
    if (entry && !entry.hidden && isSkinOwned(entry.id)) markHangarSeen(entry.id);
}

function setIndex(game, index, { haptic = false } = {}) {
    const count = HANGAR_ROSTER.length;
    const next = Math.max(0, Math.min(count - 1, index));
    if (next === game.hangarIndex) return;
    game.hangarIndex = next;
    game.hangarFlight = null;
    if (haptic) hapticWallBoop();
    const entry = entryAt(next);
    if (entry && !entry.hidden && isSkinOwned(entry.id)) markHangarSeen(entry.id);
}

function ensureFlight(game, slot, skinId, worldWidth) {
    const flight = game[slot];
    const widthJump = flight && Math.abs((flight.stageWidth || 0) - worldWidth) > 2;
    const heightJump = flight && Math.abs(flight.host.height - game.height) > 2;
    const unitJump = flight && Math.abs(flight.ship.radius - game.baseUnit) > 0.5;
    if (!flight || flight.skinId !== skinId || widthJump || heightJump || unitJump) {
        game[slot] = createHangarFlight(game, skinId, worldWidth);
    }
    return game[slot];
}

function drawChevron(ctx, x, y, dir, size) {
    ctx.beginPath();
    ctx.moveTo(x - dir * size * 0.28, y - size * 0.42);
    ctx.lineTo(x + dir * size * 0.38, y);
    ctx.lineTo(x - dir * size * 0.28, y + size * 0.42);
    ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function drawRule(ctx, x, y, w) {
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + w, y + 0.5);
    ctx.stroke();
    ctx.restore();
}

function drawLaunchBar(ctx, x, y, w, h, left, right, k) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 6 * k);
    ctx.fillStyle = color.ink;
    ctx.fill();

    const pad = 20 * k;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color.paper;
    setLabelType(ctx, 18 * k, 700);
    ctx.textAlign = 'left';
    ctx.fillText(String(left).toUpperCase(), x + pad, y + h / 2 + 1);
    resetType(ctx);

    if (right) {
        setMonoType(ctx, 12 * k, 500);
        ctx.textAlign = 'right';
        ctx.fillStyle = color.paper;
        ctx.globalAlpha = 0.7;
        ctx.fillText(String(right).toUpperCase(), x + w - pad, y + h / 2 + 1);
        resetType(ctx);
    }
    ctx.restore();
    return { x, y, width: w, height: h };
}

export function renderHangar(game) {
    const ctx = game.ctx;
    const m = metrics(game);
    const index = game.hangarIndex ?? hangarIndexOf(game.shipSkinId);
    const entry = entryAt(index);
    const skin = skinFor(entry);
    const flyable = Boolean(entry && isSkinOwned(entry.id) && (!entry.hidden || unlockAllSkinsEnabled()));
    const hidden = Boolean(entry?.hidden);
    const locked = Boolean(entry && !hidden && !flyable);
    const onFile = hangarOnFile();
    game.hangarMetrics = m;

    drawHangarHeader(ctx, m, modeLabel(game), onFile);

    if (skin) {
        const flight = ensureFlight(game, 'hangarFlight', entry.id, m.colW);
        stepHangarFlight(flight, game);
        const margin = flight.margin || 0;
        ctx.save();
        ctx.translate(m.x + margin, 0);
        drawHangarFlight(ctx, flight, m.seatY, {
            x: -margin,
            y: m.stageTop,
            w: m.colW,
            h: m.stageH,
        });
        ctx.restore();
    }

    const hintY = m.stageBottom - 4 * m.k - 22 * m.k;
    const chevronSize = 14 * m.k;
    ctx.save();
    ctx.strokeStyle = color.ink55;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawChevron(ctx, m.x + 8 * m.k + 18 * m.k, hintY, -1, chevronSize);
    drawChevron(ctx, m.x + m.colW - 8 * m.k - 18 * m.k, hintY, 1, chevronSize);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setMonoType(ctx, 10.5 * m.k, 400);
    ctx.fillStyle = '#8f887a';
    ctx.fillText('TAP TO TEST  ·  SWIPE TO BROWSE', m.x + m.colW / 2, hintY);
    resetType(ctx);
    ctx.restore();

    drawRule(ctx, m.x + m.inset16, m.stageBottom, m.colW - m.inset16 * 2);

    const typePx = 11 * m.k;
    const namePx = 38 * m.k;
    const notePx = 15 * m.k;
    let cursor = m.copyTop + 14 * m.k;

    ctx.save();
    ctx.beginPath();
    ctx.rect(m.x, m.copyTop, m.colW, m.copyH);
    ctx.clip();

    ctx.textBaseline = 'top';
    setMonoType(ctx, typePx, 400);
    ctx.textAlign = 'left';
    ctx.fillStyle = color.ink55;
    ctx.fillText(hangarFileLabel(entry).toUpperCase(), m.textLeft, cursor);
    if (!hidden && entry?.filedAs) {
        ctx.textAlign = 'right';
        ctx.fillStyle = color.signal;
        ctx.fillText(`FILED AS ${entry.filedAs.toUpperCase()}`, m.textLeft + m.textWidth, cursor);
    }
    resetType(ctx);

    cursor += typePx + 10 * m.k;
    const title = hidden && !flyable ? 'Unlisted' : (entry?.name || '');
    setDisplayType(ctx, namePx);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color.ink;
    ctx.fillText(title, m.textLeft, cursor);
    resetType(ctx);

    cursor += namePx * 1.05 + 10 * m.k;
    if (!hidden && entry?.archiveNote) {
        ctx.font = `500 ${notePx}px ${font.ui}`;
        const noteLines = wrapLines(ctx, entry.archiveNote, m.textWidth, 4);
        ctx.fillStyle = color.ink55;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        noteLines.forEach((line, i) => {
            ctx.fillText(line, m.textLeft, cursor + i * notePx * 1.5);
        });
    }
    if (game.purchaseStatus) {
        setMonoType(ctx, 11 * m.k, 400);
        ctx.fillStyle = color.signal;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(game.purchaseStatus).toUpperCase(), m.textLeft, m.copyTop + m.copyH - 4 * m.k);
        resetType(ctx);
    }
    ctx.restore();

    drawRuler(ctx, m, index);
    drawRule(ctx, m.x + m.inset16, m.rulerTop + m.rulerH, m.colW - m.inset16 * 2);

    const barX = m.x + m.inset16;
    const barW = m.colW - m.inset16 * 2;
    let barLeft = 'Launch';
    let barRight = hidden && !flyable ? '' : (entry?.name || '');
    if (locked) {
        barLeft = getSkinPriceLabel(entry.id) || 'Locked';
        barRight = entry?.name || '';
    }
    const launch = drawLaunchBar(ctx, barX, m.launchY, barW, m.launchH, barLeft, barRight, m.k);

    const hit = Math.max(44, 44 * m.k);
    game.hangarButtons = {
        back: { x: m.x, y: m.headerTop - 8 * m.k, width: hit, height: m.headerH + 16 * m.k },
        prev: { x: m.x, y: hintY - hit / 2, width: hit, height: hit },
        next: { x: m.x + m.colW - hit, y: hintY - hit / 2, width: hit, height: hit },
        launch,
        ship: { x: m.x, y: m.stageTop, width: m.colW, height: Math.max(44, m.stageH - 48 * m.k) },
        ruler: { x: m.x + m.inset16, y: m.rulerTop, width: m.colW - m.inset16 * 2, height: m.rulerH },
    };
    return game.hangarButtons;
}

function drawHangarHeader(ctx, m, eyebrow, onFile) {
    const mid = m.headerTop + m.headerH * 0.5;
    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawChevron(ctx, m.x + 8 * m.k + 12 * m.k, mid, -1, 10 * m.k);

    setMonoType(ctx, 10.5 * m.k, 400);
    ctx.fillStyle = color.ink55;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${onFile.owned}/${onFile.listed}`, m.x + m.colW - 12 * m.k, mid - 7 * m.k);
    ctx.fillText('ON FILE', m.x + m.colW - 12 * m.k, mid + 7 * m.k);
    resetType(ctx);

    ctx.textAlign = 'center';
    setMonoType(ctx, 10.5 * m.k, 400);
    ctx.fillStyle = color.ink55;
    ctx.fillText(eyebrow, m.x + m.colW / 2, mid - 11 * m.k);
    resetType(ctx);

    setDisplayType(ctx, 16 * m.k);
    ctx.fillStyle = color.ink;
    ctx.fillText('The Hangar', m.x + m.colW / 2, mid + 8 * m.k);
    resetType(ctx);
    ctx.restore();
}

function tickSlot(m) {
    const { listed, hidden } = rosterGroups();
    const gap = 12 * m.k;
    const width = m.colW - m.inset16 * 2;
    const slots = Math.max(1, listed.length + hidden.length);
    const slotW = (width - gap) / slots;
    return { listed, hidden, gap, slotW, origin: m.x + m.inset16 };
}

function drawTickMark(ctx, x, bottom, w, h, fill, hollow) {
    if (hollow) {
        ctx.strokeStyle = fill;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w / 2, bottom - h, w, h);
        return;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x - w / 2, bottom - h, w, h);
}

function drawRuler(ctx, m, index) {
    const { listed, hidden, gap, slotW, origin } = tickSlot(m);
    const bottom = m.rulerTop + m.rulerH;
    const k = m.k;
    ctx.save();
    const paint = (rosterIndex, x) => {
        const entry = HANGAR_ROSTER[rosterIndex];
        const here = rosterIndex === index;
        const owned = !entry.hidden && isSkinOwned(entry.id);
        let w = 2 * k;
        let h = 16 * k;
        let hollow = false;
        let fill = color.ink;
        if (entry.hidden) {
            hollow = true;
            w = 4 * k;
            h = 7 * k;
            fill = 'rgba(220, 212, 192, 0.35)';
        } else if (!owned) {
            hollow = true;
            w = 4 * k;
            h = 11 * k;
            fill = 'rgba(220, 212, 192, 0.5)';
        }
        if (here) {
            hollow = false;
            w = 3 * k;
            h = 30 * k;
            fill = color.signal;
        } else if (owned) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            drawTickMark(ctx, x, bottom, w, h, fill, false);
            ctx.restore();
        } else {
            drawTickMark(ctx, x, bottom, w, h, fill, hollow);
        }
        if (here) drawTickMark(ctx, x, bottom, w, h, fill, false);
        if (isHangarNew(entry.id)) {
            ctx.fillStyle = color.signal;
            ctx.beginPath();
            ctx.arc(x, m.rulerTop + 8 * k, 2.5 * k, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    listed.forEach((rosterIndex, slot) => paint(rosterIndex, origin + slot * slotW + slotW / 2));
    ctx.fillStyle = '#5d584f';
    ctx.font = `500 ${9 * k}px ${font.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const hiddenX = origin + listed.length * slotW + gap;
    ctx.fillText('·', hiddenX - gap / 2, bottom - 1 * k);
    hidden.forEach((rosterIndex, slot) => paint(rosterIndex, hiddenX + slot * slotW + slotW / 2));
    ctx.restore();
}

function indexFromRuler(game, x) {
    const m = game.hangarMetrics;
    if (!m) return game.hangarIndex || 0;
    const { listed, hidden, gap, slotW, origin } = tickSlot(m);
    let local = x - origin;
    if (local < listed.length * slotW) {
        const slot = Math.max(0, Math.min(listed.length - 1, Math.floor(local / slotW)));
        return listed[slot];
    }
    local -= listed.length * slotW + gap;
    if (local < 0 || hidden.length === 0) return game.hangarIndex || 0;
    const slot = Math.max(0, Math.min(hidden.length - 1, Math.floor(local / slotW)));
    return hidden[slot];
}

let pointer = null;

export function stepHangar(game, delta) {
    setIndex(game, (game.hangarIndex || 0) + delta, { haptic: true });
}

export function hangarPointerDown(game, x, y) {
    const ruler = game.hangarButtons?.ruler;
    const onRuler = game.isClickInButton(x, y, ruler);
    pointer = { x, y, onRuler, moved: false, index: game.hangarIndex };
    if (onRuler) {
        const next = indexFromRuler(game, x);
        if (next !== game.hangarIndex) setIndex(game, next, { haptic: true });
    }
}

export function hangarPointerMove(game, x, y) {
    if (!pointer) return;
    if (Math.hypot(x - pointer.x, y - pointer.y) > 8) pointer.moved = true;
    if (!pointer.onRuler) return;
    const next = indexFromRuler(game, x);
    if (next !== game.hangarIndex) setIndex(game, next, { haptic: true });
}

export function hangarPointerUp(game, x, y) {
    const start = pointer;
    pointer = null;
    if (!start) return false;
    const dx = x - start.x;
    const dy = y - start.y;
    if (start.onRuler && start.moved) {
        game.hangarSuppressClick = true;
        return true;
    }
    if (!start.onRuler && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.1) {
        setIndex(game, (game.hangarIndex || 0) + (dx < 0 ? 1 : -1), { haptic: true });
        game.hangarSuppressClick = true;
        return true;
    }
    return false;
}

export async function handleHangarClick(game, x, y) {
    if (game.hangarSuppressClick) {
        game.hangarSuppressClick = false;
        return true;
    }
    const buttons = game.hangarButtons;
    if (!buttons) return false;
    if (game.isClickInButton(x, y, buttons.back)) {
        const ret = game.hangarLaunch?.returnScreen || 'modeSelect';
        if (ret === 'journeyMap') game.goToJourneyMap();
        else if (ret === 'optionsShip') {
            game.appScreen = 'optionsShip';
            game.updatePauseButtonVisibility();
        } else if (ret === 'menu') game.showMenu();
        else game.goToModeSelect();
        return true;
    }
    if (game.isClickInButton(x, y, buttons.prev)) {
        stepHangar(game, -1);
        return true;
    }
    if (game.isClickInButton(x, y, buttons.next)) {
        stepHangar(game, 1);
        return true;
    }
    const entry = entryAt(game.hangarIndex ?? 0);
    if (game.isClickInButton(x, y, buttons.launch)) {
        if (entry && !entry.hidden && !isSkinOwned(entry.id)) {
            await buyFromHangar(game, entry.id);
            return true;
        }
        if (entry && isSkinOwned(entry.id) && (!entry.hidden || unlockAllSkinsEnabled())) {
            if (game.shipSkinId !== entry.id) {
                game.shipSkinId = saveShipSkinId(entry.id);
                game.menuShipBrowseId = entry.id;
                track('equip_ship', { ship_id: entry.id });
                setUserProperty('equipped_ship', entry.id);
            }
            markHangarSeen(entry.id);
        }
        game.launchFromHangar();
        return true;
    }
    if (game.isClickInButton(x, y, buttons.ship)) {
        if (game.hangarFlight) flipHangarFlight(game.hangarFlight);
        return true;
    }
    return false;
}

async function buyFromHangar(game, skinId) {
    if (game.purchaseBusy) return;
    game.purchaseBusy = true;
    game.setPurchaseStatus('Contacting store…', 0);
    try {
        const result = await purchaseSkin(skinId);
        if (result.ok) {
            game.shipSkinId = saveShipSkinId(skinId);
            game.menuShipBrowseId = skinId;
            markHangarSeen(skinId);
            game.hangarFlight = null;
            game.setPurchaseStatus('Unlocked.');
            track('purchase_skin', { skin_id: skinId });
            track('equip_ship', { ship_id: skinId });
            setUserProperty('equipped_ship', skinId);
        } else if (result.cancelled) {
            game.setPurchaseStatus(null, 0);
        } else {
            game.setPurchaseStatus(result.message || 'Purchase unavailable.');
        }
    } finally {
        game.purchaseBusy = false;
    }
}

