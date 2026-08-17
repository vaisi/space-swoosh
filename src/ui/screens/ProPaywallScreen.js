// ProPaywallScreen.js
// Shown when free lives are empty (or Play Again with 0 lives). Offers weekly
// / yearly Pro for unlimited lives; yearly also unlocks a 3-ship pick.
// Changes:
// - Unreachable while LIVES_ENABLED is false (canStartRun never fails).
// - Created for the Pro lives economy.

import { color, font } from '../../brand/tokens.js';
import { setLabelType, setDisplayType, resetType } from '../../utils/BrandDraw.js';
import { screenLayout, fitPx, wrapLines, drawDivider } from '../ScreenKit.js';
import {
    formatRegenCountdown,
    msUntilNextRegen,
    REGEN_AMOUNT,
} from '../../services/Lives.js';
import {
    getProPriceLabel,
    isProActive,
    needsAnnualShipPick,
    purchaseProWeekly,
    purchaseProYearly,
    restorePurchases,
} from '../../services/Entitlements.js';

/** @returns {Record<string, { x: number, y: number, width: number, height: number }>} */
export function renderProPaywall(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game, unit);
    const header = game.drawScreenHeader('LIVES', { back: true });

    const buttons = { back: header.backRect };
    const titlePx = Math.min(unit * 2.6, 32);
    let y = header.contentTop + unit * 0.5;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setDisplayType(ctx, titlePx);
    ctx.fillStyle = color.ink;
    ctx.fillText('OUT OF LIVES', L.centerX, y);
    resetType(ctx);
    y += titlePx * 1.2;

    const cd = formatRegenCountdown(msUntilNextRegen());
    const sub = cd
        ? `+${REGEN_AMOUNT} lives in ${cd}`
        : `Free lives refill +${REGEN_AMOUNT} every 6 hours (max 10).`;
    const subPx = Math.max(11, unit * 1.1);
    ctx.font = `500 ${subPx}px ${font.ui}`;
    ctx.fillStyle = color.ink55;
    wrapLines(ctx, sub, L.width, 3).forEach((line, i) => {
        ctx.fillText(line, L.centerX, y + i * subPx * 1.35);
    });
    y += subPx * 1.35 * 2.2 + unit;

    drawDivider(ctx, L.left, L.right, y);
    y += unit * 2;

    setLabelType(ctx, Math.max(10, unit * 1.0));
    ctx.fillStyle = color.ink;
    ctx.fillText('GO PRO — UNLIMITED LIVES', L.centerX, y);
    resetType(ctx);
    y += unit * 2.2;

    const buttonWidth = Math.min(unit * 30, L.width);
    const buttonHeight = L.isMobile ? unit * 5.2 : unit * 4.7;
    const bx = L.centerX - buttonWidth / 2;
    const gap = unit * 1.3;

    const weekPrice = getProPriceLabel('weekly') || '$1.99';
    const yearPrice = getProPriceLabel('yearly') || '$19.99';

    buttons.weekly = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight,
        `Weekly  ${weekPrice}`,
        { primary: true, tag: '7D' }
    );
    y += buttonHeight + gap;

    buttons.yearly = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight,
        `Yearly  ${yearPrice}`,
        { primary: true, tag: '3★' }
    );
    y += buttonHeight + gap * 0.6;

    const notePx = Math.max(9, unit * 0.9);
    ctx.font = `500 ${notePx}px ${font.ui}`;
    ctx.fillStyle = color.ink30;
    wrapLines(ctx, 'Yearly includes any 3 premium ships — yours to keep.', L.width, 2)
        .forEach((line, i) => {
            ctx.fillText(line, L.centerX, y + i * notePx * 1.3);
        });
    y += notePx * 1.3 * 2 + gap;

    buttons.restore = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight * 0.85,
        'Restore Purchases',
        { tag: '↩' }
    );

    if (game.purchaseStatus) {
        y += buttonHeight * 0.85 + gap * 0.8;
        setLabelType(ctx, notePx);
        ctx.fillStyle = color.signal;
        fitPx(ctx, game.purchaseStatus, L.width, notePx, 8, (px) => setLabelType(ctx, px));
        ctx.fillText(game.purchaseStatus, L.centerX, y);
        resetType(ctx);
    }

    ctx.restore();
    return buttons;
}

/** @returns {Promise<boolean>} true when the click was consumed. */
export async function handleProPaywallClick(game, x, y) {
    const buttons = game.proPaywallButtons;
    if (!buttons) return false;
    if (game.purchaseBusy) return true;

    if (game.isClickInButton(x, y, buttons.back)) {
        leavePaywall(game);
        return true;
    }

    if (game.isClickInButton(x, y, buttons.weekly)) {
        await buyPro(game, 'weekly');
        return true;
    }
    if (game.isClickInButton(x, y, buttons.yearly)) {
        await buyPro(game, 'yearly');
        return true;
    }
    if (game.isClickInButton(x, y, buttons.restore)) {
        game.purchaseBusy = true;
        try {
            const result = await restorePurchases();
            game.setPurchaseStatus(result.message || (result.ok ? 'Restored.' : 'Restore failed.'));
            if (result.ok && isProActive()) {
                afterProUnlocked(game);
            }
        } finally {
            game.purchaseBusy = false;
        }
        return true;
    }
    return false;
}

async function buyPro(game, period) {
    game.purchaseBusy = true;
    game.setPurchaseStatus(period === 'yearly' ? 'Purchasing yearly…' : 'Purchasing weekly…');
    try {
        const result = period === 'yearly'
            ? await purchaseProYearly()
            : await purchaseProWeekly();
        if (result.cancelled) {
            game.setPurchaseStatus(null);
            return;
        }
        if (!result.ok) {
            game.setPurchaseStatus(result.message || 'Purchase failed.');
            return;
        }
        game.setPurchaseStatus(period === 'yearly'
            ? 'Yearly Pro unlocked.'
            : 'Weekly Pro unlocked.');
        afterProUnlocked(game);
    } finally {
        game.purchaseBusy = false;
    }
}

function afterProUnlocked(game) {
    if (needsAnnualShipPick()) {
        game.openAnnualShipPick();
        return;
    }
    const pending = game.pendingProResume;
    game.pendingProResume = null;
    if (pending?.type === 'openWorld') {
        game.beginRun(pending.mode);
    } else if (pending?.type === 'journey') {
        game.beginJourneyLevel(pending.level);
    } else if (pending?.type === 'restart') {
        game.restart();
    } else {
        leavePaywall(game);
    }
}

function leavePaywall(game) {
    game.pendingProResume = null;
    const ret = game.proPaywallReturnScreen || 'modeSelect';
    game.proPaywallReturnScreen = null;
    if (ret === 'journeyMap') game.goToJourneyMap();
    else if (ret === 'menu') game.goToMenu();
    else if (ret === 'gameover') {
        game.appScreen = 'gameover';
        game.updatePauseButtonVisibility();
    } else {
        game.goToModeSelect();
    }
}
