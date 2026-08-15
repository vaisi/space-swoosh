<!--
  ios-native/README.md
  Changes: Slice D wave 1 — Flicker micro-parity, +FUEL, CopyBank, endings.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Slice D wave 1 (current)

- **Flicker** is the only playable hull (baked `tearPath`, `TEAR_HITBOX`, ribbon + spring jelly)
- Wall **BOOP** popup + Light haptic + 320→180 Hz blip
- Sparkle **+FUEL** popup + B5→F#6 chime; empty tank coasts 900 ms then fuel-out
- Crash: 30-particle blast + world fade; title always **MISSION FAILED** + CopyBank line
- Menu tagline from CopyBank (new line each visit)
- Pause: Resume / Sound / Exit
- Open Space combat from C.5 (JS hitboxes, silhouettes, pickups, KM @ 800px ref)
- Shared spec: [`../shared/game-constants.json`](../shared/game-constants.json) v2

Not yet: Arc, Journey, Hazard Lab, remaining 22 skins, IAP, voice, leaderboard.

### Gate

Side-by-side vs Android **on Flicker**: tear ink, ribbon, BOOP, +FUEL, death lines.
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
