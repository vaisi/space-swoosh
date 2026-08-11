# Space Swoosh — Technical Documentation

> How the project currently works, for developers. Keep this up to date as the
> code changes.
>
> **Native iOS (shipping target):** [`ios-native/`](ios-native/) — SpriteKit +
> SwiftUI, bundle ID `com.orbi.spaceswoosh`. Capacitor [`ios/`](ios/) is
> **retired before launch** (kept in-repo for reference / parity until Phase C
> sign-off). Android remains Capacitor. Phase A butter core is in place:
> fixed-step 1/60 sim, display-rate render, pooled ribbon trail, pacing HUD,
> `CADisableMinimumFrameDurationOnPhone`. See [`ios-native/README.md`](ios-native/README.md).
>
> **Signal Story (Journey) — THE REPLY (recovery framing):** Full prose in
> [`docs/spaceswoosh_signal_story.md`](docs/spaceswoosh_signal_story.md). Runtime
> copy in `config/JourneyNarrative.js`. First Journey visit shows `ui/screens/LoreScreen.js`
> once (`journeyProgress.loreSeen`); Continue unlocks Logbook `signalCall` and
> opens the map. Lore: recover scattered message pieces toward the callers —
> answer is composed only at the end (`ENDING_BEATS`: WE HEARD YOU → NAV apology →
> lights → "We weren't the only ones who answered."). Levels 1–5 are a staged
> teach band (empty → simple → moving → sparkles → shields). Per-level intro
> lines come from `LEVEL_MESSAGES`; all levels use `LEVEL_INTRO_BEATS` (one
> sentence at a time; L6+ carry `gapAfterMs` from ElevenLabs breaks). Navigator
> MP3s for levels **1–40** in `public/sounds/voice/level-N.mp3` via
> `SoundManager.playLevelVoice`. Journey session cues (Journey + Open Space):
> `first-boop.mp3` (first sidewall hit per app session + milestone beats from
> `FIRST_BOOP_BEATS`) and `swoosh-voice.mp3` (every style swoosh, voice only).
> App icon source: `assets/store/app-icon-512.png` (`npm run assets:sync` →
> iOS/Android/PWA). Level logbook entries unlock to KNOWN on level start (intro heard).
>
> **Hazard Lab (sandbox):** Always-unlocked Journey-map tile → `PLAY_MODE.hazardLab`
> / `HazardLabProfile`. Practice for **Phase**, **Sweep**, **Repulsor**, **Drift
> Current** (also in Journey/Open Space). Finish/crash skips `recordLevelResult`.
> Logbook observes during lab via `isHazardLab()`.
>
> **Wall Boost:** `PowerUpManager` spawns a thin Signal-Blue edge slab
> (random L/R, ~22s) only after `wallBoostsFromScore` (12000 KM). Collect →
> `activateShield()` + `activateSpeedBoost()` (1.82× gameplay speed for 5s;
> refreshes). Separate from cinematic `Spacecraft.boost` used by level-clear flyout.
>
> **Themes:** Dual theme via Options → **Light Mode / Dark Mode**
> (`brand/theme.js`, key `ssTheme`). **Default is light** (cream + Signal Blue)
> when nothing is stored. Dark: charcoal paper, bone ink, vivid mint (`#3DFF9A`).
> `applyTheme()` mutates shared tokens + CSS vars and clears hull/glow caches.
>
> **BUILD 26 (Android store):** Premium ships IAP + menu browse/buy. `UNLOCK_ALL_SKINS = false`
> for store — Focus/Flicker/Ember/Saber free; all other ships gated via RevenueCat.
> Menu stamp `BUILD 26 · NATIVE` /
> `WEB`. versionCode **26** / versionName **1.0.26**.
>
> **Phase 0/1 iOS:** Zigzag default flight style. **iOS canvas budget**
> (fill-rate coolant: hitch clamp ≤1/30 s, opaque context) plus **cheap Canvas**
> on iPhone/iPad: DPR ≤ 1.5, baked hull `drawImage`, glow sprites (halos/black-hole/
> swoosh flash restored without path radials), flat ribbon fills. Same plain
> one-update-per-paint rAF loop as Android (no paint throttle). Phase 0 URL
> harness: `?perf=1`, `?nodraw=1`, `?drawonly=1`, `?kill=trails,glows,hud,hulls,obstacles,gradients`,
> `?fullvfx=1`, `?cheap=0|1`, `?dpr=N`. See §6.
>
> **Supabase:** Open Space leaderboard uses **vaisi's Project**
> (`ptzaxgslzjefaxdkrvyr`). Table `public.high_scores` + RLS (SELECT/INSERT only
> for anon). Schema in `supabase/migrations/`. No auth / no Journey cloud sync yet.

## 1. Overview

Space Swoosh is a vertical-scrolling "dodge" game rendered on a single HTML5
`<canvas>`. The ship auto-flies upward through a *night-paper universe*; the player
steers left/right in arcs to dodge (or, with a shield, destroy) ink asteroids,
grab shield pickups, and collect fuel diamonds.

There are **two play modes**, chosen from Play:

| Mode | Shape | Leaderboard |
| --- | --- | --- |
| **Open Space** | Endless. Difficulty ramps off distance, forever. | Yes (Supabase) |
| **Journey** | 40 finite levels, each with a distance goal and three stars. | No — progress is local |

