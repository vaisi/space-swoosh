// HazardPairs.js
// Compatible late-Journey mixes: which advanced types may share a row, which
// must fly solo, and which second type a focus hazard likes to pair with.
// Changes:
// - comboTheme: a third advanced type (not focus, not pairTheme) gets ~20% of
//   late mixed rows so the belt between spikes uses a different pairing.
// - Corridor types (side barriers, drift) always get a mid-lane fill so the
//   centre is not an empty hallway. Heavy types cannot repeat back-to-back.
// - Sandwich rows (point + simple cluster + point) restore rock agglomeration.
// - Weaker focus bias; simple clusters are a common partner, not a fallback.
// - Created file: pairing rules, pair-theme hints, lane fractions, row planner.

export const LATE_FROM_LEVEL = 20;

/** Full-width or teleport set pieces — they own the row's silhouette. */
export const SOLO_IN_ROW = new Set([
    'phase',
    'wormhole',
    'sweepGate',
]);

/** Edge/wind hazards that leave the mid empty unless we fill it. */
export const CORRIDOR_TYPES = new Set([
    'sideBarrier',
    'driftCurrent',
]);

/** Don't stamp these on consecutive rows — a run of wells/walls feels cheap. */
export const HEAVY_TYPES = new Set([
    'blackhole',
    'repulsor',
    'wormhole',
    'sweepGate',
    'phase',
    'sideBarrier',
]);

export const LANE_FRACS = {
    left: { start: 0.10, end: 0.36 },
    center: { start: 0.32, end: 0.68 },
    right: { start: 0.64, end: 0.90 },
};

/** Preferred partners for a focus type, first match that is unlocked wins. */
export const PAIR_HINTS = {
    phase: ['moving', 'pulsating', 'shooting'],
    wormhole: ['moving', 'shooting', 'complex'],
    repulsor: ['moving', 'shooting', 'pulsating'],
    blackhole: ['moving', 'shooting', 'complex'],
    sweepGate: ['moving', 'shooting', 'driftCurrent'],
    sideBarrier: ['moving', 'shooting', 'pulsating', 'complex'],
    complex: ['moving', 'shooting', 'pulsating'],
    shooting: ['moving', 'complex', 'pulsating'],
    moving: ['shooting', 'complex', 'pulsating'],
    driftCurrent: ['moving', 'shooting', 'complex'],
    pulsating: ['moving', 'shooting', 'complex'],
};

export const POINT_TYPES = new Set(['simple', 'moving', 'shooting', 'pulsating', 'complex']);

/** Side barriers as a level's *identity* leave the mid empty — skip except on intro. */
const WEAK_SOLO_FOCUS = new Set(['sideBarrier']);

export function pickPairTheme(focus, setPieces, indexInStep) {
    const roster = setPieces.filter((type) => type && type !== 'simple');
    const hints = PAIR_HINTS[focus] || [];
    const unlocked = hints.filter((type) => roster.includes(type) && type !== focus);
    if (unlocked.length > 0) {
        return unlocked[indexInStep % unlocked.length];
    }
    const others = roster.filter((type) => type !== focus && !WEAK_SOLO_FOCUS.has(type));
    if (others.length === 0) {
        const any = roster.filter((type) => type !== focus);
        return any.length ? any[indexInStep % any.length] : null;
    }
    return others[indexInStep % others.length];
}

/**
 * Third pairing type for late Journey. Distinct from focus and pairTheme so
 * random rows between spikes are not the same two hazards on shuffle.
 */
export function pickComboTheme(focus, pairTheme, setPieces, indexInStep) {
    const roster = setPieces.filter((type) => type && type !== 'simple');
    const skip = new Set([focus, pairTheme].filter(Boolean));
    const strong = roster.filter((type) => !skip.has(type) && !WEAK_SOLO_FOCUS.has(type));
    const pool = strong.length > 0
        ? strong
        : roster.filter((type) => !skip.has(type));
    if (pool.length === 0) return null;
    return pool[(indexInStep + 2) % pool.length];
}

/** Focus for a plateau level: skip side-barrier identity unless this step introduces it. */
export function pickStrongFocus(introduces, setPieces, indexInStep) {
    if (introduces && introduces !== 'simple') return introduces;
    const strong = setPieces.filter((type) => !WEAK_SOLO_FOCUS.has(type));
    const pool = strong.length > 0 ? strong : setPieces;
    if (pool.length === 0) return null;
    return pool[indexInStep % pool.length];
}

export function encounterCountFor(levelNumber) {
    if (levelNumber < LATE_FROM_LEVEL) return 0;
    if (levelNumber < 25) return 1;
    return 2;
}

