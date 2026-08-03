<!--
  BRANDKIT.md
  SPACE SWOOSH — Brand guidelines.
  Changes:
  - Created file: written brand system (identity, color, type, motif, HUD, voice)
    that accompanies the visual board (brandkit.html) and the code tokens
    (src/brand/tokens.js, src/brand/tokens.css). This is the reference for
    upgrading the main screens.
  - Updated: added "Math Paper" as the official background, a framed motif-tile
    button/section style, and rewrote the voice as Spock (logical / precise).
-->

# SPACE SWOOSH — Brand Kit

> **Direction:** geometric minimalism. A one‑thumb flight through a *paper universe*, drawn entirely from four shapes, in one accent color.

This kit is distilled directly from the game itself: warm paper ground, near‑black ink shapes, a blue shield, the signature dotted trail, and the crosshair reticle. It replaces the old hand‑drawn *Comic Sans + Arial* treatment (including the HUD numbers) with a precise, spacey, geometric system.

**Assets in this repo**
| File | Purpose |
| --- | --- |
| `brandkit.html` | Open in a browser — the visual brand board. |
| `src/brand/tokens.js` | Design tokens for canvas/game code (import `brand`). |
| `src/brand/tokens.css` | Same tokens as CSS variables (`var(--ss-*)`) + Google Fonts. |
| `BRANDKIT.md` | This document. |

---

## 1. The idea

Everything on screen is built from **four primitives** on warm paper. Nothing is decorative — every mark is a game object or a piece of information. Minimalism *is* the gameplay; geometry *is* the language.

**Three rules**
1. **Paper & ink only** — blue always *means* something (shield, focus, teleport, active).
2. **One shape family** — flat geometric shapes in solid ink. Complexity comes from *combining and animating* them, never from new textures, gradients, or styles.
3. **Numbers are monospaced and never jump** — tabular figures everywhere.

---

## 2. Color

A monochrome palette plus a single electric signal. Restraint is the point.

| Token | Hex | Role |
| --- | --- | --- |
| Paper | `#E1D9C1` | Ground / canvas — the whole universe |
| Paper Tint | `#EAE4D2` | Raised surfaces, cards |
| Paper Deep | `#D3C9AC` | Wells, pressed/recessed states |
| Ink | `#1A1A1A` | Shapes, text, structure (never pure black) |
| Ink 80 / 55 / 30 / 12 | `#1A1A1A` @ opacity | Secondary text → dividers → faint grid |
| **Signal Blue** | `#0000FF` | The **only** UI accent — shield, focus, "active" |
| Signal Soft | `#0000FF` @ 14% | Accent fills / glow |
| Ember | `#A65D3F` | **Trail-only** warm heat (Cinder wake). Never HUD / buttons. |

**Usage:** ~90% paper, ~9% ink, ≤1% signal in UI. If blue appears in chrome, it must carry meaning. Ship wakes may use Signal and Ember as path color — still geometric paper marks, not gradients or glow FX.

---

## 3. Typography

Two geometric typefaces from the same world — both literally *"Space."*

| Use | Typeface | Notes |
| --- | --- | --- |
| Display / wordmark / titles | **Space Grotesk** 700 | Tight tracking (`-0.02em`) |
| UI, buttons, labels | **Space Grotesk** 500 | ALL‑CAPS micro labels use `0.18em` tracking |
| **Numerals / HUD / stats** | **Space Mono** 700 | **Tabular figures** — the fix for the jumpy numbers |

**Why this fixes the HUD:** Arial's proportional digits change width as the score ticks, so the readout visibly shifts. Space Mono is monospaced with tabular numerals, so `2,786` → `2,787` stays rock‑steady. Units (`KM`) drop to a small uppercase Space Grotesk label beside the figure instead of sharing its size.

Fonts load via Google Fonts in `tokens.css`. For the canvas, register the same families before first paint (see §6).

---

## 4. Element library

Every entity the game spawns is a flat geometric shape from **one ink family**. Reuse these; invent nothing outside the set. (Source: `ObstacleManager.js` / `PowerUpManager.js`.)

**Asteroids & debris** — solid ink, obstacles:

| Element | Shape | Meaning |
| --- | --- | --- |
| **Asteroid** | Circle | Basic asteroid |
| **Shard** | Triangle | Debris shard |
| **Block** | Square, rotated ~8° | Debris block (never axis‑locked) |
| **Drifter** | Pentagon | Moving asteroid (side‑to‑side) |
| **Hostile** | 8‑point star | Shooting asteroid (emits ink dots) |
| **Belt** | Wide ellipse | Asteroid belt / barrier band |
| **Cluster** | Circle + orbiting dots | Complex asteroid with satellites |
| **Pulsar** | Circle that scales | Pulsating / unstable asteroid |
| **Comet** | Circle + fading trail | Fast fly‑by |

**Anomalies** — hazards:

| Element | Shape | Meaning |
| --- | --- | --- |
| **Black hole** | Ink disc + soft glow + pulse ring | Gravity well; pulls the ship in |
| **Teleport** | Dashed ring (Signal Blue) | Wormhole gate — teleports + grants shield |
| **Barrier** | Tall bars at the screen edges | Side walls |

**Ship & signals:**