- **Stack:** vanilla JS (ES modules), [Vite](https://vite.dev) dev/build,
  Capacitor 8 for **Android** (and legacy Cap iOS reference tree), **native
  SpriteKit/SwiftUI** for shipping iOS under `ios-native/`, Supabase for the
  online leaderboard, Google Analytics (`gtag`) on web only.
- **Entry:** `index.html` → `src/main.js` → `new Game(GameConfig)` → boots to
  the **main menu** (`appScreen = 'menu'`). On native, `initNative()` then wires
  hardware back, lifecycle pause, keep-awake, status bar and splash dismissal.
- **Rendering:** everything is drawn to `#gameCanvas` each frame; there is no DOM
  UI except the pause button and the name-input field.
- **Native app id:** `com.orbi.spaceswoosh` (see `capacitor.config.json`).
- **Site / privacy:** `https://spaceswoosh.app` (GitHub Pages custom domain; see `public/CNAME`).

## 2. Run / build

```bash
npm install
npm run dev           # Vite dev server (usually http://localhost:5173)
npm run build         # production build to dist/
npm run preview       # preview the build
npm run build:native  # vite build + cap sync (copies dist into android/ + ios/)
npm run open:android  # open the Android Studio project
npm run open:ios      # open the Xcode project (macOS / Codemagic)
```

Credentials live in `.env` (`VITE_SUPABASE_*`, `VITE_REVENUECAT_*`). See `.env.example`.
For a working leaderboard locally, copy `.env.example` → `.env` and set the
vaisi's Project URL + anon key (Project Settings → API). Restart Vite after
changing env vars.

Native CI: [`codemagic.yaml`](codemagic.yaml) — see [`docs/CODEMAGIC.md`](docs/CODEMAGIC.md). Store listing copy: [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md). IAP product ids: [`docs/IAP.md`](docs/IAP.md).

### Open Space leaderboard (Supabase)

| Piece | Role |
| --- | --- |
| Project | vaisi's Project — ref `ptzaxgslzjefaxdkrvyr` |
| Table | `public.high_scores` (`player_name`, `ship_id`, `score` = KM, `obstacles_destroyed`, `flight_style` = `arc`\|`zigzag`, `created_at`) |
| Client | `src/config/supabase.js` + `src/services/ScoreService.js` |
| Access | Anonymous call signs (no Supabase Auth). `NameFilter` validates before insert. |
| RLS | Public SELECT + INSERT; no UPDATE/DELETE for `anon` / `authenticated`. INSERT requires `flight_style in ('arc','zigzag')`. |
| Migrations | `…_create_high_scores_leaderboard.sql`, `…_high_scores_add_ship_id.sql`, `…_high_scores_add_flight_style.sql` |
| Boards | Separate Arc and Zigzag leaderboards. Column default `'zigzag'` keeps all legacy rows on Zigzag. Rank / top-10 / submit filter by the run's `game.flightStyle`. |
| CI secrets | Same `VITE_SUPABASE_*` in GitHub Actions (repo secrets) + Codemagic env group. A Pages build without them ships a playable game with a dead leaderboard (`RANK #?` / submit fails). |
| Fetch | `ScoreService.getTopScores(type, limit = 100, flightStyle)` — enough for 10 pages × 10 rows per style |
| UI | **Space Board** screen: header title + quiet **← Back**; theme-style Zigzag/Arc toggle button on the right (`Zigzag`+`Z` / `Arc`+`S`); **DISTANCE / OBSTACLES** metric tabs below. Opens on the player's current flight style. |
| Submit prompt | Open Space game-over auto-prompts for a call sign only when rank ≤ 10 **on that style's board**. Manual **Submit Score** still opens the modal for any unfinished Open Space run. Crash keeps the world under the blast and crossfades Mission Failed; submit modal opens only after `gameOverAlpha >= 1`. Modal: idle layout stacks distance → asteroids → rank above the call-sign field (no auto-focus). Soft keyboard: `@capacitor/keyboard` (`resizeOnFullScreen`) + `game.softKeyboardHeight`; real IME inset pins the card to the top with call sign + Submit first and a single horizontal stats row. DOM input on `#gameContainer`, repositioned every frame. |

GitHub ↔ Supabase (if connected) applies files under `supabase/migrations/` on
branch deploys. It does not replace putting the publishable URL/key into the
game build env. Journey progress and Open Space personal best stay in
`localStorage` only.

## 3. Directory map (`src/`)

| Path | Responsibility |
| --- | --- |
| `main.js` | Bootstraps: preloads brand fonts, starts the game (menu), wires native shell. |
| `native/index.js` | Capacitor shell: hardware back, lifecycle pause, keep-awake, status bar, splash, soft wall-boop haptics, Keyboard IME height → `game.softKeyboardHeight`. |
| `game/BackNavigation.js` | Shared "go back one step" map for Android back + Escape. |
| `services/Analytics.js` | Platform analytics: gtag on web, no-op on native until Firebase is wired. |
| `services/Purchases.js` | RevenueCat wrapper (native only); no-ops without API keys. |
| `services/Entitlements.js` | Skin ownership cache + purchase / restore. Free = no `productId` (Focus/Flicker/Ember/Saber). `UNLOCK_ALL_SKINS` is **`false` for store**; set `true` only for local playtest. |
| `game/Game.js` | Core loop, `appScreen` flow, menu/options/HUD/end screens, scoring. |
| `ships/skins.js` | Ship skin registry: lookup, persistence, roster, menu previews. |
| `ships/skinDefs.js` | Ship roster (Focus…Saber…Nyan…Cinder) composed from hulls + trails + boop signatures. |
| `ships/hulls.js` | Hull paths, jelly profiles, `wallTrailDeform` modes, `beginHullFrame`, `MAX_BANK`. |
| `ships/trails.js` | Wake renderers + per-skin wall-boop extras (bubble, rainbow ribbon, saber blade, desync, etc.). |
| `config/GameConfig.js` | Tuning every run shares (spacecraft, camera, obstacle sizes, milestones, **fuel**, **points**, styleSwoosh). |
| `config/JourneyConfig.js` | The Journey curve: `STEPS`, chapters, the derived `JOURNEY_LEVELS` table, star rules, L1–5 teach gates. |
| `config/JourneyNarrative.js` | THE REPLY story (recovery framing): `PRE_LEVEL_1_LORE`, `LEVEL_MESSAGES[1..40]`, `LEVEL_INTRO_BEATS[1..40]` (+ `gapAfterMs`), `FIRST_BOOP_BEATS`, `ENDING_BEATS`. |
| `modes/RunProfile.js` | `RunProfile` contract + `OpenWorldProfile`; owns `OPEN_WORLD_UNLOCKS`. |
| `modes/JourneyProfile.js` | Maps a level descriptor to per-run tunables + story intro lines + pickup gates. |
| `modes/index.js` | `createRunProfile(game, mode, level)`. |
| `services/JourneyProgress.js` | `localStorage` progress: unlocked level, stars, best points, `loreSeen`. |
| `services/OpenWorldProgress.js` | `localStorage` personal-best Open Space distance per flight style (`bestByStyle`; v1 `bestScore` migrates to zigzag). |
| `config/LogbookEntries.js` | Static Logbook catalog: obstacles, boosts, lore + level voice lines, From the Void stub. |
| `config/HazardLabConfig.js` | Sandbox descriptor for Phase + Sweep Gate (no Journey progress). |
| `modes/HazardLabProfile.js` | Finite lab run profile (`PLAY_MODE.hazardLab`). |
| `services/LogbookProgress.js` | `localStorage` logbook: `locked` / `observed` / `known` per entry. |
| `managers/LogbookManager.js` | Journey-only façade: observe / interact / instant + toast debounce. |
| `managers/LogbookToastManager.js` | Top-center "SPACE LOG UPDATED" chip (~2s). |
| `ui/screens/LogbookScreen.js` | Space Log screen: category tabs; Journey rows text-only; other tabs keep icon cards. |
| `ui/screens/ModeSelectScreen.js` | Play → Open Space / Journey (Journey may open lore first). |
| `ui/screens/LoreScreen.js` | One-time pre-Journey Signal Story brief → Continue → map + Logbook unlock. |
| `ui/screens/JourneyMapScreen.js` | Scrollable level select: chapter bands of level tiles. |
| `ui/screens/LevelOutcomeScreen.js` | Level clear / failed: one row per objective, next-step actions. |
| `game/LevelClearSequence.js` | The level-clear flyout: angled hyperspeed boost off the top, fade world, fade screen in. |
| `game/LevelIntroSequence.js` | Run-start intro (~1s): slow bottom roll + top star shower that eases out. |
| `game/IntroNarration.js` | Post-fly-in title phase: chains intro beats + level 1–40 voice; holds belt until done. |
| `game/cinematicFlight.js` | Shared angled cruise (zigzag / arc heading + silent wall bounce) for intro & outro. |
| `core/Camera.js` | Scroll position + `getRelativeY()` world→screen mapping, shake. |
| `core/InputHandler.js` | Keyboard/touch input → ship movement (only while `isPlaying()`). |
| `entities/Spacecraft.js` | Ship movement, heading, trail data, shield + gameplay speed boost; render delegates to active skin. |
| `entities/Collectible.js` | The Signal-Blue fuel diamond (render + collision). |
| `entities/ComplexAsteroid.js` | (legacy/aux asteroid variant). |
| `managers/ObstacleManager.js` | All obstacle types, spawning, collisions, destruction particles, score popups. |
| `managers/PowerUpManager.js` | Shield plus (~5s) + wall-boost slab (from 12000 KM, ~22s, random L/R); collect → shield (+ 1.82× speed for wall). |
| `managers/CollectibleManager.js` | Fuel diamonds: spawn cadence, collect → clamped fuel refill + `sparklesCollected`, `+FUEL` popup + `playCollect()`. |
| `managers/StyleSwooshManager.js` | Near-miss twin-obstacle "swoosh": style points + Signal-Blue VFX + `playSwooshVoice()` (no caption). |
| `managers/WallBoopManager.js` | Sidewall bounce "BOOP": ink text popup, SFX, light haptic. First hit per session (after LEVEL N intro voice/title when applicable) → first-boop voice + `FIRST_BOOP_BEATS` milestone queue. |
| `managers/MilestoneManager.js` | Distance milestone / hazard / level-intro messages. |
| `managers/SoundManager.js` | Audio (BGM + SFX + voice). Rapid turn/move one-shots are pre-decoded Web Audio buffers (`playTurn` / `playMove`; `move.mp3` optional). Also Web Audio `playCollect()` / `playSwoosh()` / `playBoop()` / `playPortalEntry()` / `playPortalExit()` / `playLogbook()`. Journey navigator audio: `playLevelVoice` / `playCueVoice` / `playFirstBoopVoice` / `playSwooshVoice` (shared slot; ducks BGM; `stopLevelVoice` / `stopCueVoice`). Per-channel Options gates (`canPlayMusic` / `canPlaySfx` / `canPlayVoice`) plus pause master mute. |
| `services/ScoreService.js` | Supabase leaderboard read/write + `formatScore()`; filters by `flight_style`; `getTopScores` defaults to 100. |
| `config/supabase.js` | Supabase client config. |
| `brand/tokens.js` / `tokens.css` | Brand design tokens (color, type, motif). Single source of truth. |
| `brand/CopyBank.js` | Spock-voice flavor pools + `pickCopy()` for menu / crash / clear / Play mode-select blurbs. |
| `ui/ScreenKit.js` | Screen layout grid + rhythm, dotted rules/ruled labels, text fitting & wrapping. |
| `utils/BrandDraw.js` | Canvas brand primitives: paper, framed tiles/buttons, reticle, **sparkle**, type presets. |
| `utils/DrawUtils.js` | Lower-level draw helpers (dotted lines, shield path, colors). |
| `utils/math.js` | `clamp01` / `lerp` / `lerpInt` — the difficulty curve's arithmetic. |

## 4. App screens (`Game.appScreen`)

| Screen | Role |
| --- | --- |
| `menu` | Title, ship preview with ▶/◀ browse of full roster (`menuShipBrowseId`); locked shows price + tap-to-buy; Play / Space Log / Options / High Scores. |
| `modeSelect` | Play → Journey (recommended, first; Logbook unlocks) or Open Space. Card blurbs rotate from CopyBank `modeJourney` / `modeOpenWorld` on each `goToModeSelect()`. Journey footer: level + stars. Open Space footer: per-style PBs from `OpenWorldProgress` (one style → `Personal best: X KM`; both → `Zigzag: A · Arc: B`; empty styles omitted). Journey card → lore if `!loreSeen`, else map. |
| `lore` | One-time Signal Story brief; Continue marks `loreSeen`, unlocks Logbook `signalCall`, opens map |
| `journeyMap` | Journey level select; scrollable chapter bands of level tiles |
| `logbook` | Discovery journal (categories + entries); Back → menu |
| `options` | Options hub: Ship / Controls / Sound / Theme / Restore Purchases |
| `optionsShip` | Ship picker (2-column grid of the roster); persists `shipSkinId` |
| `optionsControls` | Stub — future touch schemes (swipe / on-screen L–R) |
| `optionsSound` | Music / Sound FX / Voice ON/OFF (`soundMusicEnabled`, `soundSfxEnabled`, `soundVoiceEnabled`) |
| `highscores` | Space Board: 10 tall rows/page (max 10 pages), header Zigzag/Arc brand-button toggle (Z/S tags), DISTANCE/OBSTACLES tabs, 🥇🥈🥉 for ranks 1–3, `PAGE n/m` arrows; quiet ← Back → `highScoresReturnScreen` (`menu` or `gameover`). No inset gray screen frame. |
| `playing` | Active run; pause button visible; gameplay input enabled |
| `gameover` | End of a run. Open Space: explosion → Mission Failed/Complete → Play Again / Submit / High Scores / Menu. Journey: a crash explodes the same way, a cleared level runs the flyout (below); either lands on the level-outcome screen (`ui/screens/LevelOutcomeScreen.js`) — no submission |

Options navigation stacks: main menu → Options hub → sub-screen. Back from a
sub-screen returns to the hub; Back from the hub returns to the main menu.

- `beginRun(mode, level)` is the single entry into a run: it builds
  `this.profile` **first** (the world is constructed from it), then
  `resetRunState()`, then `appScreen = 'playing'`.
- `restart()` re-runs the current mode — in Journey that's the *same* level.
- `leaveRun(screen)` clears end-run state; `goToMenu()` and `goToJourneyMap()`
  are thin wrappers. Journey's pause → Exit Run returns to the map, not the menu.
- Name is collected on score submit (no boot-time `prompt`).

### Pause

Pause isn't a screen in `appScreen`; it's `isPaused` layered over `playing`.
`renderPauseOverlay()` draws a night-paper wash, the run's live stats, and three
buttons into `this.pauseButtons`:

| Button | Effect |
| --- | --- |
| Resume | `togglePause()` |
| Sound | `soundManager.toggleMuted()` — **master mute** (silences Music + SFX + Voice). Persists as `soundMuted`. Independent of Options channel toggles. |
| Exit Run | `exitRun()` → `goToMenu()`; nothing is submitted, and the world is rebuilt by `resetRunState()` on the next `beginRun()` |

`handleInteraction` routes to `handlePauseClick()` **before** the "gameplay
touches belong to InputHandler" early return, so the menu owns the canvas while
it's up. `Space` and `Escape` both toggle pause, and the DOM pause button hides
while the menu is up since the menu carries its own Resume.

`SoundManager` audio gates:
- **Master mute** (`soundMuted`, pause Sound): silences everything.
- **Music** (`soundMusicEnabled`): looping BGM (`background.mp3`).
- **Sound FX** (`soundSfxEnabled`): crashes, shield, turn/move, boop/swoosh SFX, collect, portal, logbook chirp (HTMLAudio + Web Audio synths).
- **Voice** (`soundVoiceEnabled`): `level-N.mp3`, `first-boop.mp3`, `swoosh-voice.mp3`. Voice-off still fires `onEnded` so Journey intro captions continue; first-boop on-screen beats still show.

`applyMute()` sets `.muted` per HTMLAudio channel; Web Audio one-shots early-return via `canPlaySfx()`. Channel keys default ON (`'0'` = off). Turn/move fire throwaway `AudioBufferSourceNode`s from buffers decoded once in `initialize()`.

### Screen layout system

All non-gameplay screens share one grid via `screenLayout(canvas, baseUnit)` in
[`ui/ScreenKit.js`](src/ui/ScreenKit.js): content edges (`left` / `right` /
`top` / `bottom`) from a layout margin (no in-canvas gray border stroke), plus a
named vertical rhythm — `section` (between bands), `block` (inside a band),
`row` (label under a figure). Use these instead of ad-hoc `unit * n` gaps.
The charcoal stage vs bone ink surround comes from the page shell in `index.html`
only; `drawScreenFrame` was removed.

- `Game.drawScreenHeader(title, { back, trailingButton })` draws a quiet text
  **← Back** (no frame), a centred title, optional trailing brand button
  (same pattern as Options Light/Dark — label + micro-tag), and a closing
  dotted rule. Returns `{ backRect, trailingButtonRect, contentTop }`.
- `drawRuledLabel()` is the small caps section label with dotted rules; `drawDivider()`
  separates bands.
- `fitPx()` shrinks a string until it fits its box; `wrapLines()` wraps to N lines.
  Every label drawn inside a card goes through one of them so text never overflows.
- Screens compose as bands and are centred as a single block, so they stay
  balanced at any canvas height: menu = identity / ship / actions;
  game over = verdict / stats / actions; options hub = header / three buttons;
  optionsShip = header / vessel tiles / footnote;
  highscores = header / tabs / 10 rows / pager.

The ship tiles lay out as a 2-column grid (`Math.ceil(n / 2)` rows). The footnote
is pinned to the bottom rule and the grid is centred in the space between it and
the description, so a short roster doesn't leave a void under the cards.

## 4a. Play modes and the run profile

Difficulty used to be read straight off `game.score` and module-level config in
four different places, so there was nowhere to say "this run is shorter/easier".
Every one of those dials now lives on a **run profile** — one object per run,
built by `createRunProfile()` and hung off `game.profile`:

| Profile reads | Used by |
| --- | --- |
| `goalScore`, `isRunComplete()`, `progress()`, `isEndless` | `Game.update()` win check, HUD goal bar |
| `density()`, `baseClusterCount()`, `maxOnScreen`, `gapRange()`, `simpleChance`, `focusType`, `unlocksBy()`, `advancedBlackHoles`, `obstaclesFromScore` (default 0) | `ObstacleManager` |
| `shieldsFromScore` / `wallBoostsFromScore` / `collectiblesFromScore` | `PowerUpManager` / `CollectibleManager` |
| `speedMultiplier` | `Spacecraft.baseSpeed` |
| `runsTutorial` | `ObstacleManager` tutorial phase |
| `submitsScore`, `introMessage`, `introBeats`, `title` | `Game` end-of-run flow, milestone / intro narration |

`OpenWorldProfile` reproduces the pre-existing numbers exactly, including the
obstacle unlock table (`OPEN_WORLD_UNLOCKS`) that `ObstacleManager` used to keep
privately — and which had already drifted from the dead copy in `GameConfig`.

Two things worth knowing about the existing engine that this surfaced:

- **Catch-up camera.** Ship and camera are separate: camera matches ship travel
  (with `camera.speed` as a floor), then corrects when the ship is above its
  ideal seat (`height * 0.75`) so it accelerates back until the ship sits lower
  on screen. Ship updates before camera each frame.
  KM must never be computed as `|velocity| * wallClockDt * 100` — that desyncs
  HUD distance from world travel; use `abs(Δcamera.y) * (100/60)`.
- **`maxOnScreen` is counted against obstacles *ahead* of the camera**
  (`ObstacleManager.countAhead()`), because the full list also holds everything
  already passed. Open Space's profile returns `Infinity`: the old `length < 7`
  test guarded a branch that can only fire once per run, so it never actually
  withheld a row, and keeping it uncapped is what "plays identically" means.
- **The despawn margin derives from the gap range** (`despawnAhead`). It used to
  be a hardcoded `1.5 × canvas height`, which silently assumed the old
  0.25–0.4 spacing; Journey's wider early gaps put new rows *past* that line, so
  they were culled on the frame they spawned.

### The Journey curve

`config/JourneyConfig.js` holds a `STEPS` table. Each step is a difficulty
scalar `d` held flat for a run of levels, and the runs get **longer** as `d`
rises — the "harder, then a plateau, then harder, then a longer plateau" shape:

```
d       0.16 0.22 0.28 0.30 0.32 0.42 0.50 0.58 0.62 0.68 0.72 0.78 0.84 0.90 0.95 1.00
levels    1    1    1    1    1    3    3    3    2    3    2    3    2    4    3    7  = 40
unlock  —  simple moving  —    —  barrier complex shoot drift pulse phase worm  push  BH  sweep  —
```

First-intro levels: driftCurrent **15**, pulsating **17**, phase **20**, wormhole **22**,
repulsor **25**, blackhole **27**, sweepGate **31**.

**Levels 1–5 (First Light teach band)** match the Signal Story voice lines:

| Level | Roster | Collectibles | Shields |
| --- | --- | --- | --- |
| 1 | none (empty corridor) | off | off |
| 2 | `simple` | off | off |
| 3 | `simple` + `moving` | off | off |
| 4 | same | on from 0 KM | off |
| 5 | same | on | on from 0 KM |

`JourneyProfile` gates with `Number.POSITIVE_INFINITY` until
`POINTS_FROM_LEVEL` (4) / `SHIELDS_FROM_LEVEL` (5); L1 also seals
`obstaclesFromScore`. `runsTutorial` is false — no competing HUD tips; the
navigator line is the teach beat. Full intro copy comes from
`JourneyNarrative.LEVEL_MESSAGES` (also Logbook level entries). Levels 1–5
on-screen beats come from `LEVEL_INTRO_BEATS` (sentence-at-a-time for all
levels; L6+ include ElevenLabs `gapAfterMs`). Copy matches THE REPLY narrator
script (SSML/stage directions stripped). Voice clips:
`public/sounds/voice/level-1.mp3` … `level-40.mp3`. Session cues:
`first-boop.mp3`, `swoosh-voice.mp3` (sources under `assets/voice/`).

Everything else is derived from `d` by `lerp`, in `JourneyProfile`: `density`
1.15→2.05, `maxOnScreen` 5→10, row gap 0.30→0.16 of screen height
(`gapSpread` 1.35), `speedMultiplier` 0.95→1.38, cluster size 1→4 (capped by
`maxClusterCount` 3→5), `maxRowSpawns` 2→3, `simpleChance` 0.70→0.42.
Teach band goals are fixed: **L1 1250 / L2 2000 / L3 3000 / L4 4000 /
L5 7500**. From L6 onward each level adds **+500 KM**; levels **10 / 15 / 20 /
25 / 30 / 35 / 40** also add **+1000 KM**. From L2 onward the belt opens at
**0 HUD KM** when the centre title clears. Spawn cursor arms at `camera.y`.
Each step may introduce one obstacle type (rosters cumulative); each level
picks a `focusType`.

Story chapters (by level count, independent of difficulty STEPS): First Light
1–5, The Long Way 6–12, Fragments 13–19, Deep Static 20–26, The Senders 27–32,
The Source 33–36, Arrival 37–40.

### Stars and progress

Star **slots** scale with the teach band: **L1–3 → 1**, **L4 → 2**, **L5+ → 3**
(distance / sparkles / smash). Outcome and map show `earned / slots` (e.g. `1/1`,
`2/2`, `3/3`). Storage still holds three booleans per level; unused slots stay
false. Sparkles star opens at L4 (floor **3** sparkles, then ~1 per 1,000 km).
Smash star opens at L5 (1 smash, then from 2 toward a hard cap of **6**). Mode
select / map tallies use `TOTAL_STARS` (sum of `starSlots`).

`services/JourneyProgress.js` persists
`{ version, unlocked, loreSeen, levels: { n: { stars, bestPoints } } }` under
`journeyProgress`. Stars are **cumulative** across attempts; only clearing the
frontier level advances `unlocked`. Journey never writes to Supabase.

### Open Space unlock ladder (`OPEN_WORLD_UNLOCKS`)

| KM | Type |
| --- | --- |
| 0 | `simple` |
| 1000 | `sideBarrier`, `complex` |
| 2000 | `moving` |
| 3000 | `shooting` |
| 3500 | `driftCurrent` |
| 4000 | `pulsating` |
| 4500 | `phase` |
| 5000 | `wormhole` |
| 5500 | `repulsor` |
| 6000 | `blackhole` |
| 7000 | `sweepGate` |

### Hazard Lab

Optional practice sandbox (also ships in Journey/Open Space). Journey map →
always-unlocked **HAZARD LAB** tile → `Game.beginHazardLab()`.

| Piece | Role |
| --- | --- |
| `config/HazardLabConfig.js` | `HAZARD_LAB` descriptor: phase / sweepGate / repulsor / driftCurrent, goal 6000 KM, `starSlots: 0`. |
| `modes/HazardLabProfile.js` | Mid difficulty, `simpleChance` 0.1, even focus mix, wall boosts off. |
| `Game.isLevelRun()` | Journey **or** Hazard Lab (finish gate, flyout, outcome UI). |
| `finishJourneyLevel` | Lab branch builds outcome only — no `recordLevelResult`. |

**Square Bloom (`phase`):** one square → four rotating outer squares (spring +
lock) + soft push while open; fly the centre gap; squares lethal, field only shoves.

**Sweep Gate:** thin ink blade that enters off-screen, crosses L→R or R→L with a
slow tumble, then exits the far edge; OBB hit (no hub / trail).

**Repulsor Node:** solid core + soft outward push (`ship.x` shove, strength ~1.55); core lethal;
push interacts logbook like BH pull.

**Drift Current:** full-width flowing shear lines; lateral wind only
(`checkCollision` false). Dash flow direction matches shove (left or right).

Style Swoosh skips Sweep / Repulsor / Drift Current.

### Journey Logbook

A science-journal discovery system. **Gameplay writes during Journey and Hazard
Lab runs** (`game.isJourney()` / `game.isHazardLab()`). The pre-Journey lore
screen unlocks `signalCall` via `LogbookProgress.revealInstant` even before a
run starts. Open Space never updates the logbook. Menu item is always available.

| Piece | Role |
| --- | --- |
| `config/LogbookEntries.js` | Catalog + copy. Categories: Obstacles, Boosts, Journey (`signalCall` + Day N voice lines; id still `levels`), From the Void (stub). |
| `services/LogbookProgress.js` | Key `logbookProgress`: `{ version, entries: { [id]: 'observed' \| 'known' } }`. |
| `managers/LogbookManager.js` | `observe` / `interact` / `revealInstant`; same-frame toast debounce via `flushToast()`. |
| `managers/LogbookToastManager.js` | Top-center chip, independent of MilestoneManager. |
| `SoundManager.playLogbook()` | Soft Enterprise-style bridge chirp (two quiet filtered sines) on update. |

**State machine:** `locked` → `observed` (picture + name; Spock pending line) → `known` (field-manual definition + remark). Instant entries (`signalCall`, `spaceBoop`, `styleSwoosh`, `deflectorSmash`, `spaceTravelBoost`) jump straight to `known`.

**Hooks (Journey only):** on-screen obstacles/power-ups (plus + wall boost)/sparkles/finish gate → observe; smash/fatal hit/black-hole pull/wormhole teleport/collect/clear → interact; wall BOOP / style swoosh / first deflector smash / clear-boost phase → instant. Lore Continue → instant `signalCall`.

**Future:** From the Void will hold beta-tester messages picked up around 11 km in endless Journey — category shell only for now. Levels 6–40 spawn beats still follow the difficulty stair; story lines are already wired for intros.

### The run-start intro

Every run (Journey and Open Space) opens with `game/LevelIntroSequence.js`, built
from `Game.beginRun()` after `resetRunState()`. ~1s, not skippable, steering
locked. Calm centre-lane roll — the angled hyperspeed language stays on the
**exit** flyout only:

| Phase | What happens | Ends when |
| --- | --- | --- |
| `arrive` (720ms) | Ship starts below the frame at centre; gentle boost 1.35→1.08; camera seats Y into cruise; `worldAlpha` 0→1; top-band star shower (~38% of frame, 18 lines); spawning paused; score frozen | 720ms |
| `settle` (280ms) | Boost → 1; `hudAlpha` 0→1; shower keeps easing out | 280ms |

Shower fade is time-based over the whole intro (short hold, then ease-out): drives
`motionLineAlpha`, pool size, and scroll speed. Lines wrap inside the top band via
`ObstacleManager.motionLineBand`. On `finish()` camera velocity is reseeded,
streaks clear, and deferred `pendingIntroBeats` start `IntroNarration` (or
`wait` if there is no line). Spawning stays paused through the title phase.
After the ship intro, `hudRevealPhase` runs a calm onboarding beat (controls
live; pause button and spawning stay off until chips):

| Phase | What happens |
| --- | --- |
| `title` | `IntroNarration`: one centre sentence at a time (fade ~350ms, hold by length, fade ~350ms, gap from beat `gapAfterMs` / default 400ms). Levels 1–40 also play `playLevelVoice(level)` and duck BGM. Phase ends only when **all beats** and the **voice clip** are done. No HUD, no pause. |
| `wait` | Short calm beat when there is no intro line (e.g. Open Space). |
| `chips` | Timed 1s fades: distance HUD → **pause last**. Icon-meter stack: route + ink goal bar (Journey) or route + KM (Open Space); sparkle + Signal fuel bar once collectibles are live; target + smash dots (Journey `smashTarget`) or small ink count (Open Space) after first smash. |

Open Space with no intro line skips straight to `wait`. Spawning resumes when
`chips` starts. `Game.hudRevealAlpha(slot)` drives HUD + pause opacity. Input
locked during the ship intro itself except Escape→pause. Voice stops on
`leaveRun` / crash / level clear.

### The level-clear flyout

Crossing the goal used to freeze the ship and hold the world for 550ms, which read
as a stall. `game/LevelClearSequence.js` replaces that beat with four phases,
driven from the `gameover` branches of `Game.update()` / `Game.render()` while
`game.levelClear` exists. The ship keeps its lean (zigzag sign, or a captured arc
heading) and hyperspeeds off at that angle — no centre ease:

| Phase | What happens | Ends when |
| --- | --- | --- |
| `hold` | Shield on, world keeps drifting at run pace along current lean — a beat to register the clear | 315ms |
| `boost` | `moveState` cleared, `Spacecraft.boost` ramped to 7.2 along the lean (silent wall bounces OK), speed streaks on. Motion via `cinematicFlight` + real `deltaTime` | Off-screen *and* at least 1260ms, or a 2240ms safety cap |
| `fadeOut` | `worldAlpha` 1→0 over 385ms; `hudAlpha` goes 1.6× faster | The fade completes |
| `screenIn` | Drives `game.gameOverAlpha` 0→1 over 420ms | Alpha reaches 1 |

Journey also draws a world-space finish gate (`Game.renderFinishLine`): a
Signal-Blue jet stream between minimal left/right wall emitters that fades in within ~2 screens of the ship and
locks to `finishLineWorldY` when the goal is crossed so the flyout can pass
through a fixed mark.

Two things make it work:

- **The camera has to be decoupled.** `Camera.update()` tracks the ship, so
  however fast the ship goes the camera follows and it never leaves its screen
  position. During `boost` / `fadeOut` the sequence stops calling `camera.update()`
  and advances `camera.y` by hand at the velocity captured on completion, eased to
  1.25×. The world keeps streaming; the ship (boost × lean) pulls away and exits.
- **Scoring stays live through the flyout.** Shield smashes during `hold` /
  `boost` / `fadeOut` still award `points`, `score += 10`, `obstaclesDestroyed`,
  and the `+points` popup. `playShieldCrash()` is throttled to one per 120ms.
  Sparkles tick via `collectibleManager.update()` in the same `streamWorld()`
  path and refill fuel / increment `sparklesCollected` (sparkles star) with the
  usual chime / `+FUEL` popup; `pauseSpawning` stops new obstacle rows and new
  sparkle spawns mid-flyout.
  When the sequence enters `screenIn` (world no longer streams), it sets
  `finalScore` and calls `finishJourneyLevel(true)` so stars, persistence, and
  `levelOutcome` use the post-flyout totals.

The sequence owns `gameOverAlpha`, so the existing fade-in render path and the
`gameOverAlpha < 0.6` click guard need no changes. Tap / key / hardware back are
swallowed while `levelClear.active` — the flyout is not skippable. The crash path
is untouched: explosion, 2s deceleration, same screen.

`renderWorld({ hudAlpha })` and the world fade compose through `ctx.globalAlpha`,
which is why the wake, hull, milestone log and swoosh popups now *multiply* into
the caller's alpha instead of assigning their own.

### The outcome screen

One row per objective — small sparkle, single-line label, right-aligned mono value
(`4,600 / 4,600`, `40 / 70`, `3 / 5` smash) — which merges the old star band
and the stats band that repeated it. Earned is a solid Signal-Blue sparkle and full
ink; unearned is a hollow `ink30` outline (`drawSparkle`'s `stroke` option, the same
treatment the map tiles use), and a newly-won star carries a mono `NEW`. The tally
rides in a `drawRuledLabel` header rather than a band of its own.

Actions pair up: the lead action is full width, the rest go two-up, a trailing odd
one goes full width again — three rows instead of four. Paired buttons drop the mono
tag and pass an explicit `labelPx` (new on `Game.drawBrandButton()`) so
`LEVEL SELECT` fits half a row.

Every vertical size comes from `metrics(unit)`, measured once and re-measured at
`unit × (available / totalH)` if it doesn't fit. `baseUnit` is width-derived on
desktop, so a wide-but-short window used to overflow; this is the one screen that
carries enough bands to notice.

## 5. Ship heading

### Arc path (flight style `arc`)

While `moveState` is active, lateral X is a closed half-turn, linear in time:

- `angle = ±π · progress` (full half-turn so `sin(end) = 0` and X returns to
  `startX`; no angle ease-in — that compressed the S sideways)
- `x = startX + sin(angle) · arcRadius`
- On `progress ≥ 1`, `x` snaps to `startX` before clearing `moveState`

Tunables: `spacecraft.arcDuration` **820 ms**, `arcRadius` **0.2 × width**,
mid-arc `verticalBoost = sin(π·p) · 0.55 · baseSpeed` (Y climb is independent of
the sine; longer duration + boost make a taller swoosh). Any key/tap mid-arc
starts a **fresh full-duration** arc from the current X (same shape left or
right). Vertical speed eases toward the arc target so camera catch-up does not
jerk on redirect. Wall bounce redirect still uses `arcDuration × 0.7`.

Peak lateral speed is on the order of `π · arcRadius / arcDuration` — several
times the vertical speed — so mid-turn the ship really is travelling almost
sideways through the world. A circle hides that; any shaped hull doesn't.
`Spacecraft.updateHeading(prevX, prevY)` therefore derives, from the frame's
actual displacement:

| Field | Meaning |
| --- | --- |
| `tangent` | Raw direction of travel, `atan2(vx, -vy)` (0 = nose up, + = leaning right). Held at its last value below `MIN_HEADING_SPEED` so noise can't spin it. |
| `bank` | `tangent` clamped to `MAX_BANK` (0.96 rad / 55 deg, in `ships/hulls.js`) and eased toward the target by `BANK_SMOOTHING` each frame. This is the hull's drawn rotation. |
| `speed` | Distance moved last frame; wakes use it to stretch their marks. |

Skins rotate with `withHeading(ctx, x, y, ship.bank, draw)`, whose local `-Y` axis
is the nose.

Trail points are recorded at the hull's **tail** (`tailPoint()`, `bank` offset by
`0.6 * radius`) rather than its centre, so the wake stays pinned to the back of
the ship. Each point carries `{ x, y, opacity, angle, seed }` — `angle` is the
true tangent at that moment (so marks orient along the flight path) and `seed` is
a stable per-point random used by drifting-ember wakes, which would otherwise
re-randomise every frame as the buffer shifts.

