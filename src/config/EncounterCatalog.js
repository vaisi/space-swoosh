// EncounterCatalog.js
// Short authored gauntlets for Journey levels 20+. Each recipe is a few beats
// (spawn rows and breathing gaps) that only fire if every required type is live.
// Changes:
// - Family tags so a day's second spike is a different silhouette, not another
//   crossfire. Eight new recipes: moons, rock storm, pulse weave, bloom drift,
//   push-shot, well-wind, sweep-shot, portal rocks.
// - Source of truth for iOS: `npm run constants:export` copies this catalog
//   into shared/game-constants.json and GeneratedJourneyData.encounterCatalog.
// - Created file: readable set-piece recipes + picker keyed to focus / pairTheme.

function recipeScore(recipe, focus, pairTheme) {
    let score = 0;
    if (focus && recipe.requires.includes(focus)) score += 3;
    if (pairTheme && recipe.requires.includes(pairTheme)) score += 2;
    if (focus && recipe.id.toLowerCase().includes(String(focus).toLowerCase())) score += 1;
    return score;
}

export const ENCOUNTER_CATALOG = [
    {
        id: 'bloomSqueeze',
        family: 'bloom',
        requires: ['phase', 'sideBarrier'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'sideBarrier' }] },
            { kind: 'spawn', slots: [{ type: 'phase', lane: 'center' }] },
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'left' }, { type: 'simple', lane: 'right' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'crossfire',
        family: 'cross',
        requires: ['shooting', 'moving'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'shooting', lane: 'left' }, { type: 'moving', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'left' }, { type: 'shooting', lane: 'right' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'pulseGate',
        family: 'pulse',
        requires: ['pulsating', 'sideBarrier'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'sideBarrier' }] },
            { kind: 'spawn', slots: [{ type: 'pulsating', lane: 'center' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'needleWeave',
        family: 'corridor',
        requires: ['sideBarrier', 'moving', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'sideBarrier' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'center' }] },
            { kind: 'spawn', slots: [{ type: 'shooting', lane: 'left' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'windWeave',
        family: 'wind',
        requires: ['driftCurrent', 'moving', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'driftCurrent' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'left' }, { type: 'shooting', lane: 'right' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'portalAmbush',
        family: 'portal',
        requires: ['wormhole', 'moving', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'wormhole' }] },
            { kind: 'gap', frac: 0.85 },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'left' }, { type: 'shooting', lane: 'right' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'twinPush',
        family: 'push',
        requires: ['repulsor', 'moving'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'repulsor', lane: 'left' }] },
            { kind: 'gap', frac: 0.18 },
            { kind: 'spawn', slots: [{ type: 'repulsor', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'center' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'wellWeave',
        family: 'well',
        requires: ['blackhole', 'moving', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'blackhole', lane: 'left' }, { type: 'moving', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'shooting', lane: 'right' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'currentCut',
        family: 'wind',
        requires: ['driftCurrent', 'sweepGate'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'driftCurrent' }] },
            { kind: 'gap', frac: 0.16 },
            { kind: 'spawn', slots: [{ type: 'sweepGate' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'staggerSweeps',
        family: 'sweep',
        requires: ['sweepGate'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'sweepGate' }] },
            { kind: 'gap', frac: 0.22 },
            { kind: 'spawn', slots: [{ type: 'sweepGate' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'moonCross',
        family: 'complex',
        requires: ['complex', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'complex', lane: 'left' }, { type: 'shooting', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'center' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'rockStorm',
        family: 'rocks',
        requires: ['simple', 'moving'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'left' }, { type: 'simple', lane: 'center' }, { type: 'simple', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'center' }] },
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'left' }, { type: 'simple', lane: 'right' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'pulseWeave',
        family: 'pulse',
        requires: ['pulsating', 'moving'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'pulsating', lane: 'left' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'center' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'bloomDrift',
        family: 'bloom',
        requires: ['phase', 'moving'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'phase', lane: 'center' }] },
            { kind: 'spawn', slots: [{ type: 'moving', lane: 'left' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'pushShot',
        family: 'push',
        requires: ['repulsor', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'repulsor', lane: 'left' }, { type: 'shooting', lane: 'right' }] },
            { kind: 'spawn', slots: [{ type: 'simple', lane: 'center' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'wellWind',
        family: 'well',
        requires: ['blackhole', 'driftCurrent'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'blackhole', lane: 'left' }] },
            { kind: 'gap', frac: 0.18 },
            { kind: 'spawn', slots: [{ type: 'driftCurrent' }] },
            { kind: 'gap', frac: 0.55 },
        ],
    },
    {
        id: 'sweepShot',
        family: 'sweep',
        requires: ['sweepGate', 'shooting'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'sweepGate' }] },
            { kind: 'spawn', slots: [{ type: 'shooting', lane: 'right' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
    {
        id: 'portalRocks',
        family: 'portal',
        requires: ['wormhole', 'complex'],
        beats: [
            { kind: 'spawn', slots: [{ type: 'wormhole' }] },
            { kind: 'gap', frac: 0.85 },
            { kind: 'spawn', slots: [{ type: 'complex', lane: 'center' }] },
            { kind: 'gap', frac: 0.5 },
        ],
    },
];

function recipePlayable(recipe, available) {
    if (!recipe.requires.every((type) => available.has(type))) return false;
    for (const beat of recipe.beats) {
        if (beat.kind !== 'spawn') continue;
        for (const slot of beat.slots) {
            if (slot.type !== 'simple' && !available.has(slot.type)) return false;
        }
    }
    return true;
}

function rankRecipes(eligible, focusType, pairTheme) {
    return eligible.slice().sort((a, b) => {
        const delta = recipeScore(b, focusType, pairTheme) - recipeScore(a, focusType, pairTheme);
        if (delta !== 0) return delta;
        return a.id.localeCompare(b.id);
    });
}

/**
 * Pick `count` recipes. First spike matches focus. Second spike is a different
 * family so 25+ does not get two moving/shooting gauntlets. Neighbours rotate
 * the B-side by level.
 */
export function pickEncounterRecipes({ types, focusType, pairTheme, count, level }) {
    if (count <= 0) return [];
    const available = new Set(types);
    const eligible = ENCOUNTER_CATALOG.filter((recipe) => recipePlayable(recipe, available));
    if (eligible.length === 0) return [];

    const ranked = rankRecipes(eligible, focusType, pairTheme);
    const picked = [];
    const used = new Set();

    const best = recipeScore(ranked[0], focusType, pairTheme);
    const top = ranked.filter((recipe) => recipeScore(recipe, focusType, pairTheme) === best);
    const first = top[Math.abs(level || 0) % top.length];
    picked.push(first);
    used.add(first.id);

    if (count >= 2) {
        const firstFamily = first.family;
        const otherFamily = ranked.filter(
            (recipe) => !used.has(recipe.id) && recipe.family !== firstFamily
        );
        const pool = otherFamily.length > 0
            ? otherFamily
            : ranked.filter((recipe) => !used.has(recipe.id));
        if (pool.length > 0) {
            const topScore = recipeScore(pool[0], focusType, pairTheme);
            const cutoff = topScore - 1;
            const band = pool.filter(
                (recipe) => recipeScore(recipe, focusType, pairTheme) >= cutoff
            );
            const unique = [];
            const seen = new Set();
            for (const recipe of (band.length > 0 ? band : pool)) {
                if (seen.has(recipe.family)) continue;
                seen.add(recipe.family);
                unique.push(recipe);
            }
            while (unique.length < 3) {
                const next = pool.find((recipe) => !seen.has(recipe.family));
                if (!next) break;
                seen.add(next.family);
                unique.push(next);
            }
            const second = unique[Math.abs((level || 0) + 1) % unique.length];
            picked.push(second);
            used.add(second.id);
        }
    }

    for (const recipe of ranked) {
        if (picked.length >= count) break;
        if (used.has(recipe.id)) continue;
        picked.push(recipe);
        used.add(recipe.id);
    }
    let wrap = 0;
    while (picked.length < count && ranked.length > 0 && wrap < count) {
        picked.push(ranked[wrap % ranked.length]);
        wrap += 1;
    }
    return picked;
}
