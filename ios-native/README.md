<!--
  ios-native/README.md
  Changes: Slice E feel-parity — shield rings, sparkle star, HUD/menu chrome, buffered turn.
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
- Audio: looping `background.mp3` (ducks under NAV), file crash/shield, **decoded `turn.mp3`** on the engine pool at 0.3 (synth fallback), baked boop/collect/portal/swoosh
- HUD: Android mockup C (pause glyph + route / fuel / smash icon rows). Stagger: KM+fuel at 2s, pause at 3s, smash after first event
- Shield: two Signal stroke rings; pulse, then faster warning in the last 1.5s
- Sparkles: 8-vertex 4-point star (`innerRatio` 0.4)
- Flicker wake: one continuous `SKShapeNode` ribbon; spring jelly + width/smudge kick on wall BOOP
- Menu / pause / outcome: framed ink buttons, paper wash, two-bar **MISSION PAUSED**, Flicker-only home preview (no ship picker)
- Wall **BOOP** is one-shot (180 ms cooldown) and fades at Android’s 0.028/tick
- Zigzag path flips instantly; hull lean eases (`bankSmoothing` 0.34). Stretch follows `|tangent|`

Voice and SFX clips live in `ios-native/SpaceSwoosh/Voice/` (`level-N.mp3`, `first-boop.mp3`, `swoosh-voice.mp3`, `background.mp3`, `crash.mp3`, `crash_with_shield.mp3`, `shield.mp3`, `turn.mp3`). `turn.mp3` is decoded once into an engine buffer at volume 0.3 (same as Android). If a clip is missing, turn/crash/shield fall back to synth. Boop / collect / portal / swoosh stay synthesized on both platforms.

The audio session is **`.playback`**, so TestFlight plays with the Silent switch on. Options → SOUND OFF still mutes. Codemagic **App Preview** may still forward no audio; that is the stream, not the IPA.

Not yet: remaining 22 skins, IAP, Supabase board, Firebase.

### Gate

Play L1–5 teach, a mid-game level, L40 caption ending, Lab 12k, logbook unlocks,
voice on/off, 120 Hz with the streak pool on. Confirm shield pulse + warning,
sparkle star, wall-boop ribbon kick, mockup-C HUD, framed menus, and turn sample.

```bash
npm run constants:export
node ios-native/scripts/generate-pbxproj.mjs
```

## Build

Codemagic: **iOS Native → TestFlight** (`xcode: latest`, currently Xcode 26).
Deployment **iOS 17**. Each upload must use a new `CFBundleVersion`
(Apple already has **1.0.0 (1)**). CI stamps **4+**.

To play in the browser (no Mac/device): start **iOS Native → App Preview**, then
click **Quick launch** next to `SpaceSwoosh.app` on the finished build. That
workflow builds an unsigned iPhone-simulator `.app` — a TestFlight IPA will not
show Quick launch. See [`docs/CODEMAGIC.md`](../docs/CODEMAGIC.md) §6b.