## 5a. Hitboxes

Once hulls became shaped, one circle of `radius` no longer described the ship —
every rim sample of that circle sits outside the drawn tear. So each skin
declares a `hitbox`: circles in local hull space (x right, y toward the tail,
nose negative) in units of `ship.radius`, each **inscribed** in the silhouette at
the hull's smallest breathing scale, so no circle ever pokes outside the ink.

| Skin | Circles | Hull covered |
| --- | --- | --- |
| `focus` | 1 (`r: 1`) | identical to the old behaviour |
| tear (`flicker`, `wisp`) | 5 | ~93% |
| dart (`ember`) | 7 | ~80% (thin swept wings, empty tail notch) |

The leftovers are the thin extremities, where a graze reading as a miss is the
forgiving answer. `Spacecraft.updateHitCircles()` rotates the profile by `bank`
into world-space `hitCircles` at the end of each `update()`, and:

```js
collidesWith(target) {
    return this.hitCircles.some((circle) => target.checkCollision(circle));
}
```

works because every obstacle's `checkCollision` reads only `x` / `y` / `radius`,
so each circle can be handed in as a probe — none of the ~10 per-shape
implementations in `ObstacleManager.js` needed to change. While `shieldActive`,
`hitCircles` collapses to a single `radius * 1.5` circle: the bubble that's
actually drawn.

