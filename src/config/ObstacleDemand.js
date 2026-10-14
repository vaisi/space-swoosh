// ObstacleDemand.js
// What each obstacle asks of the player, on separate axes, instead of one
// difficulty rank. LoadBudget sums these for everything near the screen.
// Changes:
// - Created file: space / timing / tracking ratings (0–3) for every type,
//   plus `mover` (counts against the live-mover cap), `setPiece` (wants the
//   screen mostly to itself) and `light` (the one companion a set piece may
//   share with: spinner, pulsating). First-guess values; the fairness sim and playtest
//   death stats recalibrate them. liveDemandOf() counts each live rock as half a
//   simple slot, since one slot spawns a small cluster.
// - Meteor shower timing is 1: the dashed slant is a short read before the rocks.

export const DEMAND_AXES = ['space', 'timing', 'tracking'];

/**
 * space    – how much corridor it blocks.
 * timing   – whether you must wait for a moment.
 * tracking – moving parts you must keep an eye on.
 */
export const OBSTACLE_DEMAND = {
    simple: { space: 1, timing: 0, tracking: 0 },
    moving: { space: 1, timing: 0, tracking: 2, mover: true },
    shooting: { space: 1, timing: 1, tracking: 2, mover: true },
    complex: { space: 2, timing: 0, tracking: 1 },
    pulsating: { space: 1, timing: 2, tracking: 0, light: true },
    phase: { space: 2, timing: 2, tracking: 0 },
    sweepGate: { space: 3, timing: 2, tracking: 0 },
    repulsor: { space: 2, timing: 0, tracking: 1 },
    driftCurrent: { space: 2, timing: 0, tracking: 1 },
    wormhole: { space: 0, timing: 0, tracking: 0 },
    blackhole: { space: 2, timing: 0, tracking: 1 },
    sideBarrier: { space: 2, timing: 0, tracking: 0 },

    spinner: { space: 1, timing: 2, tracking: 0, light: true },
    hollowOrbit: { space: 2, timing: 2, tracking: 0 },
    ricochet: { space: 1, timing: 0, tracking: 2, mover: true },
    blinkRow: { space: 3, timing: 2, tracking: 0 },
    tunnelField: { space: 3, timing: 3, tracking: 0, setPiece: true },
    shoal: { space: 2, timing: 0, tracking: 2, mover: true, setPiece: true },
    satDebris: { space: 2, timing: 0, tracking: 3, mover: true, setPiece: true },
    lightning: { space: 2, timing: 2, tracking: 0 },
    meteorShower: { space: 2, timing: 1, tracking: 2 },
};

const NONE = { space: 0, timing: 0, tracking: 0 };

/** Simple rocks log as asteroidCircle / asteroidTriangle / asteroidSquare. */
export function demandTypeOf(obstacle) {
    const id = obstacle?.logbookId;
    if (!id || id.startsWith('asteroid')) return 'simple';
    return id;
}

export function demandOf(type) {
    return OBSTACLE_DEMAND[type] || NONE;
}

/** A simple slot spawns a cluster of ~2 rocks, so each live rock is half a slot. */
const ROCK_SHARE = 0.5;

/** Demand of one live obstacle (rocks count as part of their cluster). */
export function liveDemandOf(obstacle) {
    const type = demandTypeOf(obstacle);
    const demand = demandOf(type);
    if (type !== 'simple') return demand;
    return { space: demand.space * ROCK_SHARE, timing: 0, tracking: 0, rock: true };
}

export function isSetPiece(type) {
    return demandOf(type).setPiece === true;
}

/** Small enough to share a screen with one set piece. Spinner and Pulsating. */
export function isLight(type) {
    return demandOf(type).light === true;
}
