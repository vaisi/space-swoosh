// export-game-constants.mjs
// Changes: emit ENDING_EPILOGUE (42-level written ending) instead of ENDING_BEATS.
// Skip captions export as epilogueSkip beats (one phrase per line).
// Arc unlock card copy: epilogueArcUnlockLines / epilogueArcUnlockLabel.
// Journey levels also export pairTheme + comboTheme + encounterCount for the L20+ belt.
// EncounterCatalog.js is the source of truth for late-Journey gauntlets; emit it
// into game-constants.json and GeneratedJourneyData.encounterCatalog.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameConfig } from '../src/config/GameConfig.js';
import { OPEN_WORLD_UNLOCKS } from '../src/modes/RunProfile.js';
import { copyPool } from '../src/brand/CopyBank.js';
import {
  JOURNEY_LEVELS,
  JOURNEY_CHAPTERS,
  TOTAL_LEVELS,
  TOTAL_STARS,
  STARS_PER_LEVEL,
  POINTS_FROM_LEVEL,
  SHIELDS_FROM_LEVEL,
} from '../src/config/JourneyConfig.js';
import {
  DEFAULT_BEAT_GAP_MS,
  FIRST_BOOP_BEATS,
  PRE_LEVEL_1_LORE,
  PRE_LEVEL_1_LORE_TITLE,
  LEVEL_MESSAGES,
  ENDING_EPILOGUE,
  EPILOGUE_INSTAGRAM_HANDLE,
  EPILOGUE_INSTAGRAM_URL,
  levelIntroBeats,
} from '../src/config/JourneyNarrative.js';
import { HAZARD_LAB, HAZARD_LAB_INTRO } from '../src/config/HazardLabConfig.js';
import {
  LOGBOOK_CATEGORIES,
  LOGBOOK_ENTRIES,
  LORE_ENTRY_ID,
  OBSERVED_PENDING_LINES,
  EMPTY_LOGBOOK_COPY,
  EMPTY_CATEGORY_COPY,
} from '../src/config/LogbookEntries.js';
import { ENCOUNTER_CATALOG } from '../src/config/EncounterCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function swiftStr(value) {
  return JSON.stringify(String(value ?? ''));
}

function optSwiftStr(value) {
  return value == null || value === '' ? 'nil' : swiftStr(value);
}

function normalizeBeat(beat) {
  if (typeof beat === 'string') {
    return { text: beat, gapAfterMs: DEFAULT_BEAT_GAP_MS };
  }
  return {
    text: String(beat?.text || '').trim(),
    gapAfterMs: Number.isFinite(beat?.gapAfterMs) ? beat.gapAfterMs : DEFAULT_BEAT_GAP_MS,
  };
}

function swiftBeats(beats) {
  return beats.map((beat) => {
    const n = normalizeBeat(beat);
    return `        IntroBeat(text: ${swiftStr(n.text)}, gapAfterMs: ${Math.round(n.gapAfterMs)})`;
  }).join(',\n');
}

function serializeCatalog(catalog) {
  return catalog.map((recipe) => ({
    id: recipe.id,
    family: recipe.family,
    requires: [...recipe.requires],
    beats: recipe.beats.map((beat) => ({
      kind: beat.kind,
      frac: beat.kind === 'gap' ? (Number.isFinite(beat.frac) ? beat.frac : 0) : 0,
      slots: (beat.slots || []).map((slot) => ({
        type: slot.type,
        lane: slot.lane ?? null,
      })),
    })),
  }));
}

function swiftEncounterSlot(slot) {
  return `EncounterSlot(type: ${swiftStr(slot.type)}, lane: ${optSwiftStr(slot.lane)})`;
}

function swiftEncounterBeat(beat) {
  const slots = (beat.slots || []).map(swiftEncounterSlot).join(', ');
  const frac = beat.kind === 'gap' ? (Number.isFinite(beat.frac) ? beat.frac : 0) : 0;
  return `EncounterBeat(kind: ${swiftStr(beat.kind)}, frac: ${frac}, slots: [${slots}])`;
}

function swiftEncounterRecipe(recipe) {
  const requires = recipe.requires.map((type) => swiftStr(type)).join(', ');
  const beats = recipe.beats
    .map((beat) => `                ${swiftEncounterBeat(beat)}`)
    .join(',\n');
  return `        EncounterRecipe(
            id: ${swiftStr(recipe.id)},
            family: ${swiftStr(recipe.family)},
            requires: [${requires}],
            beats: [
${beats}
            ]
        )`;
}