Scope: obstacles only. `CollectibleManager` and the floating shield plus still
test the generous `radius` circle so pickups stay easy to grab. Wall-boost slabs
use an AABB (thin edge bar) against `spacecraft.radius`. Wall bounce plus
`StyleSwooshManager` clearance also still use `radius`. Add `?hitbox` to the URL
to stroke the live circles in Signal Blue over the ship.

**Power-ups (`PowerUpManager`):** typed by `kind`. After `profile.shieldsFromScore`,
spawns the floating plus every 5s → `activateShield()` only. After
`profile.wallBoostsFromScore` (default **12000** KM), spawns `WallBoostPowerUp`
every ~22s on a random left or right edge → `activateShield()` +
`activateSpeedBoost()`. On contact the slab runs a ~220ms ease-in retract into
the edge (button press) and fires `WallBoopManager.triggerBoop`; buffs grant
immediately, the entity removes when the press finishes. Speed boost is a 5s /
**1.82×** multiplier on forward speed via `Spacecraft.forwardSpeedScale()`
(`boost * speedBoostMultiplier()`), independent of cinematic `boost`.
Re-collecting refreshes both timers.

Obstacle probes are meant to hug the drawn ink:

| Type | Hit shape |
| --- | --- |
| Simple circle / pulsating | Exact drawn radius |
| Simple square | Circle-vs-AABB (not an expanded box) |
| Simple triangle / moving pentagon | Edges + interior |
| Complex (orbiting moons) | Main circle + sats in **body-rotated** world space (same as render). Shield smash destroys only the part hit: a moon clip leaves the core; a core hit clears the whole cluster. Render cull uses full cluster radius so moons are never collidable while undrawn. |
| Shooting star | 8-point star polygon + projectile circles (projectiles still drawn when the star body is culled). Shield smash clips only the shots you hit; body hit clears the star. |
| Black hole | Core radius only (glow/pulse are VFX) |
| Wormhole | Never kills; `safeZoneRadius = 1.2×size + baseUnit`; teleport at `size`; ship sets `wormholeTransit` (frozen + invuln) for the 300 ms hop; `playPortalEntry()` on suck-in, `playPortalExit()` + delayed `playShield()` on emerge |

