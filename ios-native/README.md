<!--
  ios-native/README.md
  Changes: Phase C — Open Space combat, shared constants, golden zigzag helper.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Phase C scope (current)

- Open Space combat on the Phase B bake/pool renderer
- Unlock ladder (simple → sweep) by KM
- Fuel drain / sparkle magnet / shield smash / wall boost / style swoosh
- Crash or fuel-out → game over + Play Again
- Shared spec: [`../shared/game-constants.json`](../shared/game-constants.json)
- Golden helper: `CombatParity.zigzagSampleX` / `npm run constants:golden`

Not yet: Journey, Hazard Lab, 23 skins, IAP, voice, leaderboard.

### Gate

Side-by-side vs Android Capacitor: steering, spawn density, collision
forgiveness, fuel pace. Keep 120 Hz — no LOD.

```bash
npm run constants:export
npm run constants:golden
```

## Build

Codemagic: **iOS Native → TestFlight**. After adding Swift files:

```bash
node ios-native/scripts/generate-pbxproj.mjs
```
