// AnnualShipPickScreen.js
// One-time yearly Pro reward: permanently unlock any 3 premium ships.
// Changes:
// - Created for the Pro lives economy (client-side picks; device-local).

import { color, font } from '../../brand/tokens.js';
import {
    drawFramedTile,
    setLabelType,
    setMonoType,
    resetType,
} from '../../utils/BrandDraw.js';
import { screenLayout, drawDivider } from '../ScreenKit.js';
import { SHIP_SKIN_LIST, drawSkinPreview } from '../../ships/skins.js';
import {
    ANNUAL_SHIP_PICK_COUNT,
    claimAnnualShipPicks,
    isSkinOwned,
    isSkinPremium,
} from '../../services/Entitlements.js';

/** Premium skins still locked (not already owned via IAP / prior pick). */
function pickableSkins() {
    return SHIP_SKIN_LIST.filter((s) => isSkinPremium(s.id) && !isSkinOwned(s.id));
}

/** @returns {object} hit targets for Game */
export function renderAnnualShipPick(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game, unit);
    const header = game.drawScreenHeader('PICK 3 SHIPS', { back: false });

    const selected = game.annualPickSelection || new Set();
    const roster = pickableSkins();
    // If everything is already owned, show owned premium as selectable fallbacks
    // so the claim can still complete (idempotent unlock).
    const list = roster.length > 0
        ? roster
        : SHIP_SKIN_LIST.filter((s) => isSkinPremium(s.id));
    const pickTarget = Math.min(ANNUAL_SHIP_PICK_COUNT, list.length);

    let y = header.contentTop;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subPx = Math.max(10, unit * 1.0);
    ctx.font = `500 ${subPx}px ${font.ui}`;
    ctx.fillStyle = color.ink55;
    ctx.fillText(
        `Yearly Pro — choose ${pickTarget} (${selected.size}/${pickTarget})`,
        L.centerX,
        y
    );
    ctx.restore();
    y += unit * 2;
    drawDivider(ctx, L.left, L.right, y);
    y += unit * 1.2;

    const columns = L.isMobile ? 3 : 4;
    const gap = unit * 1.1;
    const tileW = Math.min(unit * 9, (L.width - gap * (columns - 1)) / columns);
    const tileH = tileW * 1.25;
    const viewBottom = L.bottom - unit * 8;
    const scroll = game.annualPickScroll || 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(L.left - unit, y, L.width + unit * 2, viewBottom - y);
    ctx.clip();
    ctx.translate(0, -scroll);

    const buttons = { skins: {}, confirm: null, metrics: null, pickTarget };
    let row = 0;
    let col = 0;
    for (const skin of list) {
        const tx = L.left + col * (tileW + gap);
        const ty = y + row * (tileH + gap);
        const on = selected.has(skin.id);
        drawFramedTile(ctx, tx, ty, tileW, tileH, {
            surface: on ? color.paperTint : color.paperTint,
            stroke: on ? color.signal : color.ink,
        });
        const previewR = tileW * 0.22;
        drawSkinPreview(ctx, skin.id, tx + tileW / 2, ty + tileH * 0.42, previewR);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, Math.max(8, unit * 0.85));
        ctx.fillStyle = color.ink;
        ctx.fillText(skin.name || skin.id, tx + tileW / 2, ty + tileH * 0.82);
        resetType(ctx);
        ctx.restore();
        buttons.skins[skin.id] = {
            x: tx,
            y: ty - scroll,
            width: tileW,
            height: tileH,
            id: skin.id,
        };
        col += 1;
        if (col >= columns) {
            col = 0;
            row += 1;
        }
    }

    const rows = Math.ceil(list.length / columns);
    const contentH = rows * (tileH + gap);
    buttons.metrics = {
        contentHeight: contentH,
        viewportHeight: Math.max(0, viewBottom - y),
        viewTop: y,
    };
    ctx.restore();

    const canConfirm = selected.size === pickTarget;
    const buttonWidth = Math.min(unit * 30, L.width);
    const buttonHeight = L.isMobile ? unit * 5.2 : unit * 4.7;
    const bx = L.centerX - buttonWidth / 2;
    const by = L.bottom - buttonHeight - unit * 0.5;
    buttons.confirm = game.drawBrandButton(
        bx, by, buttonWidth, buttonHeight,
        canConfirm ? 'Unlock ships' : `Select ${pickTarget}`,
        { primary: canConfirm, tag: String(pickTarget) }
    );

    if (game.purchaseStatus) {
        ctx.save();
        ctx.textAlign = 'center';
        setMonoType(ctx, Math.max(9, unit * 0.85));
        ctx.fillStyle = color.signal;
        ctx.fillText(game.purchaseStatus, L.centerX, by - unit * 1.2);
        resetType(ctx);
        ctx.restore();
    }

    return buttons;
}

/** @returns {boolean} */
export function handleAnnualShipPickClick(game, x, y) {
    const buttons = game.annualPickButtons;
    if (!buttons) return false;

    for (const skin of Object.values(buttons.skins || {})) {
        if (!game.isClickInButton(x, y, skin)) continue;
        const sel = game.annualPickSelection || new Set();
        const pickTarget = buttons.pickTarget || ANNUAL_SHIP_PICK_COUNT;
        if (sel.has(skin.id)) {
            sel.delete(skin.id);
        } else if (sel.size < pickTarget) {
            sel.add(skin.id);
        }
        game.annualPickSelection = sel;
        return true;
    }

    if (game.isClickInButton(x, y, buttons.confirm)) {
        const sel = [...(game.annualPickSelection || [])];
        const pickTarget = buttons.pickTarget || ANNUAL_SHIP_PICK_COUNT;
        if (sel.length !== pickTarget) {
            game.setPurchaseStatus(`Pick ${pickTarget} ships.`);
            return true;
        }
        const result = claimAnnualShipPicks(sel);
        if (!result.ok) {
            game.setPurchaseStatus(result.message || 'Could not claim.');
            return true;
        }
        game.setPurchaseStatus('Ships unlocked.');
        game.annualPickSelection = new Set();
        finishAnnualPick(game);
        return true;
    }
    return false;
}

function finishAnnualPick(game) {
    const pending = game.pendingProResume;
    game.pendingProResume = null;
    if (pending?.type === 'openWorld') {
        game.beginRun(pending.mode);
    } else if (pending?.type === 'journey') {
        game.beginJourneyLevel(pending.level);
    } else if (pending?.type === 'restart') {
        game.restart();
    } else {
        game.goToModeSelect();
    }
}

export function clampAnnualPickScroll(game, scroll) {
    const metrics = game.annualPickButtons?.metrics;
    if (!metrics) return 0;
    const max = Math.max(0, metrics.contentHeight - metrics.viewportHeight);
    return Math.max(0, Math.min(max, scroll));
}
