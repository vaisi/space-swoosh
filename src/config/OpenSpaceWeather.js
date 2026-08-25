// OpenSpaceWeather.js
// KM bands for Open Space pairing (weather), belt density, and storm marks.
// Storms play EncounterCatalog recipes; the belt between them is planPairedRow.
// Changes:
// - Tighter vertical belt (0.22→0.10) and more 2/3-slot rows so 20k+ is not
//   half-empty sky; simpleChance is meant to be consumed by planPairedRow.
// - Storm quiet is a short breath (0.18); dual patches chain (0.08), not two
//   half-screen holes. Recipe gaps clamp to 0.28 in Open Space.
// - Belt lerp 0→5k (Day 20) →12.5k (Day 33) →20k (Day 42 hold).
// - Storms every 1500 KM after 5k; dual-family storms after 12.5k.
// - Full-sky weather never uses wormhole as pair/focus — portals are helpers.
// - Created file: weather table, full-sky rotation, storm KM helper.

export const OPEN_SPACE_PAIRED_FROM_KM = 2000;
export const OPEN_SPACE_STORM_REPEAT_KM = 2500;
export const OPEN_SPACE_STORM_DENSE_REPEAT_KM = 1500;
export const OPEN_SPACE_STORM_DENSE_FROM_KM = 5000;
export const OPEN_SPACE_DUAL_STORM_FROM_KM = 12500;
export const OPEN_SPACE_FULL_ROSTER_KM = 7000;
/** How many repeating storms to arm at run start (covers a very long flight). */
export const OPEN_SPACE_STORM_REPEAT_COUNT = 40;
/** After a storm patch: ~one row of air, not half a screen. */
export const OPEN_SPACE_STORM_QUIET_FRAC = 0.18;
/** Between two recipes at the same KM (dual patch). */
export const OPEN_SPACE_STORM_CHAIN_FRAC = 0.08;
/** Catalog gap beats (e.g. portal 0.85) would punch holes; cap them here. */
export const OPEN_SPACE_STORM_GAP_CAP = 0.28;

