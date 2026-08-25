// OpenSpaceWeather.js
// KM bands for Open Space pairing (weather) and storm marks. Storms play
// EncounterCatalog recipes; the belt between them is planPairedRow traffic.
// Changes:
// - Created file: weather table, full-sky rotation, storm KM helper.

export const OPEN_SPACE_PAIRED_FROM_KM = 2000;
export const OPEN_SPACE_STORM_REPEAT_KM = 2500;
export const OPEN_SPACE_FULL_ROSTER_KM = 7000;
/** How many repeating storms to arm at run start (covers a very long flight). */
export const OPEN_SPACE_STORM_REPEAT_COUNT = 40;

/** Last band with fromKm <= score wins until the full-roster rotation. */
export const OPEN_SPACE_WEATHER = [
    { fromKm: 0, pair: null, combo: null, focus: null },
    { fromKm: 1000, pair: 'complex', combo: null, focus: 'complex' },
    { fromKm: 2000, pair: 'moving', combo: null, focus: 'moving' },
    { fromKm: 3000, pair: 'shooting', combo: 'moving', focus: 'shooting' },
    { fromKm: 4500, pair: 'phase', combo: 'shooting', focus: 'phase' },
    { fromKm: 5500, pair: 'repulsor', combo: 'phase', focus: 'repulsor' },
];

/** After 7000 KM, rotate so deep runs are not the same two hazards forever. */
export const OPEN_SPACE_FULL_SKY = [
    { pair: 'shooting', combo: 'moving', focus: 'complex' },
    { pair: 'phase', combo: 'shooting', focus: 'wormhole' },
    { pair: 'repulsor', combo: 'phase', focus: 'blackhole' },
    { pair: 'sweepGate', combo: 'moving', focus: 'sweepGate' },
    { pair: 'wormhole', combo: 'complex', focus: 'wormhole' },
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

export function typesAtKm(km, unlocks) {
    const score = Math.max(0, Number(km) || 0);
    return (unlocks || [])
        .filter((entry) => (entry.score ?? 0) <= score)
        .map((entry) => entry.type)
        .filter(Boolean);
}

export function openSpaceStormMarks(unlocks) {
    const unique = [...new Set(
        (unlocks || []).map((entry) => entry.score).filter((score) => score > 0)
    )].sort((a, b) => a - b);
    const extra = [];
    for (let n = 1; n <= OPEN_SPACE_STORM_REPEAT_COUNT; n += 1) {
        extra.push(OPEN_SPACE_FULL_ROSTER_KM + n * OPEN_SPACE_STORM_REPEAT_KM);
    }
    return [...unique, ...extra];
}
