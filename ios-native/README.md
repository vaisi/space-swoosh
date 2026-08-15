<!--
  ios-native/README.md
  Changes: Slice D — Arc, leftover spawn, milestones, local PB, theme.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Slice D (current)

- **Flicker** hull / `TEAR_HITBOX` / ribbon / jelly / BOOP / `+FUEL` / CopyBank
- **Arc + zigzag** (Options → Flight). Local PB per style
- Spawn leftovers: overlap reject, no adjacent twin set-pieces, cluster `2+KM/8000`
- Advanced black-hole Y-pull after 1000 KM
- Unlock + KM milestone toasts; teach line at 80 KM
- Mode Select (Journey / Lab locked). Night paper theme
- Pause / mute. Crash + fuel-out endings
- Comet skipped — Android defines it but never spawns it

Not yet: Journey, Hazard Lab, remaining 22 skins, IAP, voice, leaderboard.

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
