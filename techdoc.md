# Space Swoosh — Technical Documentation

> How the project currently works, for developers. Keep this up to date as the
> code changes.
>
> **BUILD 23 + Phase 0/1 iOS:** Zigzag default flight style. **iOS canvas budget**
> (~60 Hz paint, hitch clamp ≤1/30 s, opaque context) plus **cheap Canvas** on
> iPhone/iPad: DPR ≤ 1.5, baked hull `drawImage`, glow sprites (halos/black-hole/
> swoosh flash restored without path radials), flat ribbon fills. Phase 0 URL
> harness: `?perf=1`, `?nodraw=1`, `?drawonly=1`, `?kill=trails,glows,hud,hulls,obstacles,gradients`,
> `?fullvfx=1`, `?cheap=0|1`, `?dpr=N`. See §6.
>
> **Supabase:** Open World leaderboard uses **vaisi's Project**
> (`ptzaxgslzjefaxdkrvyr`). Table `public.high_scores` + RLS (SELECT/INSERT only
> for anon). Schema in `supabase/migrations/`. No auth / no Journey cloud sync yet.

## 1. Overview

Space Swoosh is a vertical-scrolling "dodge" game rendered on a single HTML5
`<canvas>`. The ship auto-flies upward through a *paper universe*; the player
steers left/right in arcs to dodge (or, with a shield, destroy) ink asteroids,
grab shield pickups, and collect points.

There are **two play modes**, chosen from Play:

| Mode | Shape | Leaderboard |
| --- | --- | --- |
| **Open World** | Endless. Difficulty ramps off distance, forever. | Yes (Supabase) |
| **Journey** | 40 finite levels, each with a distance goal and three stars. | No — progress is local |

