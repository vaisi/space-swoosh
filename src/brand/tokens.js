// tokens.js
// -----------------------------------------------------------------------------
// SPACE SWOOSH — Brand design tokens (single source of truth).
//
// Changes:
// - Theme toggle: `color` is mutated in place by brand/theme.js (light cream /
//   dark night-paper). Defaults below are night paper until initTheme() runs.
// - Night paper (feat/night-paper): inverted palette — warm deep charcoal ground,
//   bone ink for shapes/text. Accent is vivid mint on dark; Signal Blue on light.
//   Added `paperRgb` for canvas washes.
// - Added `ember` / `emberRgb` — warm trail-only accent for special ship wakes
//   (Cinder). Not a second UI accent.
// - Added `inkRgb` so canvas VFX (e.g. wall BOOP) can build rgba() strings
//   the same way Signal Blue does via `signalRgb`.
// - Created file: the canonical brand kit for the game, distilled from the
//   in-game aesthetic (paper ground, ink shapes, blue shield, dotted trail,
//   geometric obstacles, crosshair reticle). Replaces the ad-hoc constants that
//   were scattered across DrawUtils.js / Game.js / index.html.
// - Direction: "geometric minimalism". Retires the hand-drawn Comic Sans + Arial
//   look in favour of a precise, spacey, geometric type system (Space Grotesk +
//   Space Mono) with tabular numerals so the HUD figures stop jumping.
// - Every surface is clean flat paper (no grid). Buttons/sections adopt a framed
//   motif-tile treatment (see `frame`). Voice is now Spock: logical, precise.
// - Expanded `motif` into the full in-game element vocabulary (asteroids, shards,
//   stars, pentagons, belts, comets, black holes, teleport gates, barriers,
//   shields) and defined on-brand teleport states (replacing the green exit gate).
//
// Anything that draws a screen (canvas HUD, DOM overlays, CSS) should read from
// here so every surface stays on-brand.
// -----------------------------------------------------------------------------

// --- Color -------------------------------------------------------------------
// Night paper: monochrome-plus-one inverted. Dark warm ground, light bone ink
// for structure, and a single soft mint "signal" as the only accent.
export const color = {
    // Ground — warm deep charcoal. The whole universe sits on this.
    paper:        '#1C1A16',
    paperTint:    '#2A2620', // raised surfaces / cards
    paperDeep:    '#12100E', // recessed wells / pressed states
    paperRgb:     '28, 26, 22',

    // Ink — warm bone (never pure white). Used for shapes, text, structure.
    ink:          '#E1D9C1',
    ink80:        'rgba(225, 217, 193, 0.80)', // secondary text
    ink55:        'rgba(225, 217, 193, 0.55)', // muted text / hints
    ink30:        'rgba(225, 217, 193, 0.30)', // dotted trails / dividers
    ink12:        'rgba(225, 217, 193, 0.12)', // grid lines / fills
    ink06:        'rgba(225, 217, 193, 0.06)', // faint pattern wash
    inkRgb:       '225, 217, 193',

    // Signal — the one accent. Vivid mint on night paper (shield, focus, active).
    signal:       '#3DFF9A',
    signalSoft:   'rgba(61, 255, 154, 0.32)',
    signalRgb:    '61, 255, 154',

    // Ember — warm trail heat for ship wakes only (never HUD / buttons).
    // Lifted copper so wakes still read on night paper without fighting Signal.
    ember:        '#C47855',
    emberSoft:    'rgba(196, 120, 85, 0.22)',
    emberRgb:     '196, 120, 85',
};

// Semantic aliases — reference these in code so intent stays readable.
export const semantic = {
    background:   color.paper,
    surface:      color.paperTint,
    surfaceSunk:  color.paperDeep,

    textPrimary:  color.ink,
    textSecondary: color.ink80,
    textMuted:    color.ink55,

    stroke:       color.ink,
    strokeSoft:   color.ink30,
    divider:      color.ink12,

    accent:       color.signal,
    accentSoft:   color.signalSoft,

    // Gameplay entities keep semantic names so tuning is centralized.
    obstacle:     color.ink,
    trail:        color.ink30,
    reticle:      color.ink,
    shield:       color.signal,
};