`ObstacleManager.update()` advances every obstacle (orbits, movers, shots)
**before** running shield/fatal collision, so hit tests match the ink painted
later in the frame.

Note: `Game.checkCollisions()` is dead code — it calls a nonexistent
`obstacleManager.checkCollisions()` and nothing invokes it.

## 5c. Ship skins

Skins are **visual only** for physics/speed — arcs, shield duration and scoring
are identical. Per-skin `hitbox` profiles follow the drawn silhouette.

| Id | Hull | Wake | Boop signature |
| --- | --- | --- | --- |
| `focus` (default) | Solid ink circle | Hard ink dots | Dense pile — dots pack harder near hull |
| `flicker` | Banking ink tear + soft halo | Tapered comet ribbon | Spring whip down the ribbon |
| `ember` | Swept dart with a notched tail | Elongated tangent streaks | Sparks scatter sideways, then realign |
| `wisp` | Same tear as Flicker | Thin ribbon + drifting sparks | Sparks flare outward |
| `pulse` | Focus circle | Signal-Blue dots | Same dense pile as Focus (blue) |
| `quill` | Flicker tear | Thin Signal-Blue ribbon | Spring whip (blue) |
| `shard` | Faceted diamond (`shardPath`) | Chevron / paper-cut V marks | Crystal fan shatter → restack; crack jelly |
| `halo` | Core disc + orbit ring with ticks | Expanding hollow rings | Soap-bubble inflate/stack/pop; orbital wobble |
| `needle` | Thin lance (`needlePath`) | Single hairline stroke | Whip flex + tip ripples |
| `echo` | Open crescent (`crescentPath`) | Twin parallel hairlines | Twin desync (one sticks, one late), then snap |
| `seal` | Square (`squarePath`) | Dense filled square stamps | Rubber blot at contact, then peel |
| `hatch` | Square | Lateral hatch marks | Marks stretch toward the wall |
| `trace` | Square | Hairline stroke | Spring along the line |
| `ring` | Square | Expanding rings | Ring squash only (no Halo bubble pop) |
| `fold` | Solid origami kite (`foldPath` + crease) | Long dashed crease (hull-locked zig) | Crease amplifies; fold jelly |
| `mote` | Soft ink disc | Organic radial micro-dot cloud | Cloud drifts then re-condenses |
| `spine` | Vertical bar (`spinePath`) | Ladder rungs + thin spine | Rungs compress toward the wall |
| `orbit` | Planetoid oval + tilted ring + satellite | Continuous lagging orbital ribbon + dense ellipse ticks | Soft lag shove; oval wobble |
| `ink` | Flicker tear | Fine dark ribbon | Tip/mid reverse on boop; hull end stays attached |
| `flux` | Hex crystal (`hexPath`) | Alternating ink / Signal-Blue dashes | Dashes stretch then snap (`flick`) |
| `cinder` | Soft petal (`petalPath`) | Calm ember ribbon + cool ash dots + ink hairline | Soft burst on boop (`cinder`); Signal glints |