| Element | Shape | Meaning |
| --- | --- | --- |
| **Ship** | Reticle + Signal‑Blue dot | The player craft (focus glyph) |
| **Trail** | Dotted path, fading | The ship's wake — reuse for dividers, loaders, progress |
| **Shield** | Ring in Signal Blue + soft fill | Protection / active state |
| **Pause** | Two vertical bars | Paused state |

> **Color fix — teleport gates.** In code the wormhole *exit* is pure green (`#00ff00`) and "spent" gates are grey (`#666`), both off‑brand. Bring them onto the palette: **entry** = solid Signal‑Blue dashed ring, **exit** = hollow ink dashed ring, **spent** = Ink 30. (See `motif.teleportStates` in `tokens.js`.) Black holes stay pure ink — already on‑brand.

### 4.1 Math paper (menus & screens only)

**Math paper** is warm paper (`#E1D9C1`) overlaid with a faint ruled grid — minor lines every cell and a heavier line every 5 cells, like an engineer's pad.

| Property | Value |
| --- | --- |
| Cell | `40px` (5 × the 8px unit) |
| Minor line | Ink 06 (`#1A1A1A` @ 6%) |
| Major line | Ink 12, every 5 cells (`200px`) |

**Where it goes:** the **menus & screens** — game‑over, high‑scores, pause overlay, and the submit modal. **Not the gameplay canvas.** During play the background stays **clean flat paper** so obstacles and the dotted trail read clearly at speed.

- **CSS/DOM screens:** add class `.ss-mathpaper` (or use the `--ss-grid-*` vars).
- **Canvas screens (end‑game/pause drawn on the canvas):** after the `PAPER` fill, draw the two grid passes (minor, then major) *only on the game‑over / pause states*, then the frame + content on top.

---

## 5. Framed tiles & buttons

Boxed elements share **one** treatment — the motif‑tile look: a crisp `1.5px` ink border on raised paper (`Paper Tint`), hard corners, and an optional caption bar (bold label + a mono micro‑tag). Buttons follow the same system: an uppercase **Space Grotesk** label and a **Space Mono** micro‑tag separated by a hairline, lifting `2px` on hover.

- Primary → ink fill, paper label. Secondary → outline only. Signal → blue border + blue tag (reserved for the shield/active state).
- Sections, cards, modals, and the HUD panels all use `.ss-frame`; controls use `.ss-btn` (see `tokens.css`).

---

## 6. Logo

- **Wordmark:** `SPACE SWOOSH` set in Space Grotesk Bold; the double‑O of *SWOOSH* is tinted Signal Blue (the "eyes"/orbit).
- **Monogram:** the reticle with a Signal‑Blue dot at center — the ship in focus. Works as favicon / app icon at small sizes.
- Clear space ≥ the height of the monogram ring on all sides. Never place on busy backgrounds — paper or ink only.

---

## 7. Applying it to the game (next phase)

The screens currently hard‑code `#000000`, `Arial`, and `Comic Sans MS` in `Game.js` / `DrawUtils.js` and `index.html`. To bring them on‑brand:

1. Import tokens in canvas code:
   ```js
   import { color, semantic, font, scale, grid, voice } from './brand/tokens.js';
   ```
2. Paint **math paper on the screens only** (game‑over, high‑scores, pause, submit modal) — after the `PAPER` fill, draw the minor + major grid *before* the frame/content. Leave the live gameplay background as clean flat `PAPER`.
3. Replace HUD text (`Game.js render()`):
   - Distance → `font.mono` at `baseUnit * scale.hud`, tabular, with a small uppercase `KM` label.
   - Obstacles destroyed → same mono, with a `DESTROYED` micro‑label.
4. Swap `"Comic Sans MS", "Segoe Print", cursive` → `font.ui` (Space Grotesk) and retire the `sketchLine/sketchRect` wobble in favor of crisp geometric strokes + framed tiles (keep the *dotted* helpers — they're on‑brand). Buttons → the `.ss-btn` framed‑tile style.
5. Load fonts before first canvas paint (e.g. `await document.fonts.load('700 32px "Space Mono"')`), and add `tokens.css` `@import` (or a `<link>`) in `index.html`.
6. Restyle the DOM pause button and name input from `var(--ss-*)`.
7. Rewrite milestone/notification copy from `voice.milestones` (Spock).

---

## 8. Voice — Science Officer (Spock)

Logical, precise, understated. State facts and probabilities; a dry wonder ("Fascinating.") is permitted. **Never** use exclamation marks, emoji, hype, or pet names. Read every line as a science officer's log.

**Do:**
- "Fascinating."
- "Asteroid density increasing. Survival probability: 4.2%."
- "Your trajectory is illogical, yet effective."
- "Live long and prosper." *(farewell / victory)*

**Don't:** "Oops! You crashed!! 😅" · "Wanna play again buddy?" · "GREAT JOB SUPERSTAR!!!"

**Milestone log (rewritten in‑persona, mirrors `GameConfig.milestones`):**

| Distance | Line |
| --- | --- |
| 1,000 | "Atmosphere cleared. Ascent nominal." |
| 2,000 | "Complex asteroids detected. Recalculating trajectory." |
| 5,000 | "Asteroid belt ahead. Collision: probable." |
| 10,000 | "Deep space. No signs of life." |
| 25,000 | "Unknown signals. Origin: indeterminate." |
| 50,000 | "Approaching the void. Fascinating." |