const encounterCatalog = serializeCatalog(ENCOUNTER_CATALOG);

// TEAR_HITBOX is not exported from skinDefs; keep in lockstep with that file.
const TEAR_HITBOX = [
  { x: 0, y: -0.61, r: 0.1 },
  { x: 0, y: -0.35, r: 0.23 },
  { x: 0, y: 0.16, r: 0.53 },
  { x: -0.33, y: 0.28, r: 0.33 },
  { x: 0.32, y: 0.28, r: 0.34 },
];

const journeyLevels = JOURNEY_LEVELS.map((level) => ({
  level: level.level,
  chapterId: level.chapterId,
  chapterName: level.chapterName,
  difficulty: level.difficulty,
  goalKm: level.goalKm,
  types: level.types,
  focusType: level.focusType,
  pairTheme: level.pairTheme,
  comboTheme: level.comboTheme,
  encounterCount: level.encounterCount,
  introduces: level.introduces,
  sparklesTarget: level.sparklesTarget,
  smashTarget: level.smashTarget,
  starSlots: level.starSlots,
}));

const introBeats = {};
for (let n = 1; n <= TOTAL_LEVELS; n += 1) {
  introBeats[n] = levelIntroBeats(n) ?? [{ text: LEVEL_MESSAGES[n], gapAfterMs: DEFAULT_BEAT_GAP_MS }];
}

const out = {
  version: 3,
  source: 'GameConfig + RunProfile + JourneyConfig + JourneyNarrative + Logbook + CopyBank + EncounterCatalog',
  simDt: 1 / 60,
  defaultShipId: 'flicker',
  fuel: GameConfig.fuel,
  points: {
    perAsteroid: GameConfig.points.perAsteroid,
    perSwoosh: GameConfig.points.perSwoosh,
  },
  styleSwoosh: GameConfig.styleSwoosh,
  spacecraft: {
    radius: GameConfig.spacecraft.radius,
    speed: GameConfig.spacecraft.speed,
    zigzagAngleDeg: GameConfig.spacecraft.zigzagAngleDeg,
    zigzagSpeedScale: GameConfig.spacecraft.zigzagSpeedScale,
    arcRadius: GameConfig.spacecraft.arcRadius,
    arcDuration: GameConfig.spacecraft.arcDuration,
    trailSpacing: GameConfig.spacecraft.trailSpacing,
    maxBank: 0.96,
    tailOffset: 0.6,
  },
  flicker: {
    id: 'flicker',
    hitbox: TEAR_HITBOX,
    trailMaxPoints: 80,
    trailFadePerTick: 1 / 180,
    trailWidthScale: 0.6,
    wallTrailMode: 'spring',
    wallJellyMs: 420,
    boopCooldownMs: 180,
    shieldHitboxScale: 1.5,
  },
  copy: {
    menu: [...copyPool('menu')],
    crash: [...copyPool('crash')],
    fuelOut: [...copyPool('fuelOut')],
    victory: [...copyPool('victory')],
    modeJourney: [...copyPool('modeJourney')],
    modeOpenWorld: [...copyPool('modeOpenWorld')],
    fail: [...copyPool('fail')],
    clearPartial: [...copyPool('clearPartial')],
    clearFlawless: [...copyPool('clearFlawless')],
    journeyComplete: [...copyPool('journeyComplete')],
  },
  obstacles: {
    minSize: GameConfig.obstacles.minSize,
    maxSize: GameConfig.obstacles.maxSize,
    scaling: GameConfig.obstacles.scaling,
  },
  profile: {
    shieldsFromScore: 500,
    collectiblesFromScore: 100,
    wallBoostsFromScore: 12000,
    obstaclesFromScore: 0,
    simpleChance: 0.65,
    maxRowSpawns: 3,
    maxClusterCount: 4,
  },
  kmPerPixel: 100 / 60,
  openWorldUnlocks: OPEN_WORLD_UNLOCKS.map(({ type, score }) => ({ type, score })),
  journey: {
    totalLevels: TOTAL_LEVELS,
    totalStars: TOTAL_STARS,
    starsPerLevel: STARS_PER_LEVEL,
    pointsFromLevel: POINTS_FROM_LEVEL,
    shieldsFromLevel: SHIELDS_FROM_LEVEL,
    lore: PRE_LEVEL_1_LORE,
    loreTitle: PRE_LEVEL_1_LORE_TITLE,
    loreEntryId: LORE_ENTRY_ID,
    chapters: JOURNEY_CHAPTERS.map((chapter) => ({
      id: chapter.id,
      name: chapter.name,
      blurb: chapter.blurb,
      from: chapter.from,
      to: chapter.to,
    })),
    levels: journeyLevels,
    messages: LEVEL_MESSAGES,
    introBeats,
    firstBoopBeats: FIRST_BOOP_BEATS.map(normalizeBeat),
    endingEpilogue: {
      open: ENDING_EPILOGUE.open.map(normalizeBeat),
      prompt: ENDING_EPILOGUE.prompt,
      promptPlaceholder: ENDING_EPILOGUE.promptPlaceholder,
      submitLabel: ENDING_EPILOGUE.submitLabel,
      skipLabel: ENDING_EPILOGUE.skipLabel,
      skip: (ENDING_EPILOGUE.skip || []).map(normalizeBeat),
      skipLine: ENDING_EPILOGUE.skipLine,
      offlineCounterCard: ENDING_EPILOGUE.offlineCounterCard,
      counterCard: ENDING_EPILOGUE.counterCard,
      footerCard: ENDING_EPILOGUE.footerCard,
      arcUnlockLines: ENDING_EPILOGUE.arcUnlockLines || [],
      arcUnlockLabel: ENDING_EPILOGUE.arcUnlockLabel,
      instagramHandle: EPILOGUE_INSTAGRAM_HANDLE,
      instagramUrl: EPILOGUE_INSTAGRAM_URL,
    },
    defaultBeatGapMs: DEFAULT_BEAT_GAP_MS,
    encounterCatalog,
  },
  hazardLab: {
    ...HAZARD_LAB,
    intro: HAZARD_LAB_INTRO,
  },
  logbook: {
    categories: LOGBOOK_CATEGORIES,
    entries: LOGBOOK_ENTRIES,
    observedPending: OBSERVED_PENDING_LINES,
    empty: EMPTY_LOGBOOK_COPY,
    emptyCategory: EMPTY_CATEGORY_COPY,
  },
};