// --- Typography --------------------------------------------------------------
// Two geometric typefaces from the same design world (both literally "Space").
// - Space Grotesk : structural, wordmark, titles, labels, buttons.
// - Space Mono    : numerals, HUD, stats, timers — tabular so digits never jump.
export const font = {
    display: `'Space Grotesk', 'Segoe UI', system-ui, sans-serif`,
    ui:      `'Space Grotesk', 'Segoe UI', system-ui, sans-serif`,
    mono:    `'Space Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace`,

    weight: { regular: 400, medium: 500, bold: 700 },

    // Tracking (letter-spacing) — geometric minimalism likes air on labels.
    tracking: {
        tight:  '-0.02em',
        normal: '0',
        wide:   '0.08em',
        label:  '0.18em', // ALL-CAPS micro labels ("KM", "SCORE", "PAUSED")
    },

    // Type scale (px @ base). Canvas code multiplies these by baseUnit ratios
    // via `scale` below; DOM/CSS uses the px values directly.
    size: {
        hud:      28,  // primary HUD readout (distance)
        hudSub:   16,  // secondary HUD (obstacles destroyed)
        micro:    12,  // ALL-CAPS unit labels
        title:    46,  // end-screen titles
        heading:  28,
        body:     18,
        caption:  14,
    },

    lineHeight: { tight: 1.05, snug: 1.25, normal: 1.5 },
};

// Canvas type helper — the game measures type in `baseUnit`s, not px. These are
// the multipliers that reproduce the scale above on the canvas HUD.
export const scale = {
    hud:     2.0,  // baseUnit * 2.0  -> distance readout
    hudSub:  1.3,
    micro:   0.95,
    title:   4.0,
    heading: 2.6,
    body:    1.7,
};

// --- Geometry & motif --------------------------------------------------------
// One shape family: flat geometric shapes in ink on paper. Complexity comes from
// *combining and animating* these, never from new textures, gradients or styles.
export const motif = {
    // The base shape alphabet everything is drawn from.
    primitives: ['circle', 'triangle', 'square', 'pentagon', 'star', 'ellipse', 'ring', 'dot-trail', 'reticle'],
    // Obstacle squares are gently rotated (never axis-locked) for tension.
    squareRotation: 0.14, // radians (~8deg)
    // Signature dotted trail — echo it in dividers, loaders, progress.
    trail: { dotRadius: 1.5, gap: 8 },
    // Crosshair reticle — the focus/target glyph. Ring + plus.
    reticle: { ringRatio: 0.9, crossRatio: 0.45, gapRatio: 0.22 },
    // Corner radius: geometry stays crisp. Almost everything is a hard edge.
    radius: { none: 0, sm: 2, pill: 999 },
    // Stroke weights relative to baseUnit (canvas) with px fallbacks (DOM).
    stroke: { hair: 1, thin: 1.5, base: 2, bold: 3 },

    // The full in-game element vocabulary → shape + fill + meaning. Every entity
    // the game spawns maps to one of these; keep new content within this set.
    // `fill: 'ink'` = solid bone ink, `signal` = the blue accent, `ink30` = trail.
    elements: {
        // --- Asteroids & debris (obstacles; all solid ink) ---
        asteroid: { shape: 'circle',            fill: 'ink',    role: 'Basic asteroid' },
        shard:    { shape: 'triangle',          fill: 'ink',    role: 'Debris shard' },
        block:    { shape: 'square',            fill: 'ink',    role: 'Debris block (rotated ~8°)' },
        drifter:  { shape: 'pentagon',          fill: 'ink',    role: 'Moving asteroid (side-to-side)' },
        hostile:  { shape: 'star',              fill: 'ink',    role: 'Shooting asteroid (emits dots)' },
        belt:     { shape: 'ellipse',           fill: 'ink',    role: 'Asteroid belt / wide band' },
        cluster:  { shape: 'circle + orbit',    fill: 'ink',    role: 'Complex asteroid + orbiting debris' },
        pulsar:   { shape: 'circle (scaling)',  fill: 'ink',    role: 'Pulsating / unstable asteroid' },
        comet:    { shape: 'circle + trail',    fill: 'ink',    role: 'Fast comet fly-by' },
        barrier:  { shape: 'bar',               fill: 'ink',    role: 'Side barrier (screen edge)' },
        // --- Anomalies (hazards) ---
        blackhole:{ shape: 'disc + glow + ring',fill: 'ink',    role: 'Gravity well — pulls the ship in' },
        teleport: { shape: 'dashed ring',       fill: 'signal', role: 'Wormhole gate — teleports + grants shield' },
        // --- Player & signals ---
        ship:     { shape: 'reticle',           fill: 'ink+signal', role: 'The player craft (focus glyph)' },
        trail:    { shape: 'dot-path',          fill: 'ink30',  role: "The ship's wake" },
        shield:   { shape: 'ring',              fill: 'signal', role: 'Protection pickup / active state' },
    },

    // Teleport gates use the signal system, NOT green. Entry = solid signal ring;
    // exit = hollow ink ring; spent = muted ink. (Fixes the off-brand #00ff00.)
    teleportStates: {
        entry: { stroke: color.signal, dash: [6, 6] },
        exit:  { stroke: color.ink,    dash: [2, 6] },
        spent: { stroke: color.ink30,  dash: [2, 6] },
    },
};

