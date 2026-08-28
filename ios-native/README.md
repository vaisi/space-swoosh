<!--
 ios-native/README.md
 Changes: Epilogue Open Instagram → https://www.instagram.com/spaceswoosh.app.
 UNLOCK_ALL_LEVELS is false; Hazard Lab tile hidden (showHazardLab).
-->

# Space Swoosh — Native iOS (`ios-native/`)

True-native iOS client (**SpriteKit + SwiftUI**). Bundle ID `com.orbi.spaceswoosh`.

## Hangar (current)

- **41 ships** in Android `SKIN_DEFS` order. `UNLOCK_ALL_SKINS = false` — premium tiles show price and tap-to-buy via RevenueCat. Free forever: Focus, Flicker, Ember, Saber
- `UNLOCK_ALL_LEVELS = false` — Journey map follows saved `unlocked` (Level 1 open; later days fade until cleared)
- Free forever (no `productId`): **Focus**, **Flicker**, **Ember**, **Saber**. Other defs store `com.orbi.spaceswoosh.skin.<id>` + `skin_<id>` for RevenueCat
- Home: **SPACE SWOOSH** + flavor + ◀ hull ▶, then Play / Space Log / Options / High Scores (Android tags ▶ □ ⚙ #)
- Play: **PLAY** header, Journey (RECOMMENDED) then Open Space (ENDLESS) as tall `unit×17` cards, vertically centered
- Journey map: **5** columns, `tileH = tileW × 1.15`; Hazard Lab tile hidden (`showHazardLab`)
- Options hub: Ship ●, Controls ↔, Sound ♪, Light/Dark Mode ◐, Restore Purchases ↻. Controls = Zigzag/Arc. Sound = Music / Sound FX / Voice (`soundMusicEnabled` / `soundSfxEnabled` / `soundVoiceEnabled`). Pause Sound stays master mute
- **SPACE BOARD**: same `high_scores` table as Android (Zigzag/Arc, DISTANCE/OBSTACLES, 10×10 pages). Submit Score + top-10 auto-prompt. Local PBs still back the PLAY card.
- **Firebase Analytics**: same project as Android (`spaceswoosh-faa9c`). Events: `game_over`, `journey_level_end`, `hazard_lab_end`, `equip_ship`, `purchase_skin`, `purchase` (revenue), `set_theme`, `set_sound`, `set_sound_channel`, `submit_highscore`, `journey_epilogue_send`, `journey_epilogue_skip`. All include `platform=ios`. Plist is gitignored; Codemagic uses `GOOGLE_SERVICE_INFO_PLIST`. No Advertising Identifier (`FirebaseAnalyticsCore`).
- Type: bundled Space Grotesk + Space Mono (`BrandType`). Framed ink tiles, 0 radius, dotted rules, **← Back**
- Equipped id persists as `shipSkinId` (same key as Android). Default if unset / unknown: **Flicker**
- Options → **Ship**: scrolling 2-column tiles (name + blurb + hull + short wake)
- Hangar stills bake Android `previewWake` (12 pts, span 3.4r, never the long in-play wake) then a banked hull. Live hulls use `LiveHullPaint` / `ClassicHullPaint` at t=1400 ms. In play, live hull warp is **not** rasterized; a 3.2r pad keeps orbiting ornaments (Bloom satellites, Luna dust) in frame. Pools: 16 fills / 24 strokes / 24 discs.
- One equipped renderer at `startRun` (do not allocate a trail node per ship). Richer baked silhouettes (wash + highlight + crease) for static ink hulls; wash/ring α is Canvas `globalAlpha × fillStyle.alpha` so `ink12`/`ink30` halos stay translucent. **18** live-draw (`skipHullCache`: Nyan, Halo, Lantern…Rook)
- Classic wakes (Wisp sparks, Shard chevrons, Halo/Ring hollow rings, Dusk violet cloud at Android 6–9 dots/point, Seal vortex commas, Hatch ticks, Fold crease, Spine ladder, Orbit helix, Flux dashes, Cinder ember/ash) are dedicated drawers — not `ParticleWakeField`
- Fletch wake tucks into the nock (`trailTailOffset` 0.32); Nyan rainbow starts under the hull (`0`)
- Live-ship wakes are dedicated drawers (teal/gold filaments + plankton, soap rings, aurora strata, peacock stamps, …). Sprout/Spore/Luna reuse the lantern filament+cloud with Android palettes. Plankton pool is `slots × (5×density + 2)`, painted newest-first (no 600 cap). Bloom soap rings use `dense(..., subdiv: 1)` like Android.
- Focus wake is **ripple** dots; Ember is **twin dotted traces**. Long wakes 200 pts / fade `1/420`; Saber/Nyan 160 / `1/360`. Live ships tuck the wake with per-skin `trailTailOffset`
- Per-skin JS hitbox packs, `wallTrailMode`, jelly profiles. Hitbox is **not** deformed by jelly. Shield smash stays the scaled center circle
- Play / Journey / Lab all read the saved id. Speed and arcs stay shared
- **Journey:** lore once → map → 42 levels / 119 stars / 7 chapters, teach L1–5
- **Hazard Lab:** 12k KM sandbox (phase / sweep / repulsor / drift / wormhole / blackhole)
- Intro: 720/280 ms roll from below, 18 baked streaks, then NAV beats (Open Space waits 200 ms)
- Clear: Android hold / ramp / min / cap / fade; lean preserved; hull leaves the top
- L42 clear: written epilogue (NAV open → prompt/skip → lights → ordinal → Follow @spaceswoosh.app → title)
- **Logbook** observe / interact / known
- Options: nested hub (ship, controls, sound channels, night paper, Restore Purchases)
- Persistence: `journeyProgress`, `logbookProgress`, `shipSkinId`, `ownedSkinIds`, `soundMusicEnabled` / `soundSfxEnabled` / `soundVoiceEnabled`, `playerName` (same keys as Android)
- Audio: looping `background.mp3` (ducks under NAV); **decoded** turn / crash / shield / shield-crash / **level-N** / **first-boop** / **swoosh-voice** on the engine pool (synth fallback for turn/crash/shield); baked boop/collect/portal/swoosh. LEVEL N and synth wall-boop share the engine so both can be heard. Spoken first-boop waits until intro voice is done. Clear-flyout smash SFX throttled to 120 ms
- HUD: Android mockup C (pause glyph + route / fuel / smash icon rows). Stagger: KM+fuel at 2s, pause at 3s, smash after first event
- Shield: two Signal stroke rings sized like Android Canvas (sprite radius includes half-stroke); **4s** (`Flicker.shieldSeconds`); pulse, then faster warning in the last 1.5s
- Sparkles: 8-vertex 4-point star (`innerRatio` 0.4) at Android radius `1.15×` unit (sprite diameter `2r`); filled `signalDisc` halo diameter `3.8r` (`signalSoft` alpha, not additive glow)
- Wormholes: Android `WormholeGate` look — spinning dashed stroke in signal/ink/ink30, path diameter `2×size×pulse`, no additive inner glow
- Flicker wake: one continuous `SKShapeNode` ribbon tucked under the hull center; smudge tapers at the join; spring path wiggle on wall BOOP
- Focus ripple dots / Ember twin-dots / Saber bloom+core+crackle reuse pooled sprites (no per-frame `SKShapeNode` allocs). Live ships: pooled hull graph + dedicated wakes. Remaining premiums: classic ribbon/mark wakes (not a particle dump)
- Drift / wind: 7 thin ink30 SKShapeNode hairlines (Android `setLineDash` +
  `lineDashOffset`), `baseUnit`-scaled period, flow matches shove direction
- Cruise: Android snappy tick × **1.0** (`GameConfig.feelSpeed`)
- Menu / pause / outcome: Space Grotesk/Mono, framed ink buttons, paper wash, two-bar **MISSION PAUSED**. Open Space game over includes High Scores
- Wall **BOOP** is one-shot (180 ms cooldown) and fades at Android’s 0.028/tick.
  The ink label sits at hull height on the **open** side (left wall → right of
  ship). Open Space does **not** show “Breaking the atmosphere!” / “Breaking
  atmosphere…” HUD lines. Space Log Obstacles/Boosts list only observed/known
  cards with playfield-scale wells (`LogbookGlyph`; wormhole is a Boost). Rebuild
  this Xcode target (`ios-native/`), not `npm run build:native`.
- Zigzag path flips instantly; hull lean eases (`bankSmoothing` 0.34). Stretch follows `|tangent|`

Voice and SFX clips live in `ios-native/SpaceSwoosh/Voice/` (`level-N.mp3`, `epilogue-open.mp3`, `epilogue-skip.mp3`, `first-boop.mp3`, `swoosh-voice.mp3`, `background.mp3`, `crash.mp3`, `crash_with_shield.mp3`, `shield.mp3`, `turn.mp3`). Gameplay file cues (including **level-N**, first-boop, and swoosh-voice) decode once into engine buffers. If a clip is missing, turn/crash/shield fall back to synth. Boop / collect / portal / swoosh stay synthesized on both platforms. Epilogue open/skip still use `AVAudioPlayer`. The packer matches those names case-insensitively so a Windows `Level-4.mp3` cannot drop out of the IPA.

The audio session is **`.playback`**, so TestFlight plays with the Silent switch on. Options → SOUND OFF still mutes. Codemagic **App Preview** may still forward no audio; that is the stream, not the IPA.

Not yet: Lives / Pro (skins IAP + Restore ship in this build).

### Gate

Side-by-side with Android hangar (flag on): each hull’s ink covers its circles;
each wake + BOOP mode reads as the same family; Bloom bubbles / Luna+Spore sparkles
match the hangar avatar near the hull; 120 Hz holds on a long-wake
live hull (Lantern or Wish); Flicker join still one piece. Play L1–5, Lab 12k,
picker equip, voice on/off.

```bash
npm run constants:export   # Journey descriptors + EncounterCatalog + Open Space weather/belt → GeneratedJourneyData.swift
node ios-native/scripts/generate-pbxproj.mjs
```

## Build

Codemagic: **iOS Native → TestFlight** (`xcode: latest`, currently Xcode 26).
Deployment **iOS 17**. Each upload must use a new `CFBundleVersion`
(Apple already has **1.0.0 (1)**). CI stamps **13+**.

To play in the browser (no Mac/device): start **iOS Native → App Preview**, then
click **Quick launch** next to `SpaceSwoosh.app` on the finished build. That
workflow builds an unsigned iPhone-simulator `.app` — a TestFlight IPA will not
show Quick launch. See [`docs/CODEMAGIC.md`](../docs/CODEMAGIC.md) §6b.