Square hulls have no soft halo — hard ink rect only. Hitbox is a 3×3 of circles
filling the rest-pose box (`SQUARE_HITBOX`). `ship.wallJelly` drives a ~420 ms
response on **every** hull via `beginHullFrame` in `hulls.js` (plant + shake +
local scale / shear); the hitbox does not deform.

**Jelly profiles** (optional 7th arg to `beginHullFrame` / `wallJellyDeform`):
`default`, `needle`, `halo`, `shard`, `stamp`, `fold`, `spine`, `mote`, `orbit`,
`flux`, `cinder`.

Every skin declares `wallTrailMode`. On a sidewall bounce, `wallTrailDeform` in
`hulls.js` shoves the wake at render time. Discrete marks also squash via
`sx`/`sy`. Trail renderers may add opts extras (`tipRipple`, `bubbleBoop`,
`desyncBoop`, `shatterBoop`, `sparkBoop`, `blotBoop`, `denseBoop`, `flareBoop`,
`wallStretch`, `reverseBoop`). `Spacecraft.render` stamps
`ship._wallTrailMode` from the active skin so `trails.js` never imports the roster.

| Mode | Ships |
| --- | --- |
| `pile` | Halo, Hatch / Ring |
| `dense` | Focus, Pulse |
| `blot` | Seal |
| `scatter` | Ember |
| `shatter` | Shard |
| `desync` | Echo |
| `flare` | Wisp |
| `spring` | Flicker, Quill, Nyan, Trace |
| `whip` | Needle, Saber |
| `crease` | Fold |
| `cloud` | Mote |
| `ladder` | Spine |
| `lag` | Orbit |
| `script` | Ink — calligraphic reverse/whip on mid+tip (hull locked); `reverseBoop` adds pressure pulse + tip flecks |
| `flick` | Flux |
| `cinder` | Cinder |