// --- Frame (the section / tile treatment) ------------------------------------
// The bordered "motif tile" look — a crisp ink outline on a raised paper tint,
// often with a caption bar (bold label + a mono micro-tag). Buttons, cards and
// panels all share this so every boxed element feels like the same system.
export const frame = {
    border:   `1.5px solid ${color.ink}`,
    surface:  color.paperTint,
    divider:  color.ink12,       // the caption-bar separator
    radius:   0,                 // hard geometric corners
    labelTag: color.ink55,       // mono micro-tag colour in the caption
    hoverLift: -2,               // px translateY on hover
};

// --- Spacing -----------------------------------------------------------------
// 8px modular grid. Minimalism = generous, consistent negative space.
export const space = {
    unit: 8,
    xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64,
    // Safe inset for HUD elements from the canvas edge (in baseUnits).
    hudInset: 2,
};

// --- Motion ------------------------------------------------------------------
export const motion = {
    duration: { fast: 120, base: 240, slow: 480 },
    easing: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
};

// --- Voice -------------------------------------------------------------------
// Spock. Logical, precise, understated. State facts and probabilities; never
// gush, never use exclamation marks or emoji. A dry wonder ("Fascinating.") is
// permitted. Milestone/notification copy should read like a science officer's log.
export const voice = {
    persona: 'Science officer — logical, precise, dryly curious (Spock).',
    do: [
        'Fascinating.',
        'Asteroid density increasing. Survival probability: 4.2%.',
        'Your trajectory is illogical, yet effective.',
        'Live long and prosper.',
    ],
    dont: [
        'Oops! You crashed!!',
        'Wanna play again buddy?',
        'GREAT JOB SUPERSTAR!!!',
    ],
    // Milestone copy, rewritten in-persona (mirrors GameConfig.milestones).
    milestones: {
        1000:  'Atmosphere cleared. Ascent nominal.',
        2000:  'Complex asteroids detected. Recalculating trajectory.',
        5000:  'Asteroid belt ahead. Collision: probable.',
        10000: 'Deep space. No signs of life.',
        25000: 'Unknown signals. Origin: indeterminate.',
        50000: 'Approaching the void. Fascinating.',
    },
};

// Convenience: one object to import when you just want "the brand".
export const brand = { color, semantic, font, scale, motif, frame, space, motion, voice };
export default brand;
