// LoadBudget.js
// Caps what the player faces at once. Sums each live obstacle's demand
// (config/ObstacleDemand.js) on screen and just ahead, and trims a planned row
// so no axis goes over the cap for the run's difficulty.
// Changes:
// - Created file: per-axis caps lerped by profile.loadDifficulty, a live-mover
//   cap, set pieces that only share the screen with simple rocks, and a
//   `?budget=0` / `?budget=debug` web override (off / on-screen readout).
//   Only active where profile.usesLoadBudget is true (Hazard Lab, and Journey
//   on JOURNEY_CAPS). Lab keeps the tighter CAPS.
//   Live rocks count as half a simple slot (liveDemandOf).
//   Beside a live set piece: at most one rock cluster and one light obstacle
//   (spinner or pulsating). The light is allowed even if it tips a cap.

import { lerp, lerpInt } from '../utils/math.js';
import { DEMAND_AXES, demandOf, isLight, isSetPiece, liveDemandOf } from '../config/ObstacleDemand.js';

/** Caps at difficulty 0 and 1. Lab and anything without its own table. */
const CAPS = {
    space: [5, 9],
    timing: [2, 5],
    tracking: [3, 6],
    movers: [1, 3],
};

/**
 * Raised to the peaks a 10s fairness sample already reaches, so the budget
 * does not thin Journey. Soft end covers day 6; hard end covers day 25–41.
 */
export const JOURNEY_CAPS = {
    space: [16, 22],
    timing: [6, 12],
    tracking: [10, 17],
    movers: [4, 8],
};

/** A new set piece only starts if the live load is under this share of every cap. */
const SET_PIECE_ROOM = 0.5;

/** Window in screen heights: everything ahead of the top edge, down to the bottom edge. */
const AHEAD_SCREENS = 0.6;

function urlMode() {
    if (typeof location === 'undefined') return null;
    return new URLSearchParams(location.search).get('budget');
}

function emptyLoad() {
    return { space: 0, timing: 0, tracking: 0, movers: 0, setPieces: 0, lights: 0, rockSpace: 0 };
}

/** One rock cluster already beside a set piece; more rocks would crowd it. */
const ROCKS_BESIDE = 1;

function addDemand(load, type) {
    const demand = demandOf(type);
    addDemandValues(load, type === 'simple' ? { ...demand, rock: true } : demand);
}

function addDemandValues(load, demand) {
    for (const axis of DEMAND_AXES) load[axis] += demand[axis] || 0;
    if (demand.mover) load.movers += 1;
    if (demand.setPiece) load.setPieces += 1;
    if (demand.light) load.lights += 1;
    if (demand.rock) load.rockSpace += demand.space || 0;
}

export class LoadBudget {
    constructor(manager) {
        this.manager = manager;
        this.override = urlMode();
    }

    get game() {
        return this.manager.game;
    }

    get enabled() {
        if (this.override === '0') return false;
        return this.game.profile?.usesLoadBudget === true;
    }

    caps() {
        const table = this.game.profile?.loadCaps ?? CAPS;
        const d = Math.max(0, Math.min(1, this.game.profile?.loadDifficulty ?? 0.5));
        return {
            space: lerp(table.space[0], table.space[1], d),
            timing: lerp(table.timing[0], table.timing[1], d),
            tracking: lerp(table.tracking[0], table.tracking[1], d),
            movers: lerpInt(table.movers[0], table.movers[1], d),
        };
    }

    /** Demand of everything live between one-ish screen ahead and the bottom edge. */
    liveLoad() {
        const { camera, height } = this.game;
        const top = camera.y - height * AHEAD_SCREENS;
        const bottom = camera.y + height;
        const load = emptyLoad();
        for (const obstacle of this.manager.obstacles) {
            if (obstacle.retired || obstacle.y < top || obstacle.y > bottom) continue;
            addDemandValues(load, liveDemandOf(obstacle));
        }
        return load;
    }

    fits(load, caps) {
        return DEMAND_AXES.every((axis) => load[axis] <= caps[axis]) && load.movers <= caps.movers;
    }

    /** True when a set piece may start: nothing else big is around. */
    roomForSetPiece(load, caps) {
        if (load.setPieces > 0) return false;
        return DEMAND_AXES.every((axis) => load[axis] <= caps[axis] * SET_PIECE_ROOM)
            && load.movers === 0;
    }

    /**
     * Return a copy of `plan` that fits. Slots that would overflow become simple
     * rocks if those fit, otherwise they are dropped. An empty plan is a breather.
     */
    fit(plan) {
        if (!this.enabled || !plan?.slots?.length) return plan;
        const caps = this.caps();
        const load = this.liveLoad();
        const slots = [];
        // Set pieces first, so a companion in the same row sees them.
        const ordered = plan.slots.slice().sort(
            (a, b) => Number(isSetPiece(b.type)) - Number(isSetPiece(a.type)),
        );
        for (const slot of ordered) {
            const kept = this.fitSlot(slot, load, caps);
            if (!kept) continue;
            addDemand(load, kept.type);
            slots.push(kept);
        }
        this.lastLoad = load;
        return { ...plan, slots };
    }

    fitSlot(slot, load, caps) {
        const type = slot.type;
        if (type !== 'simple') {
            if (isSetPiece(type)) {
                if (this.roomForSetPiece(load, caps)) return slot;
            } else if (load.setPieces > 0) {
                // One light companion, even if it tips a cap. Anything else waits.
                if (isLight(type) && load.lights === 0) return slot;
            } else if (this.fits(this.withType(load, type), caps)) {
                return slot;
            }
        }
        if (load.setPieces > 0) {
            // Rocks add no timing or tracking, so the light companion tipping a
            // cap must not crowd them out. One cluster, and only while space remains.
            if (load.rockSpace >= ROCKS_BESIDE) return null;
            const withRock = this.withType(load, 'simple');
            return withRock.space <= caps.space ? { ...slot, type: 'simple' } : null;
        }
        return this.fits(this.withType(load, 'simple'), caps) ? { ...slot, type: 'simple' } : null;
    }

    withType(load, type) {
        const next = { ...load };
        addDemand(next, type);
        return next;
    }

    /** `?budget=debug`: live load against caps, top-left. */
    renderDebug(ctx) {
        if (this.override !== 'debug' || !this.enabled) return;
        const load = this.liveLoad();
        const caps = this.caps();
        const text = `space ${load.space}/${caps.space.toFixed(1)}  timing ${load.timing}/${caps.timing.toFixed(1)}  `
            + `track ${load.tracking}/${caps.tracking.toFixed(1)}  movers ${load.movers}/${caps.movers}  set ${load.setPieces}`;
        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, 8, ctx.measureText(text).width + 12, 20);
        ctx.fillStyle = '#e1d9c1';
        ctx.fillText(text, 14, 22);
        ctx.restore();
    }
}
