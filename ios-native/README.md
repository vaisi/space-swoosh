<!--
  ios-native/README.md
  Changes: BGM + file SFX in Voice/; portal/swoosh stay synthesized.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Slice E (current)

- **Flicker** Open Space (Slice D feel) still live
- **Journey:** lore once → map → 40 levels / 113 stars / 7 chapters, teach L1–5
- **Hazard Lab:** 12k KM sandbox (phase / sweep / repulsor / drift / wormhole)
- Intro: 720/280 ms roll from below, 18 baked streaks, then NAV beats (Open Space waits 200 ms)
- Clear: Android hold / ramp / min / cap / fade; lean preserved; hull leaves the top
- L40 clear: sequenced `ENDING_BEATS` captions, then `JOURNEY COMPLETE` (no lights show)
- **Logbook** observe / interact / known
- Options: flight, mute, **voice**, night paper
- Persistence: `journeyProgress`, `logbookProgress` (same keys as Android)
- Audio: looping `background.mp3` (ducks under NAV), file crash/shield/turn, baked boop/collect/portal/swoosh

Voice and SFX clips live in `ios-native/SpaceSwoosh/Voice/` (`level-N.mp3`, `first-boop.mp3`, `swoosh-voice.mp3`, `background.mp3`, `crash.mp3`, `crash_with_shield.mp3`, `shield.mp3`, `turn.mp3`).

Not yet: remaining 22 skins, IAP, Supabase board, Firebase.

### Gate

Play L1–5 teach, a mid-game level, L40 caption ending, Lab 12k, logbook unlocks,
voice on/off, 120 Hz with the streak pool on.

```bash
npm run constants:export
node ios-native/scripts/generate-pbxproj.mjs
```

## Build

Codemagic: **iOS Native → TestFlight**. Each upload must use a new
`CFBundleVersion` (Apple already has **1.0.0 (1)**). CI stamps **2+**.