- **Stack:** vanilla JS (ES modules), [Vite](https://vite.dev) dev/build,
  Capacitor 8 for iOS/Android shells, Supabase for the online leaderboard,
  Google Analytics (`gtag`) on web only.
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

### Open World leaderboard (Supabase)

| Piece | Role |
| --- | --- |
| Project | vaisi's Project — ref `ptzaxgslzjefaxdkrvyr` |
| Table | `public.high_scores` (`player_name`, `ship_id`, `score` = KM, `obstacles_destroyed`, `created_at`) |
| Client | `src/config/supabase.js` + `src/services/ScoreService.js` |
| Access | Anonymous call signs (no Supabase Auth). `NameFilter` validates before insert. |
| RLS | Public SELECT + INSERT; no UPDATE/DELETE for `anon` / `authenticated` |
| Migrations | `supabase/migrations/20260804200000_create_high_scores_leaderboard.sql`, `…_high_scores_add_ship_id.sql` |
| CI secrets | Same `VITE_SUPABASE_*` in GitHub Actions (repo secrets) + Codemagic env group. A Pages build without them ships a playable game with a dead leaderboard (`RANK #?` / submit fails). |
| Fetch | `ScoreService.getTopScores(type, limit = 100)` — enough for 10 pages × 10 rows |
| Submit prompt | Open World game-over prompts for a call sign when rank ≤ 100 |

GitHub ↔ Supabase (if connected) applies files under `supabase/migrations/` on
branch deploys. It does not replace putting the publishable URL/key into the
game build env. Journey progress and Open World personal best stay in
`localStorage` only.

## 3. Directory map (`src/`)

| Path | Responsibility |
| --- | --- |
| `main.js` | Bootstraps: preloads brand fonts, starts the game (menu), wires native shell. |
| `native/index.js` | Capacitor shell: hardware back, lifecycle pause, keep-awake, status bar, splash. |
| `game/BackNavigation.js` | Shared "go back one step" map for Android back + Escape. |
| `services/Analytics.js` | Platform analytics: gtag on web, no-op on native until Firebase is wired. |
| `services/Purchases.js` | RevenueCat wrapper (native only); no-ops without API keys. |
| `services/Entitlements.js` | Skin ownership cache + purchase / restore. `UNLOCK_ALL_SKINS` (currently `true`) opens the whole roster without IAP for playtest. |
| `game/Game.js` | Core loop, `appScreen` flow, menu/options/HUD/end screens, scoring. |
| `ships/skins.js` | Ship skin registry: lookup, persistence, roster, menu previews. |
| `ships/skinDefs.js` | Ship roster (Focus…Nyan…Cinder) composed from hulls + trails + boop signatures. |
| `ships/hulls.js` | Hull paths, jelly profiles, `wallTrailDeform` modes, `beginHullFrame`, `MAX_BANK`. |
| `ships/trails.js` | Wake renderers + per-skin wall-boop extras (bubble, rainbow ribbon, desync, etc.). |
| `config/GameConfig.js` | Tuning every run shares (spacecraft, camera, obstacle sizes, milestones, **points**, styleSwoosh). |
| `config/JourneyConfig.js` | The Journey curve: `STEPS`, chapters, the derived `JOURNEY_LEVELS` table, star rules. |
| `modes/RunProfile.js` | `RunProfile` contract + `OpenWorldProfile`; owns `OPEN_WORLD_UNLOCKS`. |
| `modes/JourneyProfile.js` | Maps a level descriptor to per-run tunables. |
| `modes/index.js` | `createRunProfile(game, mode, level)`. |
| `services/JourneyProgress.js` | `localStorage` progress: unlocked level, stars, best points. |
| `services/OpenWorldProgress.js` | `localStorage` personal-best Open World distance (device-only). |
| `config/LogbookEntries.js` | Static Logbook catalog: obstacles, boosts, level placeholders, From the Void stub. |
| `services/LogbookProgress.js` | `localStorage` logbook: `locked` / `observed` / `known` per entry. |
| `managers/LogbookManager.js` | Journey-only façade: observe / interact / instant + toast debounce. |
| `managers/LogbookToastManager.js` | Top-center "Logbook updated" chip (~2s). |
| `ui/screens/LogbookScreen.js` | Logbook menu: category tabs, tall scrollable cards (1/3 icon, 2/3 text). |
| `ui/screens/ModeSelectScreen.js` | Play → Open World / Journey. |
| `ui/screens/JourneyMapScreen.js` | Scrollable level select: chapter bands of level tiles. |
| `ui/screens/LevelOutcomeScreen.js` | Level clear / failed: one row per objective, next-step actions. |
| `game/LevelClearSequence.js` | The level-clear flyout: angled hyperspeed boost off the top, fade world, fade screen in. |
| `game/LevelIntroSequence.js` | Run-start intro (~1s): slow bottom roll + top star shower that eases out. |
| `game/cinematicFlight.js` | Shared angled cruise (zigzag / arc heading + silent wall bounce) for intro & outro. |
| `core/Camera.js` | Scroll position + `getRelativeY()` world→screen mapping, shake. |
| `core/InputHandler.js` | Keyboard/touch input → ship movement (only while `isPlaying()`). |
| `entities/Spacecraft.js` | Ship movement, heading, trail data, shield; render delegates to active skin. |
| `entities/Collectible.js` | The Signal-Blue sparkle points pickup (render + collision). |
| `entities/ComplexAsteroid.js` | (legacy/aux asteroid variant). |
| `managers/ObstacleManager.js` | All obstacle types, spawning, collisions, destruction particles, score popups. |
| `managers/PowerUpManager.js` | Shield pickups (spawn + collect → activate shield). |
| `managers/CollectibleManager.js` | Points sparkles: spawn cadence, collect → `game.points`, popups + `playCollect()`. |
| `managers/StyleSwooshManager.js` | Near-miss twin-obstacle "swoosh": style points + Signal-Blue VFX. |
| `managers/WallBoopManager.js` | Sidewall bounce "BOOP": ink text popup below the hull. |
| `managers/MilestoneManager.js` | Distance milestone / hazard / level-intro messages. |
| `managers/SoundManager.js` | Audio (BGM + SFX). Web Audio `playCollect()` / `playSwoosh()` / `playBoop()` / `playPortalEntry()` / `playPortalExit()` / `playLogbook()`. |
| `services/ScoreService.js` | Supabase leaderboard read/write + `formatScore()`; `getTopScores` defaults to 100. |
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
| `menu` | Title, selected-skin preview, Play / Logbook / Options / High Scores |
| `modeSelect` | Play → Journey (recommended, first; Logbook unlocks) or Open World. Card blurbs rotate from CopyBank `modeJourney` / `modeOpenWorld` on each `goToModeSelect()`. Journey footer: level + stars. Open World footer: `Personal best: {score} KM` when `OpenWorldProgress.bestScore > 0`. |
| `journeyMap` | Journey level select; scrollable chapter bands of level tiles |
| `logbook` | Discovery journal (categories + entries); Back → menu |
| `options` | Options hub: Ship / Controls / Sound |
| `optionsShip` | Ship picker (2-column grid of the roster); persists `shipSkinId` |
| `optionsControls` | Stub — future touch schemes (swipe / on-screen L–R) |
| `optionsSound` | Sound on/off, driving `SoundManager`'s persisted mute |
| `highscores` | Leaderboard: 10 tall rows/page (max 10 pages), DISTANCE/OBSTACLES tabs, 🥇🥈🥉 for ranks 1–3, `PAGE n/m` arrows; Back → `highScoresReturnScreen` (`menu` or `gameover`). No inset gray screen frame. |
| `playing` | Active run; pause button visible; gameplay input enabled |
| `gameover` | End of a run. Open World: explosion → Mission Failed/Complete → Play Again / Submit / High Scores / Menu. Journey: a crash explodes the same way, a cleared level runs the flyout (below); either lands on the level-outcome screen (`ui/screens/LevelOutcomeScreen.js`) — no submission |

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
`renderPauseOverlay()` draws a paper wash, the run's live stats, and three
buttons into `this.pauseButtons`:

| Button | Effect |
| --- | --- |
| Resume | `togglePause()` |
| Sound | `soundManager.toggleMuted()` — same persisted switch as Options → Sound |
| Exit Run | `exitRun()` → `goToMenu()`; nothing is submitted, and the world is rebuilt by `resetRunState()` on the next `beginRun()` |

`handleInteraction` routes to `handlePauseClick()` **before** the "gameplay
touches belong to InputHandler" early return, so the menu owns the canvas while
it's up. `Space` and `Escape` both toggle pause, and the DOM pause button hides
while the menu is up since the menu carries its own Resume.

`SoundManager` mute sets `.muted` on every `<audio>` element (so each cue keeps
its own mix level) and short-circuits the synthesized Web Audio cues; the state
persists under the `soundMuted` key.

### Screen layout system

All non-gameplay screens share one grid via `screenLayout(canvas, baseUnit)` in
[`ui/ScreenKit.js`](src/ui/ScreenKit.js): content edges (`left` / `right` /
`top` / `bottom`) from a layout margin (no in-canvas gray border stroke), plus a
named vertical rhythm — `section` (between bands), `block` (inside a band),
`row` (label under a figure). Use these instead of ad-hoc `unit * n` gaps.
The cream panel vs dark ink surround comes from the page shell in `index.html`
only; `drawScreenFrame` was removed.

- `Game.drawScreenHeader(title, { back })` draws the Back control + centred title
  and a closing dotted rule; it returns `{ backRect, contentTop }`.
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
| `density()`, `baseClusterCount()`, `maxOnScreen`, `gapRange()`, `simpleChance`, `focusType`, `unlocksBy()`, `advancedBlackHoles` | `ObstacleManager` |
| `shieldsFromScore` / `collectiblesFromScore` | `PowerUpManager` / `CollectibleManager` |
| `speedMultiplier` | `Spacecraft.baseSpeed` |
| `runsTutorial` | `ObstacleManager` tutorial phase |
| `submitsScore`, `introMessage`, `title` | `Game` end-of-run flow, milestone log |

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
  already passed. Open World's profile returns `Infinity`: the old `length < 7`
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
d       0.08 0.16 0.26 0.36 0.46 0.58 0.70 0.84 1.00
levels    2    3    3    4    4    5    5    6    8   = 40
```

Everything else is derived from `d` by `lerp`, in `JourneyProfile`: `density`
0.55→1.9, `maxOnScreen` 3→9, row gap 0.48→0.20 of screen height, `speedMultiplier`
0.88→1.32, cluster size 1→4 (capped by `maxClusterCount` 2→4), `maxRowSpawns`
1→3, `simpleChance` 0.78→0.50. Early levels therefore place a single rock per
line. `goalKm` runs 4000→12000 plus 300 per level *inside* a plateau, except
**level 1 is hard-capped at 2,000 km** as a short first flight. Each step also
introduces one obstacle type (rosters are cumulative) and each level picks a
`focusType` it leans on — the level that introduces a hazard focuses that hazard,
later levels in the plateau rotate through the roster.

Chapters (Troposphere → Exosphere, names inherited from the deleted
`PhaseManager`) group steps: 1-5, 6-12, 13-21, 22-32, 33-40. `STEPS` is
append-only data, so more chapters are additive.

### Stars and progress

Three per level, in fixed order: reach the goal, hit the points target
(`15 per 1000 km`, rounded to 5), and **smash N asteroids** with the shield
(`smashTarget` lerps 3→14 with difficulty). Shield bumps are the fantasy —
there is no "no hits" star. `evaluateStars()` scores a finished run; all three
require completion. The Journey HUD shows `destroyed / smashTarget`.

`services/JourneyProgress.js` persists `{ version, unlocked, levels: { n: { stars,
bestPoints } } }` under `journeyProgress`, guarded in try/catch like
`ships/skins.js`. Stars are **cumulative** across attempts, so a later run can add
the points star without repeating a no-hit run, and only clearing the frontier
level advances `unlocked`. Journey never writes to Supabase.

### Journey Logbook

A science-journal discovery system. **Writes only during Journey runs**
(`game.isJourney()`). Open World never updates it. Menu item is always available.

| Piece | Role |
| --- | --- |
| `config/LogbookEntries.js` | Catalog + copy. Categories: Obstacles, Boosts, Levels (lorem ipsum placeholders), From the Void (stub). |
| `services/LogbookProgress.js` | Key `logbookProgress`: `{ version, entries: { [id]: 'observed' \| 'known' } }`. |
| `managers/LogbookManager.js` | `observe` / `interact` / `revealInstant`; same-frame toast debounce via `flushToast()`. |
| `managers/LogbookToastManager.js` | Top-center chip, independent of MilestoneManager. |
| `SoundManager.playLogbook()` | Soft Enterprise-style bridge chirp (two quiet filtered sines) on update. |

**State machine:** `locked` → `observed` (picture + name; Spock pending line) → `known` (field-manual definition + remark). Instant entries (`spaceBoop`, `styleSwoosh`, `deflectorSmash`, `spaceTravelBoost`) jump straight to `known`.

**Hooks (Journey only):** on-screen obstacles/power-ups/sparkles/finish gate → observe; smash/fatal hit/black-hole pull/wormhole teleport/collect/clear → interact; wall BOOP / style swoosh / first deflector smash / clear-boost phase → instant.

**Future:** From the Void will hold beta-tester messages picked up around 11 km in endless Journey — category shell only for now.

### The run-start intro

Every run (Journey and Open World) opens with `game/LevelIntroSequence.js`, built
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
spawning resumes, deferred `pendingIntroMessage` shows, streaks clear, and
After the ship intro, `hudRevealPhase` runs a calm onboarding beat (controls
live; pause button and spawning stay off until chips):

| Phase | What happens |
| --- | --- |
| `title` | Centre milestone title alone (fade in, short hold, **~3s fade out**). No HUD, no pause. |
| `wait` | 1s empty beat after the title clears |
| `chips` | Timed 1s fades: KM → **pause last**. Points / Destroyed stay dark until first sparkle collect / first smash, then each fades in ~1s. Journey distance reads `current / goal KM` with a borderless progress track (no LEVEL chip). |

Open World with no intro line skips straight to `wait`. Spawning resumes when
`chips` starts. `Game.hudRevealAlpha(slot)` drives HUD + pause opacity. Input
locked during the ship intro itself except Escape→pause.

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

Journey also draws a world-space finish line (`Game.renderFinishLine`): a dotted
rule with Signal-Blue end ticks that fades in within ~2 screens of the ship and
locks to `finishLineWorldY` when the goal is crossed so the flyout can pass
through a fixed mark.

Two things make it work:

- **The camera has to be decoupled.** `Camera.update()` tracks the ship, so
  however fast the ship goes the camera follows and it never leaves its screen
  position. During `boost` / `fadeOut` the sequence stops calling `camera.update()`
  and advances `camera.y` by hand at the velocity captured on completion, eased to
  1.25×. The world keeps streaming; the ship (boost × lean) pulls away and exits.
- **The run is already scored.** `completeRun()` calls `finishJourneyLevel()`
  *before* constructing the sequence, and `ObstacleManager`'s shielded-collision
  branch checks `game.levelClear?.active`: particles yes, but `score` / `points` /
  `obstaclesDestroyed` and the `+points` popup are all skipped, and
  `playShieldCrash()` is throttled to one per 120ms. `pauseSpawning` (set but never
  read until now) stops new rows appearing mid-flyout.

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

Scope: obstacles only. `CollectibleManager` and `PowerUpManager` still test the
generous `radius` circle so pickups stay easy to grab, and wall bounce plus
`StyleSwooshManager` clearance also still use `radius`. Add `?hitbox` to the URL
to stroke the live circles in Signal Blue over the ship.

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
| `squareStamp` | Square (`squarePath`) | Dense filled square stamps | Rubber blot at contact, then peel |
| `squareTick` | Square | Lateral tick marks | Ticks stretch toward the wall |
| `squareTrace` | Square | Hairline stroke | Spring along the line |
| `squareRing` | Square | Expanding rings | Ring squash only (no Halo bubble pop) |
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
| `pile` | Halo, Square Tick / Ring |
| `dense` | Focus, Pulse |
| `blot` | Square Stamp |
| `scatter` | Ember |
| `shatter` | Shard |
| `desync` | Echo |
| `flare` | Wisp |
| `spring` | Flicker, Quill, Nyan, Square Trace |
| `whip` | Needle |
| `crease` | Fold |
| `cloud` | Mote |
| `ladder` | Spine |
| `lag` | Orbit |
| `script` | Ink — calligraphic reverse/whip on mid+tip (hull locked); `reverseBoop` adds pressure pulse + tip flecks |
| `flick` | Flux |
| `cinder` | Cinder |

Trail color accents: Signal Blue (`color.signalRgb`) on Pulse / Quill / Flux
dashes / Cinder glints; warm Ember (`color.emberRgb`) on Cinder wakes only;
**Nyan** uses `drawRainbowRibbonTrail` (six stacked pop-stripe bands, not
HUD/UI) and `drawNyanHull` — Echo’s `crescentPath` sparrow wings in dark gray
with two clipped pink spots (`CRESCENT_HITBOX`). Optional skin fields
`trailMaxPoints` / `trailFade` stretch wakes (Nyan: 160 pts, fade `1/360`);
iOS draw LOD still multiplies max points by 0.6.

Shaped hulls mostly share `makeHullRenderer(pathFn, profile)` in `skinDefs.js`;
Fold, Needle, Halo, Square, Mote, Spine, and Orbit have dedicated drawers.
**Orbit** hitbox is the solid oval body only (ring/satellite decorative).
**Spine** is stacked circles down the bar only.

- Registry: `ships/skins.js` (`getSkin`, `drawSkinPreview`, `loadShipSkinId` / `saveShipSkinId`).
- Roster: `ships/skinDefs.js`; geometry in `ships/hulls.js`; wakes in `ships/trails.js`.
- `Spacecraft.render()` calls `skin.drawTrail` then hull (`HullCache` blit when
  `game.useHullCache`, else `skin.drawHull`); shield rings stay Signal Blue.
- Active id: `game.shipSkinId` (storage key `shipSkinId`).

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
  iPadOS that reports as MacIntel. `scheduleNextFrame()` targets ~60 Hz with
  `setTimeout` + rAF so ProMotion does not wake JS at 120 Hz just to skip paints
  (that skip-churn caused heat + worse jitter). Android browser, Android app, and
  desktop stay unlocked one-update-per-paint.
- **`iosDrawLod` vs `cheapCanvas`:** draw LOD (short trails, smudge off, Open
  World `maxOnScreen` 18) is `iosCanvasBudget && !fullvfx`. Cheap Canvas defaults
  **on** for iOS (`?cheap=0` to force off): hull bitmaps (`ships/HullCache.js`),
  glow sprites (`utils/GlowSprites.js`) so soft VFX return without path radials,
  ribbon fills skip `createLinearGradient`. Paint hitch clamps stay on `iosCanvasBudget`.
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
  **Page shell:** `html`/`body` are brand **ink** (`#1A1A1A`); only
  `#gameContainer` / canvas are **paper** cream, so the playfield edges read on
  desktop (centered, max-width 500px, 2:3). Mobile fills the safe area with the
  cream stage; ink shows in notch / home-indicator insets. `theme-color` is ink.
  Menu stamp: `BUILD 23 · NATIVE` / `WEB`.
- **Flight style** (`config/flightStyle.js`, `game.flightStyle`): `arc` | `zigzag`.
  Default is **zigzag** when unset; saved preferences are respected. Zigzag
  integrates a constant heading at `spacecraft.zigzagAngleDeg` from up at
  `zigzagSpeedScale` × cruise; **touch flips on `touchstart`** (move/end ignored
  for that gesture), plus **Space** / arrows; Escape pauses. Arc uses swipe +
  half-screen tap + arrows (Space pauses); banks are **closed** linear full-π
  swooshes (`arcDuration` 820 ms — see §5). The intro tutorial hint
  matches the active style (`{space}` renders as a bold SPACE keycap).
  Persisted in localStorage.

## 7. Scoring model

There are **three independent metrics** on the `Game` instance:

| Field | Meaning | Source | Where shown |
| --- | --- | --- | --- |
| `score` | Distance in "KM" | `+= abs(Δcamera.y) * (100/60)` after each camera step (locked to world travel); also `+10` per shield-destroyed asteroid | HUD, end screen, leaderboard (`distance` tab) |
| `obstaclesDestroyed` | Count of asteroids destroyed | `++` on each shield destruction | HUD, end screen, leaderboard (`obstacles` tab), Journey's third star vs `smashTarget` |
| `points` | **Reward points** | `+perAsteroid` destroy, `+perCollectible` sparkle, `+perSwoosh` near-miss style | HUD, end screen, Journey's second star |

Open World also keeps a device-local **personal best** (`services/OpenWorldProgress.js`,
key `openWorldProgress`) updated in `gameOver()` whenever a non-Journey run ends.
Exit Run does not write it. The Play → Open World card reads it for its footer.

`points` is **local only** — it is not (yet) sent to the Supabase leaderboard;
it is included in the `game_over` GA event.

### Points system (data flow)

1. **Destroying an asteroid** (only possible while the shield is active): in
   `ObstacleManager.update()`'s shield-collision branch, `game.points +=
   config.points.perAsteroid`, an ink `+1` popup floats up, and the existing
   distance bonus / destroyed counter still apply. For `ComplexAsteroid` /
   `ShootingAsteroid`, a moon- or shot-only contact clips that part (same
   awards, smaller debris) and keeps the parent rock; contacting the body/core
   still removes the whole obstacle.
2. **Collecting a sparkle:** `CollectibleManager` spawns `Collectible`s at a
   jittered interval once `score >= profile.collectiblesFromScore` (100 km in
   Open World, 4% of the goal in Journey) and the tutorial is over. Each sparkle
   is sized at `1.15 × baseUnit` (see `Collectible.js`). On contact
   (`checkCollision`), `game.points += config.points.perCollectible`, a Signal-Blue
   `+10` popup floats up, and `SoundManager.playCollect()` plays a short
   two-tone Web Audio chime.
3. **Style swoosh (near-miss):** `StyleSwooshManager` detects when the ship is
   squeezed between a left and right obstacle — both clearances positive but
   under `config.styleSwoosh.maxClearance × ship.radius`. Awards
   `config.points.perSwoosh`, plays `playSwoosh()`, and renders a Signal-Blue
   ring / streak / gap-dot burst plus a floating `SWOOSH +N` popup. Each pair
   awards once (cooldown + pair key).
4. **Wall boop (sidewall bounce):** When `Spacecraft` clamps against a screen
   edge (arc bounce or zigzag wall clamp), it calls `WallBoopManager.triggerBoop(ship,
   side)`. That plays `SoundManager.playBoop()` — phone-audible body (320→180 Hz)
   + short mid tick (~520 Hz) + reused noise buffer (old ~185→92 Hz was inaudible
   on iPhone speakers under BGM) — and spawns an ink-only `BOOP` label below the
   hull (no glow/blot), inset from the wall so the full word stays on-screen.
   Applies to every skin; Square skins still also get `wallJelly` squash.
5. **Portal hop:** `WormholeGate.transportSpacecraft()` calls
   `SoundManager.playPortalEntry()` at hop start and `playPortalExit()` on
   emerge — deeper space warps (low body/sub + swirl) through a delay-feedback
   echo bus. `playShield()` follows ~90 ms after exit so the deflector gift
   stays audible without masking the emerge cue.

Tune values in `config/GameConfig.js → points` and `styleSwoosh`.

## 8. Brand system (how visuals stay consistent)

`brand/tokens.js` is the single source of truth: warm **paper** ground, near-black
**ink** shapes/text, and one accent **Signal Blue** (`#0000FF`) reserved for
"good / active" things (shield, focus, teleport, **the points sparkle**, selected
ship tile). Canvas code draws through `utils/BrandDraw.js` helpers so every
surface matches. The points collectible is a four-point **sparkle** (`drawSparkle`)
— deliberately distinct from the filled-ink 8-point "hostile" star.

### Spock copy (`brand/CopyBank.js`)

Flavor subtitles (menu tagline, Open World crash/victory, Journey fail / partial
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
- **New collectible behavior / value:** edit `CollectibleManager` (cadence,
  placement) and `GameConfig.points`.
- **New obstacle:** add a `BaseObstacle` subclass in `ObstacleManager.js`, add a
  `spawnX()` + `spawnObstacleByType` case, then add it to `OPEN_WORLD_UNLOCKS`
  (`modes/RunProfile.js`) with the distance that unlocks it, and give it a
  `STEPS` entry in `config/JourneyConfig.js` if it should appear in Journey.
- **New Journey chapter:** append steps to `STEPS` and a matching entry to
  `CHAPTERS` covering them. Both tables are plain data; levels, goals, star
  targets and the map all derive from them.
- **New play mode:** subclass `RunProfile`, override only what differs, and add a
  branch to `createRunProfile()`. Nothing in the managers should need touching.
- **New HUD/end-screen element:** use the `BrandDraw` primitives + type presets so
  it stays on-brand.
