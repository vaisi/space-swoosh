// golden-zigzag.mjs
// Changes: Phase C — print JS zigzag Δx for one 1/60 tick (compare CombatParity).

import { GameConfig } from '../src/config/GameConfig.js';

const height = 844;
const rad = (GameConfig.spacecraft.zigzagAngleDeg * Math.PI) / 180;
const speed = GameConfig.spacecraft.speed * height * GameConfig.spacecraft.zigzagSpeedScale;
const dx = Math.sin(rad) * speed * (1 / 60);
console.log(JSON.stringify({ height, dt: 1 / 60, firstStepDeltaX: dx }, null, 2));
