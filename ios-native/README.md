<!--
  ios-native/README.md
  Changes: C.5.1 — KM normalized to 800px Android height; pickup look/spawn match.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Phase C.5 scope (current)

- Open Space combat on the Phase B bake/pool renderer
- Per-type JS hitboxes (`HazardCollision.swift`) — no global 0.72 shrink
- Full-phone playfield (no 2:3 letterbox). KM still uses an 800px reference height.
- Pickups: sparkle 1.15× + magnet, ink plus + rings every 5s, wall slab 0.9×10 @ 22s
- Real silhouettes: blade, slab, pentagon, star, moons, dashed portal, wind
- Wormhole / drift are non-lethal; sweep is a thin OBB; simples use 0.9–1.4× `baseUnit`
- Unlock ladder (simple → sweep) by KM
- Fuel, magnet, shield smash (core vs moon), wall boost, swoosh, teleport
- Crash or fuel-out → game over + Play Again
- Shared spec: [`../shared/game-constants.json`](../shared/game-constants.json)
- Golden helper: `CombatParity.zigzagSampleX` / `npm run constants:golden`

Not yet: Journey, Hazard Lab, 23 skins, IAP, voice, leaderboard.

### Gate

Side-by-side vs Android: rocks look like the JS types, deaths match the ink,
120 Hz holds — no LOD / no per-frame `SKShapeNode`.

```bash
npm run constants:export
npm run constants:golden
```

## Build

Codemagic: **iOS Native → TestFlight**. Each upload must use a new
`CFBundleVersion` (Apple already has **1.0.0 (1)**). CI stamps **2+**.

After adding Swift files:

```bash
node ios-native/scripts/generate-pbxproj.mjs
```