const dest = path.join(root, 'shared', 'game-constants.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${dest}`);

const levelLines = journeyLevels.map((level) => {
  const types = level.types.map((type) => swiftStr(type)).join(', ');
  return `        JourneyLevelSpec(
            level: ${level.level},
            chapterId: ${swiftStr(level.chapterId)},
            chapterName: ${swiftStr(level.chapterName)},
            difficulty: ${level.difficulty},
            goalKm: ${level.goalKm},
            types: [${types}],
            focusType: ${optSwiftStr(level.focusType)},
            pairTheme: ${optSwiftStr(level.pairTheme)},
            comboTheme: ${optSwiftStr(level.comboTheme)},
            encounterCount: ${level.encounterCount ?? 0},
            introduces: ${optSwiftStr(level.introduces)},
            sparklesTarget: ${level.sparklesTarget},
            smashTarget: ${level.smashTarget},
            starSlots: ${level.starSlots}
        )`;
}).join(',\n');

const chapterLines = JOURNEY_CHAPTERS.map((chapter) => `        JourneyChapter(
            id: ${swiftStr(chapter.id)},
            name: ${swiftStr(chapter.name)},
            blurb: ${swiftStr(chapter.blurb)},
            from: ${chapter.from},
            to: ${chapter.to}
        )`).join(',\n');

const messageLines = Object.entries(LEVEL_MESSAGES)
  .map(([n, text]) => `        ${n}: ${swiftStr(text)}`)
  .join(',\n');

const beatBlocks = Object.entries(introBeats)
  .map(([n, beats]) => `        ${n}: [\n${swiftBeats(beats)}\n        ]`)
  .join(',\n');

const logbookLines = LOGBOOK_ENTRIES.map((entry) => `        LogbookEntrySpec(
            id: ${swiftStr(entry.id)},
            category: ${swiftStr(entry.category)},
            name: ${swiftStr(entry.name)},
            definition: ${swiftStr(entry.definition)},
            remark: ${swiftStr(entry.remark)},
            unlockMode: ${swiftStr(entry.unlockMode)}
        )`).join(',\n');

const categoryLines = LOGBOOK_CATEGORIES
  .map((c) => `        LogbookCategorySpec(id: ${swiftStr(c.id)}, label: ${swiftStr(c.label)})`)
  .join(',\n');

const pendingLines = OBSERVED_PENDING_LINES.map((line) => `        ${swiftStr(line)}`).join(',\n');
const emptyCatLines = Object.entries(EMPTY_CATEGORY_COPY)
  .map(([k, v]) => `        ${swiftStr(k)}: ${swiftStr(v)}`)
  .join(',\n');

const firstBoop = swiftBeats(FIRST_BOOP_BEATS.map(normalizeBeat));
const epilogueOpen = swiftBeats(ENDING_EPILOGUE.open.map(normalizeBeat));
const epilogueSkip = swiftBeats((ENDING_EPILOGUE.skip || []).map(normalizeBeat));
const encounterLines = encounterCatalog.map(swiftEncounterRecipe).join(',\n');

const swift = `// GeneratedJourneyData.swift
// Changes: generated by scripts/export-game-constants.mjs. Do not edit by hand.

import CoreGraphics

enum GeneratedJourneyData {
    static let totalLevels = ${TOTAL_LEVELS}
    static let totalStars = ${TOTAL_STARS}
    static let starsPerLevel = ${STARS_PER_LEVEL}
    static let pointsFromLevel = ${POINTS_FROM_LEVEL}
    static let shieldsFromLevel = ${SHIELDS_FROM_LEVEL}
    static let defaultBeatGapMs = ${DEFAULT_BEAT_GAP_MS}
    static let lore = ${swiftStr(PRE_LEVEL_1_LORE)}
    static let loreTitle = ${swiftStr(PRE_LEVEL_1_LORE_TITLE)}
    static let loreEntryId = ${swiftStr(LORE_ENTRY_ID)}
    static let labIntro = ${swiftStr(HAZARD_LAB_INTRO)}
    static let labGoalKm: CGFloat = ${HAZARD_LAB.goalKm}
    static let labDifficulty: CGFloat = ${HAZARD_LAB.difficulty}
    static let labTypes = [${HAZARD_LAB.types.map((t) => swiftStr(t)).join(', ')}]
    static let emptyLogbook = ${swiftStr(EMPTY_LOGBOOK_COPY)}
    static let epiloguePrompt = ${swiftStr(ENDING_EPILOGUE.prompt)}
    static let epiloguePromptPlaceholder = ${swiftStr(ENDING_EPILOGUE.promptPlaceholder)}
    static let epilogueSubmitLabel = ${swiftStr(ENDING_EPILOGUE.submitLabel)}
    static let epilogueSkipLabel = ${swiftStr(ENDING_EPILOGUE.skipLabel)}
    static let epilogueSkipLine = ${swiftStr(ENDING_EPILOGUE.skipLine)}
    static let epilogueOfflineCard = ${swiftStr(ENDING_EPILOGUE.offlineCounterCard)}
    static let epilogueCounterCard = ${swiftStr(ENDING_EPILOGUE.counterCard)}
    static let epilogueFooterCard = ${swiftStr(ENDING_EPILOGUE.footerCard)}
    static let epilogueArcUnlockLines = [${(ENDING_EPILOGUE.arcUnlockLines || []).map((line) => swiftStr(line)).join(', ')}]
    static let epilogueArcUnlockLabel = ${swiftStr(ENDING_EPILOGUE.arcUnlockLabel)}
    static let epilogueInstagramHandle = ${swiftStr(EPILOGUE_INSTAGRAM_HANDLE)}
    static let epilogueInstagramUrl = ${swiftStr(EPILOGUE_INSTAGRAM_URL)}

    static let chapters: [JourneyChapter] = [
${chapterLines}
    ]

    static let levels: [JourneyLevelSpec] = [
${levelLines}
    ]

    static let messages: [Int: String] = [
${messageLines}
    ]

    static let introBeats: [Int: [IntroBeat]] = [
${beatBlocks}
    ]

    static let firstBoopBeats: [IntroBeat] = [
${firstBoop}
    ]

    static let epilogueOpen: [IntroBeat] = [
${epilogueOpen}
    ]

    static let epilogueSkip: [IntroBeat] = [
${epilogueSkip}
    ]

    static let logbookCategories: [LogbookCategorySpec] = [
${categoryLines}
    ]

    static let logbookEntries: [LogbookEntrySpec] = [
${logbookLines}
    ]

    static let observedPending: [String] = [
${pendingLines}
    ]

    static let emptyCategory: [String: String] = [
${emptyCatLines}
    ]

    static let encounterCatalog: [EncounterRecipe] = [
${encounterLines}
    ]
}
`;

const swiftDest = path.join(root, 'ios-native', 'SpaceSwoosh', 'Core', 'GeneratedJourneyData.swift');
fs.mkdirSync(path.dirname(swiftDest), { recursive: true });
fs.writeFileSync(swiftDest, swift);
console.log(`Wrote ${swiftDest}`);
