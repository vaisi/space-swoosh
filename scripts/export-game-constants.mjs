// export-game-constants.mjs
// Changes: Phase C — dump JS tunables to shared/game-constants.json (spec for Swift).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameConfig } from '../src/config/GameConfig.js';
import { OPEN_WORLD_UNLOCKS } from '../src/modes/RunProfile.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = {
  version: 1,
  source: 'src/config/GameConfig.js + src/modes/RunProfile.js',
  simDt: 1 / 60,
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
