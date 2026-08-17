// LivesChip.js
// Compact lives / Pro indicator drawn on mode select, journey map, and
// game-over. Changes:
// - Hidden while LIVES_ENABLED is false (economy is implemented but dark).
// - Created: shows ∞ for Pro, otherwise count + optional regen countdown.

import { color } from '../brand/tokens.js';
import { setLabelType, setMonoType, resetType } from '../utils/BrandDraw.js';
import {
    formatRegenCountdown,
    isProUnlimited,
    livesDisplayLabel,
    LIVES_ENABLED,
    msUntilNextRegen,
    MAX_LIVES,
    getLives,
} from '../services/Lives.js';

/**
 * Draw a small lives readout. Returns nothing (display-only).
 * @param {object} game
 * @param {{ x: number, y: number, align?: 'left'|'right'|'center' }} opts
 */
export function drawLivesChip(game, { x, y, align = 'right' }) {
    if (!LIVES_ENABLED) return;

    const ctx = game.ctx;
    const unit = game.baseUnit;
    const px = Math.max(9, unit * 0.95);
    const label = isProUnlimited()
        ? 'LIVES  ∞'
        : `LIVES  ${livesDisplayLabel()} / ${MAX_LIVES}`;

    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    setLabelType(ctx, px);
    ctx.fillStyle = color.ink55;
    ctx.fillText(label, x, y);
    resetType(ctx);

    if (!isProUnlimited() && getLives() < MAX_LIVES) {
        const cd = formatRegenCountdown(msUntilNextRegen());
        if (cd) {
            const subPx = Math.max(8, unit * 0.8);
            setMonoType(ctx, subPx);
            ctx.fillStyle = color.ink30;
            const subY = y + px * 1.15;
            ctx.fillText(`+6 in ${cd}`, x, subY);
            resetType(ctx);
        }
    }
    ctx.restore();
}
