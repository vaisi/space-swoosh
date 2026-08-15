// export-game-constants.mjs
// Changes: Slice D — also dump Flicker hitbox/trail/jelly/boop + CopyBank pools.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameConfig } from '../src/config/GameConfig.js';
import { OPEN_WORLD_UNLOCKS } from '../src/modes/RunProfile.js';
import { copyPool } from '../src/brand/CopyBank.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// TEAR_HITBOX is not exported from skinDefs; keep in lockstep with that file.
const TEAR_HITBOX = [
  { x: 0, y: -0.61, r: 0.1 },
  { x: 0, y: -0.35, r: 0.23 },
  { x: 0, y: 0.16, r: 0.53 },
  { x: -0.33, y: 0.28, r: 0.33 },
  { x: 0.32, y: 0.28, r: 0.34 },
];

const out = {
  version: 2,
  source: 'src/config/GameConfig.js + src/modes/RunProfile.js + skinDefs/CopyBank',
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
};

const dest = path.join(root, 'shared', 'game-constants.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${dest}`);
