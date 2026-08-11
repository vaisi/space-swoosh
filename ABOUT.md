<!--
  ABOUT.md
  SPACE SWOOSH — Project reference (single source of truth for "what is this / how does it work").
  Changes:
  - Created file: full project overview — concept, tech stack, run/build/deploy,
    file map, architecture & game loop, gameplay mechanics, UI/screens, audio,
    data & backend, brand system, config knobs, known issues / tech debt, and a
    roadmap-to-market. Reflects the current codebase (flat-paper UI, no math grid).
  Keep this updated whenever behavior, structure, or config changes.
-->

# Space Swoosh — About

> **Space Swoosh** is a one‑thumb, vertically‑scrolling space‑dodge game rendered entirely on an HTML5 canvas. You pilot a small reticle‑shaped craft that constantly climbs upward through a *paper universe* of geometric asteroids, black holes, and wormholes. Steer left/right, survive, and climb the leaderboard.

- **Aesthetic:** geometric minimalism — warm paper, near‑black ink shapes, one electric‑blue "signal" accent. (Full spec in [`BRANDKIT.md`](./BRANDKIT.md).)
- **Platform:** browser (desktop + mobile), portrait 2:3 canvas.
- **Status:** playable; being polished for a public launch.

---

## 1. Tech stack

| Area | Choice |
| --- | --- |
| Language | Vanilla JavaScript (ES modules), no framework |
| Rendering | HTML5 Canvas 2D |
| Bundler / dev server | [Vite](https://vitejs.dev) 5 |
| Backend / leaderboard | [Supabase](https://supabase.com) (Postgres + JS client) |
| Analytics | Google Analytics (`gtag.js`) |
| Type / fonts | Space Grotesk + Space Mono (Google Fonts) |
| Deploy | `gh-pages` (GitHub Pages) |

No build framework, no TypeScript, no test suite yet.

---

## 2. Getting started

```bash
# from space-swoosh-main/
npm install       # install deps (Vite + Supabase client)
npm run dev       # start Vite dev server → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the built dist/ locally
```

**Deploy:** `dist/` is a static bundle. `gh-pages` is available as a dev dependency for GitHub Pages publishing.

**First run:** on load the game prompts for a player name (stored in `localStorage` as `playerName`). Sound initializes on the first user interaction (browser autoplay policy).

---

## 3. Project structure

```
space-swoosh-main/
├── index.html              # App shell: canvas container (2:3, max 500px), gtag, brand CSS
├── brandkit.html           # Standalone visual brand board (open in browser)
├── BRANDKIT.md             # Written brand guidelines
├── ABOUT.md                # ← this document
├── package.json            # Scripts + deps
├── public/ (sounds/, icons)# Static audio + favicons served at site root "/"
└── src/
    ├── main.js             # Entry point: prompt name, preload fonts, boot Game
    ├── config/
    │   ├── GameConfig.js    # Tunable gameplay constants (speeds, obstacle types, milestones)
    │   └── supabase.js      # Supabase client (⚠ URL + anon key hard-coded here)
    ├── core/
    │   ├── Camera.js        # Velocity-smoothed vertical camera; tracks total distance
    │   └── InputHandler.js  # Keyboard (arrows/space) + touch (tap left/right half)
    ├── entities/
    │   ├── Spacecraft.js    # Player ship: arc movement, dotted trail, shield state/render
    │   └── ComplexAsteroid.js # Asteroid + orbiting debris variant
    ├── managers/
    │   ├── ObstacleManager.js # Spawns/updates/renders ALL obstacles, portals, black holes, collisions
    │   ├── PowerUpManager.js  # Spawns + collects the shield pickup
    │   ├── MilestoneManager.js# Timed "science-officer log" flyover messages
    │   └── SoundManager.js    # Loads/plays BGM + SFX
    ├── modes/
    │   ├── RunProfile.js     # Per-run length/difficulty contract + OpenWorldProfile
    │   ├── JourneyProfile.js # A Journey level descriptor as gameplay tunables
    │   └── index.js          # createRunProfile(game, mode, level)
    ├── services/
    │   └── ScoreService.js   # Supabase read/write for high scores + score formatting
    ├── brand/
    │   ├── tokens.js         # Design tokens for canvas code (color, font, motif, frame…)
    │   └── tokens.css        # Same tokens as CSS vars (var(--ss-*)) + font @import
    ├── utils/
    │   ├── BrandDraw.js      # Canvas brand helpers: drawPaper, drawFramedButton/Tile, drawReticle, type presets
    │   └── DrawUtils.js      # Lower-level helpers: colors (INK, SHIELD_BLUE), dottedLine, sketch/shield paths
    └── game/
        └── Game.js           # The hub: game loop, state, HUD + all end screens, input wiring
```

---

## 4. Architecture & game loop

`Game` (in `src/game/Game.js`) is the orchestrator. It owns the canvas, the shared `baseUnit` (the responsive sizing module), all managers/entities, and every render state.

**Boot sequence** (`main.js`): prompt for name → `ensureBrandFonts()` (preload Space Grotesk/Mono so text never reflows) → `new Game(config)` → `game.start()`.

**Loop** (`gameLoop()` via `requestAnimationFrame`):
1. If tab hidden → skip (auto‑pauses).
2. If not paused → `update(deltaTime)`.
3. Always `render()`.

**`update(dt)`**
- If game over → only decelerate the camera during the crash animation.
- Else if playing → advance camera, ship, obstacles, milestones, power‑ups; accumulate score.

**`render()`**
- Fills the ground with flat **`drawPaper()`** (no grid — see §12), then draws obstacles → ship → milestone text → power‑ups → HUD.
- On game over, stays on flat paper and fades in the end screen (`renderMainGameOver` / `renderHighScores`, plus the submit modal).
- Pause overlay is drawn on top of any state.

**Responsive sizing:** `setupCanvas()` sets canvas resolution to the container and computes `baseUnit` (desktop `width/50`; mobile `min(width/45, height/75)`). Almost every dimension in the game is expressed in `baseUnit`s so it scales across screens. `isMobile = window.innerWidth <= 768`.

---

## 5. Gameplay

### Controls
| Input | Action |
| --- | --- |
| **← / →** (keyboard) | Steer the ship left/right in a smooth arc |
| **Space** | Pause / resume |
| **Tap left / right half** (touch) | Steer that direction |
| **On-screen ⏸ button** | Pause / resume |

The ship **auto‑climbs** upward at a steady vertical velocity; you only control horizontal arcs. Releasing input stops the arc. Movement timing survives pausing.

### Obstacles (`ObstacleManager.js`)
All obstacles derive from `BaseObstacle` (position, size, rotation, circle‑based collision, destruction particles). Types unlock by distance and spawn with weighted frequency (see `GameConfig.obstacles.types`):

| Type | Unlocks at | Notes |
| --- | --- | --- |
| Simple asteroid | 0 | Base circle |
| Pulsating | 3,000 | Scales in/out |
| Moving | 4,000 | Drifts side to side |
| Complex (`ComplexAsteroid`) | 2,000 | Circle + orbiting debris |
| Belt | 5,000 | Wide band |
| Shooting | 7,000 | Emits projectiles |
| **Black hole** (`BlackHoleObstacle`) | — | Gravity well that pulls the ship in |
| **Wormhole / teleport portals** | — | Paired gates: entering one teleports you and **grants a shield** |

### Shield power‑up (`PowerUpManager.js`)
- Appears as a **constant black plus** surrounded by **pulsating blue rings** (portal‑blue) that expand and fade quickly.
- Collecting it (or entering a wormhole) calls `spacecraft.activateShield()` for **5 seconds**.
- While shielded, the ship shows a blue glow and can **destroy obstacles on contact** (increments `obstaclesDestroyed`) instead of dying. A crash without a shield ends the run.

### Scoring & difficulty
- **Distance** is the score. It accumulates from camera velocity as you climb and is shown in the HUD (e.g. `9,929 KM`) with Space Mono tabular numerals.
- `TOTAL_DISTANCE = 50000` is the nominal target; obstacle **density ramps up** (`startDensity 0.7 → maxDensity 1.5` over the first `10,000`) and more obstacle types unlock as you go.
- **Obstacles destroyed** is tracked as a secondary stat and its own leaderboard.

### Milestones (`MilestoneManager.js`)
Timed flyover lines at set distances (see `GameConfig.milestones`), faded in/out over ~3s. Brand voice is a dry "science officer" (Spock). Note the copy in `GameConfig.js` is the older phrasing; the on‑brand rewrite lives in `tokens.js` (`voice.milestones`) and `BRANDKIT.md`.

---

## 6. UI & screens (all canvas-drawn)

- **HUD:** top‑left distance readout (`KM`) + `DESTROYED` count, Space Mono figures with small uppercase labels.
- **Game Over / Mission Failed / Mission Complete:** reticle badge, title, Spock subtitle, big distance + destroyed stats, and three large framed‑tile buttons — **Play Again**, **Submit Score**, **High Scores** — vertically centered with generous spacing inside a faint framed panel.
- **High Scores / Leaderboard:** Back button, `DISTANCE` / `OBSTACLES` tabs (active tab marked by a dotted trail), and a ranked list with dotted‑trail separators.
- **Submit modal:** light framed card; left-aligned distance → asteroids destroyed → rank; underline call-sign input; brand Submit. Opens only after the crash → Mission Failed transition has settled. On Android, Capacitor Keyboard (`resizeOnFullScreen`) plus a top-pinned input-first layout keep the call-sign field above Gboard.
- **Pause overlay:** paper wash + the two‑bar pause glyph + `MISSION PAUSED`.

Shared drawing primitives live in `BrandDraw.js` (`drawFramedButton`, `drawFramedTile`, `drawReticle`, type presets) so every surface matches the brand.

---

## 7. Audio (`SoundManager.js`)

Loads from `public/sounds/`: `background.mp3` (looping BGM, vol 0.4), plus SFX for `shield`, `explosion`, `powerup`, `move`, `turn`, `crash`, and `crash_with_shield`. Initialized on first user interaction to satisfy autoplay policies; auto‑pauses with the tab.

---

## 8. Data & backend

**Supabase** (`config/supabase.js`, `services/ScoreService.js`): a single Postgres table.

**`high_scores`**
| Column | Type | Notes |
| --- | --- | --- |
| `score` | integer | Distance (km), floored |
| `player_name` | text | Call sign |
| `ship_id` | text | Roster skin id flown on the run (nullable for legacy rows) |
| `obstacles_destroyed` | integer | Secondary metric |
| `created_at` | timestamp | Insert time |

`ScoreService` methods: `saveScore()`, `getTopScores(type, limit=20)` (sorts by `score` or `obstacles_destroyed`), `getAllScoresCount(score)` (rank calc — counts scores greater than yours), and `formatScore()` (thousands separators). Submission is prompted for **top‑20** finishes.

**Client storage:** `localStorage` holds `playerName` and a local `highScores` cache. **Analytics:** `gtag` events on `game_over` and `submit_highscore`.

---

## 9. Brand system

The visual identity is centralized so canvas and DOM stay in sync:
- **`src/brand/tokens.js`** — JS tokens (`color`, `font`, `scale`, `motif`, `frame`, `space`, `voice`).
- **`src/brand/tokens.css`** — the same as `var(--ss-*)` CSS variables + the Google Fonts import.
- **`BRANDKIT.md`** + **`brandkit.html`** — the written + visual brand board.

Palette: Paper `#E1D9C1`, Ink `#1A1A1A`, Signal Blue `#0000FF` (the only accent; always meaningful). Type: Space Grotesk (display/UI) + Space Mono (numerals, tabular).

---

## 10. Configuration knobs (`GameConfig.js`)

Tune gameplay here without touching logic:
- `spacecraft` — speed, arc radius/duration, trail sizing.
- `camera` — speed, interpolation, deceleration, smoothing.
- `obstacles` — size range, spacing, per‑type `unlockScore` + `weight`, and `scaling` (density ramp).
- `milestones` — distance → message pairs.

---

## 11. Roadmap to market (suggested)

1. **Correctness pass** — resolve the scoring/win inconsistencies (§12) so the "win" state and difficulty curve are intentional.
2. **Security** — move Supabase URL/key out of source into env vars; add Row‑Level Security / rate limiting so the leaderboard can't be spammed.
3. **Onboarding** — replace the blocking `prompt()` name entry with an in‑canvas start screen.
4. **Polish** — finish the on‑brand screens (done for game‑over/high‑scores/modal), align milestone copy to the Spock voice.
5. **QA** — cross‑device testing (touch, small screens), add a smoke test.
6. **Ship** — production build + custom domain, verify analytics, add share/OG images.

---

## 12. Known issues & tech debt

> Fix these before (or as part of) launch. Listed so the doc stays honest.

- **⚠ Secrets in source:** `config/supabase.js` hard‑codes the Supabase URL + anon key. Move to environment variables and enable RLS.
- **Scoring model is contradictory:** live play *increments* `this.score` (distance up), but `updateScore()` (defines score as `TOTAL_DISTANCE − distance`, counting *down* to a `victory()` at 0) **is never called** — so the win/"Mission Complete" path is effectively vestigial. Decide on one model.
- ~~**`PhaseManager` is dead code**~~ — deleted. Its Troposphere→Exosphere names are now Journey's chapters (`config/JourneyConfig.js`).
- **Debug artifact:** `Game` constructor runs `localStorage.removeItem('highScores')` on every load ("remove after testing") — clears the local cache each session.
- **Off‑brand portal color:** the wormhole *exit* is still hard‑coded green `#00ff00` in `ObstacleManager.js` (~line 850); the brand calls for a hollow ink dashed ring (`motif.teleportStates`).
- **Doc drift:** `BRANDKIT.md` (§4.1) and `brandkit.html` history still describe the retired **"math paper" grid** background. The grid has been **removed** — every surface is now clean flat paper. Update BRANDKIT if you want it fully in sync.
- **Console noise:** several `console.log` debug lines remain across managers.
- **No tests / CI.**

---

## 13. Keeping this document updated

Treat `ABOUT.md` as the living map of the project. Update it whenever you:
- change gameplay rules, controls, scoring, or `GameConfig` values;
- add/remove/rename files, managers, or screens;
- change the backend schema, storage keys, or analytics events;
- resolve anything in §12 (move it out of "known issues").

When you touch a source file, also refresh its top‑of‑file change comment. For visual/identity changes, keep `BRANDKIT.md` + `tokens.*` in lockstep with what the game actually renders.