export function stormQuietFrac(chained) {
    return chained ? OPEN_SPACE_STORM_CHAIN_FRAC : OPEN_SPACE_STORM_QUIET_FRAC;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

/** Last band with fromKm <= score wins until the full-roster rotation. */
export const OPEN_SPACE_WEATHER = [
    { fromKm: 0, pair: null, combo: null, focus: null },
    { fromKm: 1000, pair: 'complex', combo: null, focus: 'complex' },
    { fromKm: 2000, pair: 'moving', combo: null, focus: 'moving' },
    { fromKm: 3000, pair: 'shooting', combo: 'moving', focus: 'shooting' },
    { fromKm: 4500, pair: 'phase', combo: 'shooting', focus: 'phase' },
    { fromKm: 5500, pair: 'repulsor', combo: 'phase', focus: 'repulsor' },
];

/** After 7000 KM, rotate so deep runs are not the same two hazards forever.
 *  Wormholes are helpers (hop + shield), not a weather identity. */
export const OPEN_SPACE_FULL_SKY = [
    { pair: 'shooting', combo: 'moving', focus: 'complex' },
    { pair: 'phase', combo: 'shooting', focus: 'pulsating' },
    { pair: 'repulsor', combo: 'phase', focus: 'blackhole' },
    { pair: 'sweepGate', combo: 'moving', focus: 'sweepGate' },
    { pair: 'complex', combo: 'pulsating', focus: 'shooting' },
];

/**
 * Live belt knobs. rowOne / rowTwo are cumulative mix: r < rowOne → 1 slot,
 * r < rowTwo → 2, else 3. Mirrors Journey Day 20 / 33 / 42 spacing without
 * copying late-Journey speed.
 */
export const OPEN_SPACE_BELT = [
    {
        fromKm: 0,
        minGapFrac: 0.22,
        gapSpread: 1.45,
        simpleChance: 0.55,
        density: 0.85,
        rowOne: 0.55,
        rowTwo: 0.88,
    },
    {
        fromKm: 5000,
        minGapFrac: 0.13,
        gapSpread: 1.25,
        simpleChance: 0.34,
        density: 1.7,
        rowOne: 0.18,
        rowTwo: 0.68,
    },
    {
        fromKm: 12500,
        minGapFrac: 0.11,
        gapSpread: 1.22,
        simpleChance: 0.26,
        density: 2.05,
        rowOne: 0.12,
        rowTwo: 0.62,
    },
    {
        fromKm: 20000,
        minGapFrac: 0.10,
        gapSpread: 1.20,
        simpleChance: 0.22,
        density: 2.15,
        rowOne: 0.10,
        rowTwo: 0.58,
    },
];

export function weatherAt(km) {
    const score = Math.max(0, Number(km) || 0);
    if (score >= OPEN_SPACE_FULL_ROSTER_KM && OPEN_SPACE_FULL_SKY.length > 0) {
        const i = Math.floor((score - OPEN_SPACE_FULL_ROSTER_KM) / OPEN_SPACE_STORM_REPEAT_KM);
        return OPEN_SPACE_FULL_SKY[i % OPEN_SPACE_FULL_SKY.length];
    }
    let band = OPEN_SPACE_WEATHER[0];
    for (const row of OPEN_SPACE_WEATHER) {
        if (score >= row.fromKm) band = row;
    }
    return {
        pair: band.pair ?? null,
        combo: band.combo ?? null,
        focus: band.focus ?? null,
    };
}

export function beltAt(km) {
    const score = Math.max(0, Number(km) || 0);
    const rows = OPEN_SPACE_BELT;
    if (!rows.length) {
        return {
            minGapFrac: 0.22,
            gapSpread: 1.45,
            simpleChance: 0.55,
            density: 0.85,
            rowOne: 0.55,
            rowTwo: 0.88,
        };
    }
    if (score <= rows[0].fromKm) {
        const first = rows[0];
        return {
            minGapFrac: first.minGapFrac,
            gapSpread: first.gapSpread,
            simpleChance: first.simpleChance,
            density: first.density,
            rowOne: first.rowOne,
            rowTwo: first.rowTwo,
        };
    }
    const last = rows[rows.length - 1];
    if (score >= last.fromKm) {
        return {
            minGapFrac: last.minGapFrac,
            gapSpread: last.gapSpread,
            simpleChance: last.simpleChance,
            density: last.density,
            rowOne: last.rowOne,
            rowTwo: last.rowTwo,
        };
    }
    let i = 0;
    for (let n = 1; n < rows.length; n += 1) {
        if (score >= rows[n].fromKm) i = n;
    }
    const a = rows[i];
    const b = rows[i + 1];
    const span = Math.max(1, b.fromKm - a.fromKm);
    const t = (score - a.fromKm) / span;
    return {
        minGapFrac: lerp(a.minGapFrac, b.minGapFrac, t),
        gapSpread: lerp(a.gapSpread, b.gapSpread, t),
        simpleChance: lerp(a.simpleChance, b.simpleChance, t),
        density: lerp(a.density, b.density, t),
        rowOne: lerp(a.rowOne, b.rowOne, t),
        rowTwo: lerp(a.rowTwo, b.rowTwo, t),
    };
}

export function typesAtKm(km, unlocks) {
    const score = Math.max(0, Number(km) || 0);
    return (unlocks || [])
        .filter((entry) => (entry.score ?? 0) <= score)
        .map((entry) => entry.type)
        .filter(Boolean);
}

export function stormCountAt(km) {
    return (Number(km) || 0) >= OPEN_SPACE_DUAL_STORM_FROM_KM ? 2 : 1;
}

export function openSpaceStormMarks(unlocks) {
    const unique = [...new Set(
        (unlocks || []).map((entry) => entry.score).filter((score) => score > 0)
    )].sort((a, b) => a - b);
    const extra = [];
    let km = OPEN_SPACE_FULL_ROSTER_KM;
    for (let n = 0; n < OPEN_SPACE_STORM_REPEAT_COUNT; n += 1) {
        const step = km >= OPEN_SPACE_STORM_DENSE_FROM_KM
            ? OPEN_SPACE_STORM_DENSE_REPEAT_KM
            : OPEN_SPACE_STORM_REPEAT_KM;
        km += step;
        extra.push(km);
    }
    return [...unique, ...extra];
}