Trail color accents: Signal Blue (`color.signalRgb`) on Pulse / Quill / Flux
dashes / Cinder glints; warm Ember (`color.emberRgb`) on Cinder wakes only;
bright purple Saber (`color.saberRgb` / `saberCoreRgb`) on the free **Saber**
wake (`drawSaberTrail` — slim bloom + hot core + crackle sparks, denser on
whip jelly); **Nyan** uses `drawRainbowRibbonTrail` (six stacked pop-stripe
bands, not HUD/UI) and `drawNyanHull` — Echo’s `crescentPath` sparrow wings in
dark gray with two clipped pink spots (`CRESCENT_HITBOX`). Optional skin fields
`trailMaxPoints` / `trailFade` stretch wakes (Nyan / Saber: 160 pts, fade
`1/360`); iOS draw LOD still multiplies max points by 0.6.

Shaped hulls mostly share `makeHullRenderer(pathFn, profile)` in `skinDefs.js`;
Fold, Needle, Halo, Square, Mote, Spine, and Orbit have dedicated drawers.
**Orbit** hitbox is the solid oval body only (ring/satellite decorative).
**Spine** is stacked circles down the bar only.

- Registry: `ships/skins.js` (`getSkin`, `drawSkinPreview`, `loadShipSkinId` / `saveShipSkinId`).
- Roster: `ships/skinDefs.js`; geometry in `ships/hulls.js`; wakes in `ships/trails.js`.
- `Spacecraft.render()` calls `skin.drawTrail` then hull (`HullCache` blit when
  `game.useHullCache`, else `skin.drawHull`); shield rings stay Signal Blue.
- Active id: `game.shipSkinId` (storage key `shipSkinId`).
- Main menu quick-cycle: `Game.cycleMenuShip(delta)` walks owned entries in
  `SHIP_SKIN_LIST` (wraps), then `saveShipSkinId`. Wired from chevron hit-boxes
  (`menuButtons.prevShip` / `nextShip`) and `setupMenuShipKeys()` (no key-repeat
  spam). Main menu browses the full roster (`menuShipBrowseId`); locked skins
  show price and tap-to-buy; Play always uses the last owned `shipSkinId`.

### Wake rendering

