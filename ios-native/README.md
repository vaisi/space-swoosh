<!--
  ios-native/README.md
  Changes: Slice E — Journey, Hazard Lab, lore, logbook, voice channel.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Slice E (current)

- **Flicker** Open Space (Slice D feel) still live
- **Journey:** lore once → map → 40 levels / 113 stars / 7 chapters, teach L1–5
- **Hazard Lab:** 12k KM sandbox (phase / sweep / repulsor / drift / wormhole)
- Level intro beats + finish flyout (baked gate jets, no per-frame `SKShapeNode`)
- **Logbook** observe / interact / known
- Options: flight, mute, **voice**, night paper
- Persistence: `journeyProgress`, `logbookProgress` (same keys as Android)

Voice files are optional. Drop Android’s clips here, then regenerate the project:

`ios-native/SpaceSwoosh/Voice/level-1.mp3` … `level-40.mp3`  
`first-boop.mp3`, `swoosh-voice.mp3`

Not yet: remaining 22 skins, IAP, Supabase board, Firebase.

### Gate

Play L1–5 teach, a mid-game level, L40 clear cinema, Lab 12k, logbook unlocks,
voice on/off, 120 Hz on Journey density.

```bash
npm run constants:export
node ios-native/scripts/generate-pbxproj.mjs
```

## Build

Codemagic: **iOS Native → TestFlight**. Each upload must use a new
`CFBundleVersion` (Apple already has **1.0.0 (1)**). CI stamps **2+**.
