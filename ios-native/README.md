<!--
  ios-native/README.md
  Changes: CFBundleVersion 9 — full 41-ship playtest hangar.
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Hangar (current)

- **41 ships** in Android `SKIN_DEFS` order. Playtest flag `UNLOCK_ALL_SKINS = true` (flip false before store). No prices / locked tiles / RevenueCat in this build
- Free forever (no `productId`): **Focus**, **Flicker**, **Ember**, **Saber**. Other defs store `com.orbi.spaceswoosh.skin.<id>` + `skin_<id>` for later IAP
- Equipped id persists as `shipSkinId` (same key as Android). Default if unset / unknown: **Flicker**
- Home: equipped hull + ◀ / ▶ cycle. Options → **Ship**: scrolling 2-column tiles (name + blurb + hull)
- One equipped renderer at `startRun` (do not allocate a trail node per ship). Baked silhouettes for 25 ships; 16 live-draw (`skipHullCache`: Lantern…Chime)
- Focus wake is **ripple** dots; Ember is **twin dotted traces**. Long wakes 200 pts / fade `1/420`; Saber/Nyan 160 / `1/360`
- Per-skin JS hitbox packs, `wallTrailMode`, jelly profiles. Hitbox is **not** deformed by jelly. Shield smash stays the scaled center circle
- Play / Journey / Lab all read the saved id. Speed and arcs stay shared
- **Journey:** lore once → map → 40 levels / 113 stars / 7 chapters, teach L1–5
- **Hazard Lab:** 12k KM sandbox (phase / sweep / repulsor / drift / wormhole / blackhole)
- Intro: 720/280 ms roll from below, 18 baked streaks, then NAV beats (Open Space waits 200 ms)
- Clear: Android hold / ramp / min / cap / fade; lean preserved; hull leaves the top
- L40 clear: sequenced `ENDING_BEATS` captions, then `JOURNEY COMPLETE` (no lights show)
- **Logbook** observe / interact / known
- Options: ship, flight, mute, **voice**, night paper
- Persistence: `journeyProgress`, `logbookProgress`, `shipSkinId` (same keys as Android)
- Audio: looping `background.mp3` (ducks under NAV); **decoded** turn / crash / shield / shield-crash / **first-boop** / **swoosh-voice** on the engine pool (synth fallback for turn/crash/shield); baked boop/collect/portal/swoosh. First wall BOOP and first style swoosh no longer open a fresh `AVAudioPlayer` (that hitch glitched the synth SFX). Clear-flyout smash SFX throttled to 120 ms
- HUD: Android mockup C (pause glyph + route / fuel / smash icon rows). Stagger: KM+fuel at 2s, pause at 3s, smash after first event
- Shield: two Signal stroke rings; **4s** (`Flicker.shieldSeconds`); pulse, then faster warning in the last 1.5s
- Sparkles: 8-vertex 4-point star (`innerRatio` 0.4) at Android radius `1.15×` unit (sprite diameter `2r`); filled `signalDisc` halo diameter `3.8r` (`signalSoft` alpha, not additive glow)
- Flicker wake: one continuous `SKShapeNode` ribbon tucked under the hull center; smudge tapers at the join; spring path wiggle on wall BOOP
- Focus ripple dots / Ember twin-dots / Saber bloom+core+crackle reuse pooled sprites (no per-frame `SKShapeNode` allocs). Other wakes: `ParticleWakeField` / ribbons / hairline
- Drift / wind: 7 thin ink30 dashes, `baseUnit`-scaled period, scrolled by phase × direction
- Cruise: Android snappy tick × **0.90** (`GameConfig.feelSpeed`)
- Menu / pause / outcome: framed ink buttons, paper wash, two-bar **MISSION PAUSED**
- Wall **BOOP** is one-shot (180 ms cooldown) and fades at Android’s 0.028/tick
- Zigzag path flips instantly; hull lean eases (`bankSmoothing` 0.34). Stretch follows `|tangent|`

Voice and SFX clips live in `ios-native/SpaceSwoosh/Voice/` (`level-N.mp3`, `first-boop.mp3`, `swoosh-voice.mp3`, `background.mp3`, `crash.mp3`, `crash_with_shield.mp3`, `shield.mp3`, `turn.mp3`). Gameplay file cues (including first-boop and swoosh-voice) decode once into engine buffers. If a clip is missing, turn/crash/shield fall back to synth. Boop / collect / portal / swoosh stay synthesized on both platforms. Journey `level-N` intros still use `AVAudioPlayer` (they play during the title beat, not mid-combat).

The audio session is **`.playback`**, so TestFlight plays with the Silent switch on. Options → SOUND OFF still mutes. Codemagic **App Preview** may still forward no audio; that is the stream, not the IPA.

Not yet: IAP / Lives / Pro / RevenueCat restore, Supabase board, Firebase.

### Gate

Side-by-side with Android hangar (flag on): each hull’s ink covers its circles;
each wake + BOOP mode reads as the same family; 120 Hz holds on a long-wake
live hull (Lantern or Wish); Flicker join still one piece. Play L1–5, Lab 12k,
picker equip, voice on/off.

```bash
npm run constants:export
node ios-native/scripts/generate-pbxproj.mjs
```

## Build

Codemagic: **iOS Native → TestFlight** (`xcode: latest`, currently Xcode 26).
Deployment **iOS 17**. Each upload must use a new `CFBundleVersion`
(Apple already has **1.0.0 (1)**). CI stamps **9+**.

To play in the browser (no Mac/device): start **iOS Native → App Preview**, then
click **Quick launch** next to `SpaceSwoosh.app` on the finished build. That
workflow builds an unsigned iPhone-simulator `.app` — a TestFlight IPA will not
show Quick launch. See [`docs/CODEMAGIC.md`](../docs/CODEMAGIC.md) §6b.