`trails.js` works in screen space via the `toScreenY` mapper. `wakePoints()`
and `denseTrailMarks()` apply `wallTrailDeform` (along = 0 oldest → 1 at hull).
`wakePoints()` appends the live `tailPoint()` to the recorded trail (guarded by an "is it
actually ahead?" dot product) so the wake never lags a sample behind the hull.
`drawRibbonTrail` offsets that centreline along its normals by a width that
tapers to nothing at the old end, walks up one edge and back down the other with
`quadraticCurveTo` through midpoints — which is why a wake sampled every
`trailSpacing` (10) world units still reads as one smooth curve — and fills it
with a linear gradient along the wake's chord for the length-wise fade.

## 6. Game loop & coordinates

- `gameLoop()` runs on `requestAnimationFrame`, skips work when the tab is hidden,
  and freezes gameplay updates while paused **during** `playing`.
- **Snappy pacing** uses wall-clock `tickScale = dt * 120` and
  `dt_motion = tickScale / 60` on each worked frame. Non-iOS clamps `dt` ≤ 50 ms;
  iOS clamps ≤ 1/30 s so hitch teleports stay smaller (`tickScale` ≤ ~4).
  Ship/camera advance classic paint-tick units × `tickScale` so travel-per-second
  matches BUILD 16 web @ ~120 Hz.
- **iOS canvas budget** (`core/platform.js` → `game.iosCanvasBudget`): true for
  iPhone/iPad (Safari **and** Chrome/WebKit, plus Capicitor WKWebView), including
  iPadOS that reports as MacIntel. Budget is fill-rate only (DPR ≤ 1.5, cheap
  Canvas, draw LOD, opaque context). `scheduleNextFrame()` is plain
  `requestAnimationFrame` on **all** platforms — one update per paint, same as
  Android. A former ~60 Hz `setTimeout`+rAF paint throttle was removed; it could
  drop jittered legitimate frames and worsen perceived fps without helping heat.
- **`iosDrawLod` vs `cheapCanvas`:** draw LOD (short trails, smudge off, Open
  World `maxOnScreen` 18) is `iosCanvasBudget && !fullvfx`. Cheap Canvas defaults
  **on** for iOS (`?cheap=0` to force off): hull bitmaps (`ships/HullCache.js`),
  glow sprites (`utils/GlowSprites.js`) so soft VFX return without path radials,
  ribbon fills skip `createLinearGradient`. Hitch clamps stay on `iosCanvasBudget`.
- **Phase 0 harness** (`core/perfFlags.js`, `core/PerfMonitor.js`): `?perf=1`
  overlays p50/p95/p99 + histogram (not average fps). `?nodraw=1` = full sim, paper
  clear only. `?drawonly=1` = freeze updates, keep drawing. `?kill=…` bisects
  renderer families. `?fullvfx=1` turns off draw LOD for A/B.
- Opaque 2D context (`{ alpha: false }`) on native **and** iOS web (paper is
  always painted first). Active-play UI hits skip `getBoundingClientRect` (InputHandler
  owns steering). Trail/wake paths mutate or reuse scratch arrays.
- KM is `abs(Δcamera.y) * (100/60)` so the HUD cannot desync from the world.
- The world scrolls: entities store an absolute `y`; `camera.getRelativeY(y)`
  converts to on-screen Y for rendering and off-screen culling.
- `baseUnit` (derived from canvas size in `setupCanvas()`) is the scale unit for
  all sizes/type, so the game is responsive across desktop/mobile.
- Canvas DPR: **iOS ≤ 1.5×** (Phase 1); other Capicitor ≤ 2×; Android/desktop web ≤ 3×
  (`?dpr=N` override).
  **Page shell (night paper):** `html`/`body` are brand **ink** (bone `#E1D9C1`);
  only `#gameContainer` / canvas are **paper** charcoal (`#1C1A16`), so the
  playfield edges read on desktop (centered, max-width 500px, 2:3). Mobile fills
  the safe area with the charcoal stage; bone ink shows in notch / home-indicator
  insets. `theme-color` matches the bone surround. Native status bar uses
  `Style.Dark` + charcoal background. Menu stamp: `BUILD 26 · NATIVE` / `WEB`.
- **Flight style** (`config/flightStyle.js`, `game.flightStyle`): `arc` | `zigzag`.
  Default is **zigzag** when unset; saved preferences are respected. Zigzag
  integrates a constant heading at `spacecraft.zigzagAngleDeg` from up at
  `zigzagSpeedScale` × cruise; **touch flips on `touchstart`** (move/end ignored
  for that gesture), plus **Space** / arrows; Escape pauses. Arc uses swipe +
  half-screen tap + arrows (Space pauses); banks are **closed** linear full-π
  swooshes (`arcDuration` 820 ms — see §5). The intro tutorial hint
  matches the active style (`{space}` renders as a bold SPACE keycap).
  Persisted in localStorage. Open Space online scores and local personal bests
  key off this value (`flight_style` / `bestByStyle`).

## 7. Scoring model

There are **several independent metrics** on the `Game` instance:

| Field | Meaning | Source | Where shown |
| --- | --- | --- | --- |
| `score` | Distance in "KM" | `+= abs(Δcamera.y) * (100/60)` after each camera step (locked to world travel); also `+10` per shield-destroyed asteroid | HUD, end screen, leaderboard (`distance` tab) |
| `fuel` | Survival tank (0–1) | Drains by KM once collectibles are enabled; diamonds refill (clamped, no overfill) | HUD sparkle icon + Signal-Blue meter bar |
| `sparklesCollected` | Diamonds grabbed | `++` on each sparkle collect | Pause / end stats; Journey's second star vs `sparklesTarget` |
| `obstaclesDestroyed` | Count of asteroids destroyed | `++` on each shield destruction | HUD target dots (Journey) or count (Open Space); end screen; leaderboard; third star vs `smashTarget` |
| `points` | Style points | `+perAsteroid` destroy, `+perSwoosh` near-miss (sparkles do **not** add points) | Analytics / persistence `bestPoints`; not the survival HUD |

Open Space also keeps device-local **personal bests per flight style**
(`services/OpenWorldProgress.js`, key `openWorldProgress`, v2 `bestByStyle`)
updated in `gameOver()` whenever a non-Journey run ends. Exit Run does not write
it. The Play → Open Space card footer shows nothing until a style has a best;
one style → `Personal best: X KM`; both → `Zigzag: A KM · Arc: B KM` (zeros omitted).

`points` / `sparklesCollected` are **local only** — not on the Supabase
leaderboard; both are included in the `game_over` GA event (`fail_reason`:
`crash` | `fuel`).

### Fuel system (data flow)

1. **Gate:** Fuel UI + drain only when `Game.isFuelLive()` — i.e.
   `collectibleManager.enabled` or `score >= profile.collectiblesFromScore`
   (Open Space 100 KM; Journey L4+ at 0 KM). L1–3 stay fuel-free.
2. **Drain:** Each KM delta subtracts `config.fuel.drainPerKm` (~0.00025 → full
   tank lasts ~4000 KM / ~35–40s at ~100 KM/s). Skipped during level-clear /
   obstacle cutscenes, wormhole transit, and ~1.4s after a portal hop (camera
   re-seat must not bill teleport distance as fuel).
3. **Refill:** `CollectibleManager.collect` adds `refillPerCollectible` (0.45),
   clamped to `fuel.max` (1). Popup `+FUEL`. No salvage after `fuelDying`.
4. **Empty:** `beginFuelDying()` → ship `forwardSpeedScale` eases to 0 over
   `dyingDurationMs` (900) → `gameOver({ reason: 'fuel' })` (no explosion;
   CopyBank `fuelOut`). Crash path unchanged (`reason: 'crash'`).

### Style points + pickups (data flow)

1. **Destroying an asteroid** (shield active): `game.points +=
   config.points.perAsteroid`, ink `+1` popup; distance bonus / destroyed
   counter still apply.
2. **Collecting a sparkle:** refills fuel + increments `sparklesCollected` (see
   fuel system). Does not award style points.
3. **Style swoosh (near-miss):** `StyleSwooshManager` awards
   `config.points.perSwoosh`, plays `playSwoosh()`, Signal-Blue VFX + `SWOOSH +N`.
4. **Wall boop / portal hop:** unchanged (`WallBoopManager`, wormhole SFX).

Tune values in `config/GameConfig.js → fuel`, `points`, and `styleSwoosh`.

## 8. Brand system (how visuals stay consistent)

`brand/tokens.js` holds the live `color` object (light defaults); `brand/theme.js`
switches **light** (cream, near-black ink, Signal Blue) vs **dark** (charcoal
`#1C1A16`, bone ink, vivid mint `#3DFF9A`). Default with no `ssTheme` is light.
Options hub toggles and persists. Trail wakes / shields read tokens at draw time;
milestone toasts use a paper-rgb plate so ink text stays readable on both themes. Canvas code draws through
`utils/BrandDraw.js` helpers so every surface matches. Obstacles and VFX must use
`color.ink` / `color.inkRgb` — not hard-coded black. The points collectible is a
four-point **sparkle** (`drawSparkle`) — deliberately distinct from the filled-ink
8-point "hostile" star.

### Spock copy (`brand/CopyBank.js`)

Flavor subtitles (menu tagline, Open Space crash/victory, Journey fail / partial
clear / flawless / finale) live in named pools and are picked **once when the
screen is entered** via `pickCopy(poolKey)`. A one-deep last-used guard avoids
immediate repeats. Titles and chrome stay fixed; only the personality line
rotates. Journey stores the pick on `levelOutcome.flavor` inside
`finishJourneyLevel()` so the flyout re-render cannot reshuffle it.

- **New line:** append to the right pool in `CopyBank.js`. Keep it short, dry,
  no `!` or emoji.
- **New screen that needs voice:** add a pool, pick on enter, store on the game
  object, read in render.

## 9. Extending

- **New ship skin:** add an entry to `SKIN_DEFS` in `ships/skinDefs.js` with
  `drawHull`, `drawTrail`, `hitbox`, and `wallTrailMode`; the registry, picker
  grid and click handling all read from it. Reuse a wake from `ships/trails.js`
  (or add one there), and build a shaped hull from
  `makeHullRenderer(pathFn, jellyProfile)` so it gets bank rotation, halo, and
  a boop feel for free. Size hitbox circles inside the outline (`?hitbox`).
  Optional `trailMaxPoints` / `trailFade` for longer wakes; add `HullCache`
  `HULL_META` when using a non-default jelly profile.
- **New collectible / fuel tuning:** edit `CollectibleManager` (cadence,
  placement) and `GameConfig.fuel` (drain / refill / dying).
- **New obstacle:** add a `BaseObstacle` subclass in `ObstacleManager.js`, add a
  `spawnX()` + `spawnObstacleByType` case, then add it to `OPEN_WORLD_UNLOCKS`
  (`modes/RunProfile.js`) with the distance that unlocks it, and give it a
  `STEPS` entry in `config/JourneyConfig.js` if it should appear in Journey.
  For sandbox-only testing first, expose it via `HazardLabConfig` /
  `HazardLabProfile` (and Logbook class→id + `drawEntryIcon`) without STEPS.
- **New Journey chapter:** append steps to `STEPS` and a matching entry to
  `CHAPTERS` covering them. Both tables are plain data; levels, goals, star
  targets and the map all derive from them.
- **New play mode:** subclass `RunProfile`, override only what differs, and add a
  branch to `createRunProfile()`. Nothing in the managers should need touching.
- **New HUD/end-screen element:** use the `BrandDraw` primitives + type presets so
  it stays on-brand.

## 10. Native iOS (`ios-native/`)

Shipping iOS app. Open [`ios-native/SpaceSwoosh.xcodeproj`](ios-native/SpaceSwoosh.xcodeproj)
on a Mac (see [`ios-native/README.md`](ios-native/README.md)).

| Path | Role |
| --- | --- |
| `SpaceSwoosh/App/` | SwiftUI menu + `SpriteView` host |
| `SpaceSwoosh/Core/` | `GameConfig`, fixed-step clock, frame-pacing monitor |
| `SpaceSwoosh/Sim/` | `WorldState`, zigzag `ShipSimulator`, trail ring buffer |
| `SpaceSwoosh/Render/` | `PlayScene`, baked Focus hull, pooled ribbon trail |
| `SpaceSwoosh/Input/` | Half-screen tap → zigzag flip |
| `scripts/generate-pbxproj.mjs` | Regenerate `.xcodeproj` after adding Swift files |

**Butter contract (non-negotiable):** no per-frame `SKShapeNode` path mutation;
hot draws are textures / pooled sprites; sim at 1/60 with interpolated
presentation; `preferredFramesPerSecond = 120` +
`CADisableMinimumFrameDurationOnPhone`; DEBUG HUD gates on p99, not average FPS.
Phase B will add atlas bake + worst-case load scene.