export function canShareRow(a, b) {
    if (!a || !b) return false;
    if (a === 'blackhole' && b === 'blackhole') return false;
    if ((a === 'blackhole' && b === 'wormhole') || (a === 'wormhole' && b === 'blackhole')) {
        return false;
    }
    if (SOLO_IN_ROW.has(a) || SOLO_IN_ROW.has(b)) return false;
    if (CORRIDOR_TYPES.has(a) && CORRIDOR_TYPES.has(b)) return false;
    return true;
}

function pickFrom(list, rng) {
    if (!list.length) return null;
    return list[Math.floor(rng() * list.length)];
}

function pickPrimary(available, focus, pairTheme, comboTheme, banned, rng) {
    const advanced = available.filter((type) => type !== 'simple' && !banned.has(type));
    const pool = advanced.length > 0
        ? advanced
        : available.filter((type) => type !== 'simple');
    if (pool.length === 0) return 'simple';
    const roll = rng();
    if (focus && pool.includes(focus) && roll < 0.28) return focus;
    if (pairTheme && pool.includes(pairTheme) && roll < 0.52) return pairTheme;
    if (comboTheme && pool.includes(comboTheme) && roll < 0.72) return comboTheme;
    return pickFrom(pool, rng);
}

function pickMidFill(available, pairTheme, comboTheme, banned, rng) {
    if (rng() < 0.5) return 'simple';
    const points = available.filter(
        (type) => POINT_TYPES.has(type) && type !== 'simple' && !banned.has(type)
    );
    if (pairTheme && points.includes(pairTheme)) return pairTheme;
    if (comboTheme && points.includes(comboTheme) && rng() < 0.20) return comboTheme;
    return pickFrom(points, rng) || 'simple';
}

function pickPartner(primary, available, pairTheme, comboTheme, banned, rng) {
    const candidates = available.filter(
        (type) => type !== 'simple'
            && type !== primary
            && !banned.has(type)
            && canShareRow(primary, type)
    );
    if (pairTheme && candidates.includes(pairTheme) && rng() < 0.45) return pairTheme;
    if (comboTheme && candidates.includes(comboTheme) && rng() < 0.20) return comboTheme;
    const points = candidates.filter((type) => POINT_TYPES.has(type));
    const pool = points.length > 0 ? points : candidates;
    return pickFrom(pool, rng) || 'simple';
}

function oppositeLane(lane) {
    return lane === 'left' ? 'right' : 'left';
}

/**
 * Plan one mixed row. Corridor walls get a mid fill. Pairable types sit on
 * opposite lanes. Triple rolls sandwich a simple cluster between two points.
 */
export function planPairedRow({
    spawnCount,
    available,
    focus,
    pairTheme,
    comboTheme,
    avoid = [],
    blackholeBusy = false,
    rng = Math.random,
}) {
    const types = available.filter(Boolean);
    if (types.length === 0) {
        return { slots: [{ type: 'simple' }] };
    }

    const banned = new Set(avoid);
    if (blackholeBusy) banned.add('blackhole');

    const primary = pickPrimary(types, focus, pairTheme, comboTheme, banned, rng);

    if (CORRIDOR_TYPES.has(primary)) {
        const mid = pickMidFill(types, pairTheme, comboTheme, banned, rng);
        return {
            slots: [
                { type: primary },
                { type: mid, lane: 'center' },
            ],
        };
    }

    if (primary === 'simple' || SOLO_IN_ROW.has(primary) || spawnCount < 2) {
        return { slots: [{ type: primary }] };
    }

    let partner = pickPartner(primary, types, pairTheme, comboTheme, banned, rng);
    if (partner !== 'simple' && rng() < 0.28) partner = 'simple';

    const fieldLane = rng() < 0.5 ? 'left' : 'right';
    const primaryLane = (primary === 'blackhole' || primary === 'repulsor')
        ? fieldLane
        : 'left';
    const partnerLane = oppositeLane(primaryLane);

    if (
        spawnCount >= 3
        && POINT_TYPES.has(primary)
        && POINT_TYPES.has(partner)
        && partner !== 'simple'
        && primary !== 'blackhole'
    ) {
        return {
            slots: [
                { type: primary, lane: 'left' },
                { type: 'simple', lane: 'center' },
                { type: partner, lane: 'right' },
            ],
        };
    }

    return {
        slots: [
            { type: primary, lane: primaryLane },
            { type: partner, lane: partnerLane },
        ],
    };
}

export function laneRange(lane) {
    return LANE_FRACS[lane] || LANE_FRACS.center;
}

export function rowPrimaryTypes(plan) {
    return (plan?.slots || [])
        .map((slot) => slot.type)
        .filter((type) => type && type !== 'simple');
}
