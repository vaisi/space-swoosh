// Game.js
// Core game loop + rendering: main menu, mode select, options (ship skins),
// high scores, gameplay, and game-over / level-outcome screens.
// Changes:
// - Journey lore screen (`appScreen === 'lore'`): one-time Signal Story brief
//   before the map; Continue unlocks Logbook `signalCall`.
// - Submit Signal + Android keyboard: Cap Keyboard plugin tracks IME height;
//   when the call-sign field is focused the card pins to the top with input +
//   Submit first (stats below) so Gboard never covers the field. DOM input on
//   #gameContainer, repositioned every frame. resizeOnFullScreen in capacitor
//   config works around Android edge-to-edge ignoring adjustResize.
// - Main menu: Play-button ▶/◀ icons beside the ship + ArrowLeft/Right cycle
//   owned skins via cycleMenuShip(); wide left/right tap zones for mobile.
// - Options hub: Restore Purchases replaced by Light Mode / Dark Mode toggle
//   (brand/theme.js). Choice persists in localStorage.
// - Night paper: pause wash / goal-bar rest / crash particles / name-modal dim
//   and DOM input fallbacks use token RGB (no cream or near-black literals).
// - Submit Signal modal lightened: left-aligned value→label stacks in order
//   distance → asteroids destroyed → rank with clearer vertical gaps;
//   underline call sign + brand Submit. Dropped centered blue hero chrome.
// - Crash → end screen: world fades under the blast (no blank paper flash),
//   Mission Failed crossfades in during the blast, submit modal opens only
//   after the end screen has fully settled. Journey crashes still route to
//   the level-outcome screen (not Open World game-over).
// - Open World personal best (localStorage via OpenWorldProgress) updates on
//   every finished Open World run and feeds the mode-select card footer.
// - Leaderboard: 10 rows/page (max 10 pages / 100 scores), wider taller rows,
//   🥇🥈🥉 for ranks 1–3, sharper dotted row separators (no ship–score leaders),
//   PAGE n/m arrows centered in the gap under the list; auto call-sign prompt
//   only for top 10 (manual Submit Score still available). Removed
//   drawScreenFrame chrome.
// - Leaderboard rows show "CallSign, Ship"; submits write `ship_id` from the
//   active skin.
// - Submit-score errors distinguish LeaderboardUnavailableError (missing
//   VITE_SUPABASE_* in the build) from generic network failures.
// - Phase 0+1: ?perf / ?nodraw / ?drawonly / ?kill= / ?fullvfx / ?cheap / ?dpr
//   harness (PerfMonitor). iOS cheap Canvas: DPR 1.5, hull cache, glow sprites.
//   iosDrawLod split from paint budget so sprites can restore soft VFX.
// - iOS canvas budget (fill-rate coolant only): DPR ≤ 1.5, cheap Canvas, draw
//   LOD, opaque context, hitch clamp ≤1/30 s, skip getBoundingClientRect during
//   active play — see platform.js. No paint throttle: iOS uses the same plain
//   one-update-per-paint rAF loop as Android (setTimeout+rAF / early-drop removed).
// - Journey HUD: no LEVEL chip; "current / goal KM" with a borderless track
//   (ink fill, paler rest) spaced under the figure; aligned with pause.
//   Reveal: KM → pause; points/destroyed unlock on first collect/smash.
//   KM accrues once the title clears (wait/chips) — belt opens at that same
//   moment so rocks arrive with the first readable distance, not a second later.
// - Journey levels 1–5: IntroNarration chains one-sentence beats with
//   /sounds/voice/level-N.mp3 at intro handoff; belt waits for beats + voice.
// - Run-start LevelIntroSequence (~1s fly-in + fade) for Journey and Open World;
//   steering locked until it finishes; intro milestone deferred to handoff.
// - Play mode-select blurbs pick once on enter from CopyBank modeJourney /
//   modeOpenWorld pools via goToModeSelect().
// - Journey Logbook: main-menu entry, logbook screen, toast HUD, Journey-only
//   discovery hooks via LogbookManager (observe / interact / instant).
// - Snappy pacing (all platforms): one update per paint, `tickScale = dt * 120`.
//   Ship updates before camera. Camera is a catch-up follower (cruise +
//   accelerate when the ship rides too high) so climb feels smooth, not
//   spring-sluggish. KM from abs(Δcamera.y) * (100/60).
// - HiDPI: setupCanvas renders the backing store at devicePixelRatio (capped at
//   3 on Android/desktop web / 1.5 on iOS / 2 on other Cap native) and scales
//   the context so all game math stays in CSS pixels via this.width /
//   this.height. Menu stamp is BUILD 24.
// - Options → Ship: after picking a vessel, a "Play now" button jumps straight
//   into Open World (no back → Play → mode select). Roster scrolls.
// - Options → Ship: scrollable roster (Shard / Halo / Needle / Echo added).
// - Options → Controls: Arc vs Zigzag flight style (persisted). Zigzag is the
//   default; straight ±52° lean (flatter/faster), tap/Space/arrow flips (no
//   swipe). Escape pauses in Zigzag; Space still pauses in Arc.

// - Native shell hooks: updatePauseButtonVisibility() also syncs the keep-awake
//   lock; closeNameInputModal() is shared by the modal close button and Android
//   hardware back (game/BackNavigation.js). Analytics goes through
//   services/Analytics.js instead of bare gtag (which threw when blocked).
// - Screen-header Back control: slightly wider tile + smaller labelPx so the
//   word isn't jammed against the left frame on mobile.
// - Clearing a Journey level runs a flyout (game/LevelClearSequence.js) instead of
//   holding the world for a beat: the sequence owns the `gameover` update/render
//   branches while `levelClear` is live, and drives `gameOverAlpha` itself. Input
//   is swallowed until it finishes (not skippable). `finishJourneyLevel(true)`
//   waits until the flyout enters `screenIn` so post-gate smashes and sparkle
//   collects count.
//   `renderWorld()` takes `{ hudAlpha }` so the readout can fade ahead of the
//   world, and `drawBrandButton()` accepts a `labelPx` override for buttons too
//   narrow for the default label size.
// - Journey draws a world-space finish line (dotted rule + Signal-Blue end ticks)
//   that fades in on approach and locks when the goal is crossed so the flyout
//   can pass through it.
// - Spock flavor lines (brand/CopyBank.js) are picked once on menu enter and on
//   crash / clear screens so the subtitle changes visit to visit.
// - Two play modes. Play now opens a mode select: Open World (the endless run,
//   unchanged, with the leaderboard) or Journey (finite levels off a
//   stair-with-plateaus difficulty curve). A run's length and difficulty come
//   from `this.profile` (modes/RunProfile.js), which the managers read instead of
//   reaching for `score` and the global config. Journey adds the level map and
//   the level-outcome screen (in ui/screens/), keeps its progress in
//   localStorage, and never touches the Supabase leaderboard.
// - Pause is a full screen instead of a label: Resume / Sound / Exit Run over
//   the live run stats. Exit Run is the only way to leave a run mid-flight and
//   scores nothing. Escape now toggles pause alongside Space, and the DOM pause
//   button hides while the menu is up (the menu carries its own Resume).
// - Options > Sound is a real screen driving the same persisted mute switch.
// - Ship picker is a 2-column grid (the roster grew to four ships). The
//   footnote is pinned to the bottom rule and the grid is centred in what's
//   left, so the cards fill the screen without a void beneath them. Tile
//   previews size their radius from the tile so wakes never hit the name.
// - Options is a hub (Ship / Controls / Sound). Ship keeps the picker;
//   Controls and Sound are stub sub-screens. Back stacks: sub → Options → menu.
// - Screens rebuilt on the shared ScreenKit grid: one header treatment, dotted
//   section rules, taller buttons and a two-column stat block, so menu /
//   options / leaderboard / end screens share one visual rhythm.
// - Added appScreen flow (menu / options / highscores / playing / gameover),
//   ship skin persistence, Options picker, and Menu on
//   game-over. Boots to main menu instead of straight into a run.
// - Wired WallBoopManager: ink "BOOP" popup + space-boop SFX on sidewall hits
//   (every skin, arc + zigzag).
// - Wired StyleSwooshManager: near-miss twin-obstacle threading awards style
//   points with Signal-Blue screen feedback.
// - Removed the reticle/"bullseye" badge from the Mission Failed / Complete
//   end screen — it had no gameplay meaning there and cluttered the title.
// - Re-skinned the HUD and every end screen to the "geometric minimalism" brand
//   kit (src/brand/tokens.js): clean flat paper ground, Space Mono tabular HUD
//   numerals with Space Grotesk unit labels, framed motif-tile buttons,
//   dotted-trail dividers, and Spock-voice copy.
// - Removed the math-paper grid background (flat paper everywhere) and opened up
//   the end screens with larger buttons and more generous, elegant spacing.
// - Added the points system: a `points` total driven by destroying asteroids
//   (+1) and collecting Signal-Blue sparkles (+10, via CollectibleManager). It
//   shows in the HUD (with a sparkle glyph) and on the game-over screen.

import { Capacitor } from '@capacitor/core';
import { Spacecraft } from '../entities/Spacecraft.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { Camera } from '../core/Camera.js';
import { InputHandler } from '../core/InputHandler.js';
import { MilestoneManager } from '../managers/MilestoneManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { CollectibleManager } from '../managers/CollectibleManager.js';
import { StyleSwooshManager } from '../managers/StyleSwooshManager.js';
import { WallBoopManager } from '../managers/WallBoopManager.js';
import { LogbookManager } from '../managers/LogbookManager.js';
import { LogbookToastManager } from '../managers/LogbookToastManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import {
    CallSignRejectedError,
    LeaderboardUnavailableError,
    ScoreService,
} from '../services/ScoreService.js';
import { CALL_SIGN_MAX_LEN } from '../services/NameFilter.js';
import { track } from '../services/Analytics.js';
import {
    getSkinPriceLabel,
    isSkinOwned,
    isSkinPremium,
    purchaseSkin,
} from '../services/Entitlements.js';
import { syncHighRefresh, syncKeepAwake, syncStatusBarTheme } from '../native/index.js';
import { dottedLine } from '../utils/DrawUtils.js';
import { color, font } from '../brand/tokens.js';
import { themeLabel, toggleTheme } from '../brand/theme.js';
import {
    drawPaper,
    drawFramedButton,
    drawFramedTile,
    drawSparkle,
    setLabelType,
    setMonoType,
    setDisplayType,
    resetType,
} from '../utils/BrandDraw.js';
import {
    SHIP_SKIN_LIST,
    drawSkinPreview,
    getSkin,
    loadShipSkinId,
    saveShipSkinId,
} from '../ships/skins.js';
import {
    screenLayout,
    fitPx,
    wrapLines,
    drawDivider,
} from '../ui/ScreenKit.js';
import { createRunProfile, PLAY_MODE } from '../modes/index.js';
import {
    clampLevel,
    evaluateStars,
    getLevel,
    TOTAL_LEVELS,
} from '../config/JourneyConfig.js';
import {
    loadJourneyProgress,
    nextPlayableLevel,
    recordLevelResult,
} from '../services/JourneyProgress.js';
import {
    loadOpenWorldProgress,
    recordOpenWorldScore,
} from '../services/OpenWorldProgress.js';
import {
    renderModeSelect,
    handleModeSelectClick,
} from '../ui/screens/ModeSelectScreen.js';
import {
    renderLoreScreen,
    handleLoreScreenClick,
} from '../ui/screens/LoreScreen.js';
import {
    renderJourneyMap,
    handleJourneyMapClick,
} from '../ui/screens/JourneyMapScreen.js';
import {
    renderLevelOutcome,
    handleLevelOutcomeClick,
} from '../ui/screens/LevelOutcomeScreen.js';
import {
    renderLogbook,
    handleLogbookClick,
    clampLogbookScroll,
} from '../ui/screens/LogbookScreen.js';
import { LevelClearSequence } from './LevelClearSequence.js';
import { LevelIntroSequence } from './LevelIntroSequence.js';
import { clamp01 } from '../utils/math.js';
import { pickCopy, journeyFlavorPool } from '../brand/CopyBank.js';
import {
    FLIGHT_STYLE,
    loadFlightStyle,
    saveFlightStyle,
} from '../config/flightStyle.js';
import {
    canvasMaxDpr,
    needsIosCanvasBudget,
    preferOpaqueCanvas,
} from '../core/platform.js';
import { parsePerfFlags, isKilled } from '../core/perfFlags.js';
import { PerfMonitor } from '../core/PerfMonitor.js';
import { clearHullCache } from '../ships/HullCache.js';

export class Game {
    constructor(config) {
        console.log('Game initializing...'); // Debug log
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        // Opaque buffer when we always paint paper first — native + iOS Safari
        // skip alpha compositing. Android/desktop web keep the default context.
        const ctxOpts = preferOpaqueCanvas() ? { alpha: false } : undefined;
        this.ctx = this.canvas.getContext('2d', ctxOpts);
        this.baseUnit = 0;
        this.score = 0;
        this.points = 0; // Points system: +1 per asteroid destroyed, +10 per collectible
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.explosionParticles = [];
        this.gameOverScreen = 'main'; // nested: 'main' or 'highscores' while appScreen is gameover
        // menu | modeSelect | journeyMap | logbook | options | optionsShip |
        // optionsControls | optionsSound | highscores | playing | gameover
        this.appScreen = 'menu';
        this.menuFlavor = pickCopy('menu');
        this.modeJourneyBlurb = pickCopy('modeJourney');
        this.modeOpenWorldBlurb = pickCopy('modeOpenWorld');
        this.endFlavor = null; // Open World game-over subtitle
        this.highScoresReturnScreen = 'menu';
        this.shipSkinId = loadShipSkinId();
        this.flightStyle = loadFlightStyle();
        this.menuButtons = {};
        this.optionsButtons = {};
        this.optionsHubButtons = {};
        this.pauseButtons = {};
        this.modeSelectButtons = null;
        this.journeyMapButtons = null;
        this.levelOutcomeButtons = null;
        this.logbookButtons = null;
        this.logbookCategory = 'obstacles';
        this.logbookScroll = 0;
        this.frameCount = 0;
        // Short status line on Options → Ship / hub after a purchase or restore.
        this.purchaseStatus = null;
        this.purchaseBusy = false;
        this.isPaused = false;
        this.pauseBlur = 10; // Blur amount when paused
        this.TOTAL_DISTANCE = 50000; // Total distance to win
        this.hasWon = false; // Track if player has won
        this.lastTime = performance.now();
        this.accumulatedTime = 0; // Track time between pauses
        // Snappy reference: classic paint-ticks per second (BUILD 16 web @ ~120Hz).
        this.snappyHz = 120;
        this.tickScale = 1; // classic paint-ticks covered this frame
        this.dt = 1 / 60; // motion dt for obstacle `* dt` paths (= tick/60)
        // Phase 0 / Phase 1 flags (URL query). Cheap Canvas defaults on for iOS.
        this.perfFlags = parsePerfFlags();
        this.perfMonitor = this.perfFlags.perf ? new PerfMonitor() : null;
        // iOS (Safari + Capicitor WKWebView): Canvas2D heat comes from retina
        // fill-rate + path VFX, not from the rAF scheduler. Budget pixels/VFX
        // (DPR/cheap/LOD); keep the same one-update-per-paint rAF loop as Android.
        this.iosCanvasBudget = needsIosCanvasBudget();
        this.cheapCanvas = this.perfFlags.cheap ?? this.iosCanvasBudget;
        this.useHullCache = this.cheapCanvas;
        this.useGlowSprites = this.cheapCanvas;
        // Draw LOD (short trails, no path-radials, soft-cap) — off with ?fullvfx=1.
        this.iosDrawLod = this.iosCanvasBudget && !this.perfFlags.fullVfx;
        if (this.perfMonitor) {
            const bits = [
                this.cheapCanvas ? 'cheap' : 'full2d',
                this.iosDrawLod ? 'lod' : 'nolod',
                this.perfFlags.noDraw ? 'nodraw' : '',
                this.perfFlags.drawOnly ? 'drawonly' : '',
                [...this.perfFlags.kill].join('+'),
            ].filter(Boolean);
            this.perfMonitor.setModeLabel(bits.join(' '));
        }
        this.obstaclesDestroyed = 0; // Shield-smash count; Journey's third star
        this.scoreSubmitted = false; // Track if score has been submitted
        // Set by native/index.js Keyboard listeners (CSS px). 0 on web.
        this.softKeyboardHeight = 0;
        this.highScoreTab = 'distance'; // Add tab state
        this.highScorePage = 0; // 0-based page index (10 scores per page)

        // Journey state. Progress is local-only; the leaderboard stays Open World.
        this.journeyProgress = loadJourneyProgress();
        this.journeyLevel = nextPlayableLevel(this.journeyProgress);
        this.openWorldProgress = loadOpenWorldProgress();
        this.journeyMapScroll = 0;
        this.shipPickerScroll = 0;
        // Ship picker: reveal Play now after the player taps a vessel.
        this.shipPickerOfferPlay = false;
        this.journeyMapNeedsScroll = true;
        this.levelOutcome = null;
        this.runOutcome = null; // 'crashed' | 'completed' while on the end screen
        this.levelClear = null; // the flyout cinematic, while it's running
        this.levelIntro = null; // short run-start fly-in, while it's running
        this.pendingIntroMessage = null; // legacy single-line handoff
        this.pendingIntroBeats = null; // string[] shown when intro hands off
        this.introNarration = null; // sentence beats + voice while title phase
        // Post-intro HUD reveal: 'title' | 'wait' | 'chips' | null (done).
        this.hudRevealPhase = null;
        this.hudRevealStart = null; // performance.now() when chip fades begin
        this.hudRevealWaitStart = null;
        this.hudPointsRevealStart = null; // first sparkle collect → fade POINTS in
        this.hudDestroyedRevealStart = null; // first smash → fade DESTROYED in
        this.finishLineWorldY = null; // locked when a Journey goal is crossed

        this.setupCanvas();
        // The managers read `profile` as they're built, so the run's rules have to
        // exist before the world does.
        this.playMode = PLAY_MODE.openWorld;
        this.profile = createRunProfile(this, this.playMode);
        this.initializeGame();
        
        window.addEventListener('resize', () => this.setupCanvas());
        // Soft keyboard: adjustResize changes container size (rebuild canvas);
        // adjustPan only changes visualViewport inset — the Submit Signal modal
        // reads that every frame, so skip setupCanvas unless CSS size moved.
        if (window.visualViewport) {
            const onViewportChange = () => {
                const container = this.canvas?.parentElement;
                if (!container) return;
                if (
                    container.clientWidth !== this.width ||
                    container.clientHeight !== this.height
                ) {
                    this.setupCanvas();
                }
            };
            window.visualViewport.addEventListener('resize', onViewportChange);
            window.visualViewport.addEventListener('scroll', onViewportChange);
        }
        this.setupEventListeners();
        this.powerUpManager = new PowerUpManager(this);
        this.collectibleManager = new CollectibleManager(this);
        this.styleSwooshManager = new StyleSwooshManager(this);
        this.wallBoopManager = new WallBoopManager(this);
        this.soundManager = new SoundManager();
        this.soundInitialized = false;
        // Logbook persists across runs; discoveries only write in Journey.
        this.logbook = new LogbookManager(this);
        this.logbookToast = new LogbookToastManager(this);
        
        // Initialize sound on first user interaction
        const initSound = async () => {
            if (this.soundInitialized) return;
            
            console.log('Initializing sound...');
            await this.soundManager.initialize();
            this.soundInitialized = true;
            
            // Remove listeners after first interaction
            window.removeEventListener('click', initSound);
            window.removeEventListener('touchstart', initSound);
            window.removeEventListener('keydown', initSound);
        };

        // Add event listeners for user interaction
        window.addEventListener('click', initSound);
        window.addEventListener('touchstart', initSound);
        window.addEventListener('keydown', initSound);
        
        // Add pause button
        this.setupPauseButton();
        this.setupMenuShipKeys();

        this.loadHighScores();

        // Add visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause only during an active run
                if (this.appScreen === 'playing' && !this.isGameOver && !this.isPaused) {
                    this.togglePause();
                    this.wasAutoPaused = true;
                }
            } else if (this.wasAutoPaused) {
                this.togglePause();
                this.wasAutoPaused = false;
            }
            if (!document.hidden) {
                // Coming back from a hidden tab: the elapsed gap is not a
                // frame. Without this, one huge (clamped) delta enters the
                // frame EMA and motion wobbles for ~20 frames after resume.
                this.resetFramePacing();
            }
        });

        // Idle-governor input tracking: any interaction lifts the menu 30 Hz
        // cap for the next ~half second. Capture phase + passive so nothing
        // downstream is affected; events fire before rAF, so the very next
        // paint after a tap is always full-rate.
        const noteInteraction = () => { this.lastInteractionAt = performance.now(); };
        for (const type of ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'keydown']) {
            window.addEventListener(type, noteInteraction, { capture: true, passive: true });
        }
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        // Logical (CSS) size — all game math and hit-testing stay in these units.
        const cssWidth = container.clientWidth;
        const cssHeight = container.clientHeight;
        // iOS ≤1.5 (Phase 1); other Cap ≤2; Android/desktop web ≤3. ?dpr= overrides.
        const maxDpr = this.perfFlags?.dprOverride ?? canvasMaxDpr();
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

        this.width = cssWidth;
        this.height = cssHeight;
        this.dpr = dpr;

        // Backing store in device pixels so ink edges stay sharp on retina.
        // Setting width/height resets the context, so the transform must follow.
        this.canvas.width = Math.round(cssWidth * dpr);
        this.canvas.height = Math.round(cssHeight * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const isMobile = window.innerWidth <= 768;
        this.baseUnit = isMobile
            ? Math.min(cssWidth / 45, cssHeight / 75)
            : cssWidth / 50;

        if (this.spacecraft) {
            this.spacecraft.radius = this.baseUnit;
        }
        // Hull bitmaps are sized to radius — drop them when the layout unit changes.
        clearHullCache();
    }

    // Re-assert the HiDPI transform each frame. Assigning canvas.width resets
    // the CTM; nothing else should, but one call per frame is cheap insurance.
    ensureHiDpiTransform() {
        const dpr = this.dpr || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    initializeGame() {
        console.log('Initializing game components...'); // Debug log
        this.camera = new Camera(this);
        this.spacecraft = new Spacecraft(this);
        this.obstacleManager = new ObstacleManager(this);
        this.inputHandler = new InputHandler(this);
        this.milestoneManager = new MilestoneManager(this);
    }

    start() {
        this.showMenu();
        this.gameLoop();
    }

    // Land on the main menu with a fresh Spock line.
    showMenu() {
        this.appScreen = 'menu';
        this.menuFlavor = pickCopy('menu');
        this.updatePauseButtonVisibility();
    }

    isPlaying() {
        return this.appScreen === 'playing' && !this.isGameOver;
    }

    // All platforms: vsync-aligned one-update-per-paint. iOS heat is governed
    // by the canvas budget (DPR/cheap/LOD), not by pacing the scheduler.
    // Pass the rAF timestamp through so frame timing is the vsync clock, not
    // whenever the callback happened to run.
    scheduleNextFrame() {
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    // Frame pacing has per-screen state (the delta EMA). Reset it at screen
    // changes and on tab return so a stale smoothed delta can never bleed
    // into a fresh run as a speed transient.
    resetFramePacing(now = performance.now()) {
        this.lastTime = now;
        this.smoothFrame = null;
        this.hitchRun = 0;
    }

    gameLoop(ts) {
        // Only run the game loop if the tab is visible
        if (!document.hidden) {
            // Use the rAF-provided vsync timestamp, not performance.now() read
            // here: a tap's event handling delays *when* this callback runs, and
            // reading the clock inside fed that delay straight into tickScale —
            // one long frame that visibly sped up obstacle spin. The rAF
            // timestamp is fixed by the frame's vsync, so the tap can't move it.
            const currentTime = ts ?? performance.now();

            // Screen change: pacing state from the old screen must not seed
            // the new one's motion (menu cadence differs from run cadence).
            if (this.pacedScreen !== this.appScreen) {
                this.pacedScreen = this.appScreen;
                this.resetFramePacing(currentTime);
            }

            // Idle governor: non-gameplay screens repaint at ~30 Hz once the
            // player stops interacting. Menus animate gently (ship preview),
            // so this is invisible — but it halves fill-rate and CPU while
            // people sit on menus, which keeps the phone cool. On iPhone,
            // heat is what eventually throttles mid-run smoothness, so the
            // cheapest butter for the run is not spending it on the menu.
            // Any input lifts the cap instantly (the event fires before rAF),
            // so taps and scroll-drags always see full refresh.
            if (!this.perfFlags?.noGovernor
                && this.appScreen !== 'playing' && this.appScreen !== 'gameover') {
                const idleMs = currentTime - (this.lastInteractionAt ?? 0);
                const sinceDraw = currentTime - (this.lastGovernedDraw ?? 0);
                if (idleMs > 450 && sinceDraw < 30) {
                    // Skip this paint. Leave lastTime alone so the next worked
                    // frame sees the true elapsed time (motion stays correct).
                    this.scheduleNextFrame();
                    return;
                }
                this.lastGovernedDraw = currentTime;
            }

            const elapsedMs = currentTime - this.lastTime;

            const flags = this.perfFlags;
            const skipUpdate = flags.drawOnly;
            const skipDraw = flags.noDraw;

            if (!skipUpdate && (!this.isPaused || this.appScreen !== 'playing')) {
                // One update per paint — smooth with the display. tickScale maps
                // wall time onto the snappy ~120 Hz classic-tick reference.
                // iOS hitch clamp 1/30 s (tickScale ≤ ~4); others keep 50 ms.
                const maxFrame = this.iosCanvasBudget ? 1 / 30 : 0.05;
                const rawFrame = Math.min(elapsedMs / 1000, maxFrame);
                this.lastTime = currentTime;
                // Smooth uneven frame pacing: phones deliver frames at irregular
                // intervals (perf overlay showed a mix of ~8 and ~16 ms), and
                // time-scaled motion turns that unevenness into camera/scroll/spin
                // jerk. A low-pass on the delta gives a near-constant advance per
                // frame (smooth to the eye) while preserving average speed — the
                // filter has unity DC gain, so there's no long-term drift. Steady
                // high-refresh displays (desktop) are already even, so this is a
                // near no-op there. FRAME_SMOOTH: higher = snappier/less filtered.
                const FRAME_SMOOTH = 0.18;
                // Seed guard: the frame right after a pacing reset has ~0
                // elapsed; seeding the filter with it would play several
                // slow-motion frames while it climbs back. Seed 60 Hz instead.
                if (this.smoothFrame == null) {
                    this.smoothFrame = rawFrame > 0.002 ? rawFrame : 1 / 60;
                }
                // Hitch passthrough: the EMA is right for cadence jitter
                // (8/16 ms alternation stays well under the ratio), but wrong
                // for a single long frame — a tap's event work, a GC pause.
                // Filtering a hitch under-simulates it and then pays the time
                // back over the next ~8 frames: a speed wobble felt exactly
                // when tapping. Instead, simulate a genuine hitch frame at its
                // true elapsed time (the world stays glued to the clock — it
                // reads as one momentary frame drop, like an unfiltered
                // desktop) and keep it out of the filter so the following
                // frames aren't smeared. A sustained slowdown (thermal
                // throttle, Low Power Mode) shows up as a long passthrough
                // run; reseed the filter at the new cadence — motion was
                // clock-true the whole way, so the handoff is seamless.
                const HITCH_RATIO = 1.75;
                let frameTime;
                // Symmetric: a suddenly-short frame is the display stepping
                // *up* (VRR phones bounce 60↔120 around sparse taps);
                // filtering it keeps simulating the old longer delta for ~a
                // dozen frames — a slight fast-forward on tap resume. Treat
                // it like the slow side: run clock-true, don't feed the EMA.
                if (!this.perfFlags?.noHitchPass
                    && (rawFrame > this.smoothFrame * HITCH_RATIO
                        || rawFrame < this.smoothFrame / HITCH_RATIO)) {
                    frameTime = rawFrame;
                    this.hitchRun = (this.hitchRun ?? 0) + 1;
                    if (this.hitchRun >= 30) {
                        this.smoothFrame = rawFrame;
                        this.hitchRun = 0;
                    }
                } else {
                    this.hitchRun = 0;
                    this.smoothFrame += (rawFrame - this.smoothFrame) * FRAME_SMOOTH;
                    frameTime = this.smoothFrame;
                }
                this.tickScale = frameTime * this.snappyHz;
                this.dt = (1 / 60) * this.tickScale;
                this.update(frameTime);
            } else {
                this.lastTime = currentTime;
                if (skipUpdate) {
                    // Keep motion dt sane if anything reads it during draw-only.
                    this.tickScale = (1 / 60) * this.snappyHz;
                    this.dt = 1 / 60;
                }
            }

            if (!skipDraw) {
                this.render();
            } else {
                // Empty-draw: still clear paper so the screen isn't stale garbage.
                this.ensureHiDpiTransform();
                drawPaper(this.ctx, this.width, this.height);
            }

            if (this.perfMonitor) {
                this.perfMonitor.sample(elapsedMs);
                this.perfMonitor.tickOverlay(
                    `dpr=${(this.dpr || 1).toFixed(2)} hull=${this.useHullCache ? 1 : 0} glow=${this.useGlowSprites ? 1 : 0}`
                );
            }
        }
        this.scheduleNextFrame();
    }

    update(deltaTime) {
        const currentTime = performance.now();

        if (this.appScreen === 'gameover' && this.isGameOver) {
            // A cleared level flies out instead of exploding, and the sequence
            // owns everything that moves — including the screen's fade-in.
            if (this.levelClear) {
                this.frameCount++;
                this.levelClear.update(deltaTime);
                this.logbookToast?.update();
                this.logbook?.flushToast?.();
                return;
            }

            const timeSinceGameOver = currentTime - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;
            
            if (timeSinceGameOver < deceleration) {
                const slowdownFactor = 1 - (timeSinceGameOver / deceleration);
                this.camera.update(slowdownFactor);
            }
            this.updateExplosion();
            return;
        }

        if (this.appScreen === 'playing' && !this.isPaused && !this.isGameOver) {
            this.frameCount++;

            // Run-start cinematic owns motion until it hands off control.
            if (this.levelIntro?.active) {
                this.levelIntro.update(deltaTime);
                this.milestoneManager.update();
                this.logbookToast?.update();
                this.logbook?.flushToast?.();
                // Keep pause suppressed every frame (no flash if something else
                // touched the DOM button).
                this.updatePauseButtonVisibility();
                return;
            }

            // Ship first so the catch-up camera reacts to this frame's lead.
            this.spacecraft.update();
            const prevCameraY = this.camera.y;
            this.camera.update(1);

            // KM once the title is gone (wait/chips). Title beat stays uncounted;
            // belt opens in the same handoff so action matches the readout.
            const kmLive = this.hudRevealPhase == null
                || this.hudRevealPhase === 'wait'
                || this.hudRevealPhase === 'chips';
            if (kmLive) {
                this.score += Math.abs(this.camera.y - prevCameraY) * (100 / 60);
            }

            this.obstacleManager.update();
            this.milestoneManager.update();
            this.powerUpManager.update();
            this.collectibleManager.update();
            this.styleSwooshManager.update();
            this.wallBoopManager.update();
            this.logbook?.scanFinishGateVisible?.();
            this.logbookToast?.update();
            this.logbook?.flushToast?.();
            this.advanceHudReveal();

            if (this.profile.isRunComplete(this.score)) {
                this.completeRun();
            }
        }
    }

    // Title alone → as soon as it clears, open the belt and start chip fades.
    advanceHudReveal() {
        if (!this.hudRevealPhase) return;

        if (this.hudRevealPhase === 'title') {
            if (this.introNarration) {
                if (this.introNarration.update()) {
                    this.introNarration.dispose();
                    this.introNarration = null;
                    this.beginHudChipsAndBelt();
                }
            } else if (!this.milestoneManager?.currentMessage) {
                this.beginHudChipsAndBelt();
            }
            this.updatePauseButtonVisibility();
            return;
        }

        if (this.hudRevealPhase === 'wait') {
            // No-title runs (e.g. Open World): short calm, then same handoff.
            if (performance.now() - (this.hudRevealWaitStart ?? 0) >= 200) {
                this.beginHudChipsAndBelt();
            }
            this.updatePauseButtonVisibility();
            return;
        }

        if (this.hudRevealPhase === 'chips') {
            this.updatePauseButtonVisibility();
        }
    }

    /** Title/wait done — distance chips fade in and obstacle rows may spawn. */
    beginHudChipsAndBelt() {
        this.hudRevealPhase = 'chips';
        this.hudRevealStart = performance.now();
        this.hudRevealWaitStart = null;
        if (this.obstacleManager) {
            this.obstacleManager.pauseSpawning = false;
            this.obstacleManager.nextSpawnY = this.camera.y;
            this.obstacleManager._beltArmed = false;
        }
    }

    isJourney() {
        return this.playMode === PLAY_MODE.journey;
    }

    render() {
        this.ensureHiDpiTransform();
        drawPaper(this.ctx, this.width, this.height);

        if (this.appScreen === 'menu') {
            this.renderMainMenu();
            return;
        }
        if (this.appScreen === 'modeSelect') {
            this.modeSelectButtons = renderModeSelect(this);
            return;
        }
        if (this.appScreen === 'lore') {
            this.loreScreenButtons = renderLoreScreen(this);
            return;
        }
        if (this.appScreen === 'journeyMap') {
            this.journeyMapButtons = renderJourneyMap(this);
            // Scrolling needs the laid-out list, which only exists once it has
            // been drawn — so the jump to the current level happens here.
            if (this.journeyMapNeedsScroll) {
                this.journeyMapNeedsScroll = false;
                this.scrollJourneyMapToLevel();
            }
            return;
        }
        if (this.appScreen === 'logbook') {
            this.logbookButtons = renderLogbook(this);
            return;
        }
        if (this.appScreen === 'options') {
            this.renderOptionsHub();
            return;
        }
        if (this.appScreen === 'optionsShip') {
            this.renderOptionsShip();
            return;
        }
        if (this.appScreen === 'optionsControls') {
            this.renderOptionsControls();
            return;
        }
        if (this.appScreen === 'optionsSound') {
            this.renderOptionsSound();
            return;
        }
        if (this.appScreen === 'highscores') {
            this.renderHighScores();
            return;
        }

        if (this.appScreen === 'gameover' || this.isGameOver) {
            const timeSinceGameOver = performance.now() - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;

            // Clearing a level has no explosion to wait out: the flyout keeps the
            // world on screen and fades it out from under the outcome screen.
            const clear = this.levelClear;
            if (clear?.worldAlpha > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = clear.worldAlpha;
                this.renderWorld({ hudAlpha: clear.hudAlpha });
                this.ctx.restore();
                if (this.gameOverAlpha <= 0) return;
            }

            // Crash: keep the world under the blast (fading), then crossfade the
            // end screen — no blank-paper gap between explosion and Mission Failed.
            if (this.runOutcome === 'crashed') {
                const blastT = Math.min(1, timeSinceGameOver / deceleration);
                const worldAlpha = Math.max(0, 1 - blastT * 1.2);
                if (worldAlpha > 0.02) {
                    this.ctx.save();
                    this.ctx.globalAlpha = worldAlpha;
                    this.renderWorld({ hudAlpha: worldAlpha });
                    this.ctx.restore();
                }

                if (timeSinceGameOver < deceleration) {
                    for (const particle of this.explosionParticles) {
                        this.ctx.fillStyle = `rgba(${color.inkRgb}, ${particle.opacity})`;
                        this.ctx.beginPath();
                        this.ctx.arc(
                            particle.x,
                            this.camera.getRelativeY(particle.y),
                            particle.size,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                    }
                }

                if (this.gameOverAlpha > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = Math.max(0, Math.min(1, this.gameOverAlpha));
                    if (this.isJourney()) {
                        this.levelOutcomeButtons = renderLevelOutcome(this);
                    } else if (this.gameOverScreen === 'highscores') {
                        this.renderHighScores();
                    } else {
                        this.renderMainGameOver();
                    }
                    this.ctx.restore();
                }
                return;
            }

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, Math.min(1, this.gameOverAlpha));
            if (this.isJourney()) {
                this.levelOutcomeButtons = renderLevelOutcome(this);
            } else if (this.gameOverScreen === 'highscores') {
                this.renderHighScores();
            } else {
                this.renderMainGameOver();
            }
            this.ctx.restore();
            return;
        }

        if (this.levelIntro?.active) {
            this.ctx.save();
            this.ctx.globalAlpha = this.levelIntro.worldAlpha;
            this.renderWorld({ hudAlpha: this.levelIntro.hudAlpha });
            this.ctx.restore();
        } else {
            this.renderWorld();
        }

        if (this.isPaused) {
            this.renderPauseOverlay();
        }
    }

    // The run itself: obstacles, ship, pickups, effects and the HUD. Split out so
    // the level-clear flyout can keep showing it after gameplay has stopped —
    // where the HUD fades ahead of the world, hence `hudAlpha`.
    renderWorld({ hudAlpha = 1 } = {}) {
        const flags = this.perfFlags;
        if (!isKilled(flags, 'obstacles')) {
            this.obstacleManager.render(this.ctx);
        }

        // Draw under the ship so crossing the goal reads as flying through it.
        this.renderFinishLine();

        if (this.spacecraft.isVisible) {
            this.spacecraft.render(this.ctx, {
                skipTrail: isKilled(flags, 'trails'),
                skipHull: isKilled(flags, 'hulls'),
            });
        }

        this.milestoneManager.render(this.ctx);
        this.powerUpManager.render(this.ctx);
        this.collectibleManager.render(this.ctx);
        this.styleSwooshManager.render(this.ctx);
        this.wallBoopManager.render(this.ctx);

        if (hudAlpha <= 0) return;
        if (isKilled(flags, 'hud')) return;
        this.ctx.save();
        this.ctx.globalAlpha *= hudAlpha;
        this.renderHud();
        this.logbookToast?.render(this.ctx);
        this.ctx.restore();
    }

    // Journey's finish line: a dotted rule with Signal-Blue end ticks that lives
    // in world space ahead of the ship and fades in as you approach. Locked in
    // place the moment the goal is crossed so the flyout can pass through it.
    //
    // Score rises by |camera.velocity| * dt * 100 while the camera advances by
    // roughly that velocity each frame at 60fps, so 1 km ≈ 0.6 world units.
    renderFinishLine() {
        if (this.profile.isEndless) return;

        const SCORE_TO_WORLD = 0.6;
        let worldY = this.finishLineWorldY;
        if (worldY == null) {
            const remaining = Math.max(0, this.profile.goalScore - this.score);
            // Don't bother until it's within a couple of screens — far-away
            // geometry just costs a draw for nothing you can see.
            if (remaining * SCORE_TO_WORLD > this.height * 2.2) return;
            worldY = this.spacecraft.y - remaining * SCORE_TO_WORLD;
        }

        const screenY = this.camera.getRelativeY(worldY);
        if (screenY < -this.baseUnit * 4 || screenY > this.height + this.baseUnit * 2) {
            return;
        }

        const ctx = this.ctx;
        const unit = this.baseUnit;
        const margin = unit * 2.4;
        const left = margin;
        const right = this.width - margin;

        // Fade in over the last screen-and-a-half of approach.
        const approach = clamp01(1 - screenY / (this.height * 1.35));
        const alpha = 0.35 + approach * 0.65;

        ctx.save();
        ctx.globalAlpha *= alpha;

        dottedLine(ctx, left, right, screenY, 1.6, 7, color.ink30);

        // Soft Signal-Blue ticks at the ends — the only colour, so the line reads
        // as a destination rather than another hazard.
        ctx.fillStyle = color.signal;
        const tick = unit * 0.55;
        ctx.beginPath();
        ctx.arc(left, screenY, tick * 0.55, 0, Math.PI * 2);
        ctx.arc(right, screenY, tick * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Called when a sparkle is collected — unlocks the POINTS HUD row.
    noteHudPointsFromCollect() {
        if (this.levelIntro?.active) return;
        if (this.hudRevealPhase === 'title' || this.hudRevealPhase === 'wait') return;
        if (this.hudPointsRevealStart == null) {
            this.hudPointsRevealStart = performance.now();
        }
    }

    // Called on the first scored asteroid smash — unlocks the DESTROYED row.
    noteHudDestroyedFromSmash() {
        if (this.levelIntro?.active) return;
        if (this.hudRevealPhase === 'title' || this.hudRevealPhase === 'wait') return;
        if (this.hudDestroyedRevealStart == null) {
            this.hudDestroyedRevealStart = performance.now();
        }
    }

    // Staggered post-intro HUD fade (after the centre title has cleared).
    // Timed: KM → pause. Points / Destroyed fade in only after first collect /
    // smash. Title/wait keeps everything at 0.
    hudRevealAlpha(slot) {
        if (this.hudRevealPhase === 'title' || this.hudRevealPhase === 'wait') {
            return 0;
        }

        const fade = 1000;
        const ease = (t) => {
            const c = clamp01(t);
            return 1 - (1 - c) * (1 - c);
        };
        const now = performance.now();

        if (slot === 'points') {
            if (this.hudPointsRevealStart == null) return 0;
            return ease((now - this.hudPointsRevealStart) / fade);
        }
        if (slot === 'destroyed') {
            if (this.hudDestroyedRevealStart == null) return 0;
            return ease((now - this.hudDestroyedRevealStart) / fade);
        }

        // Reveal finished — distance / pause stay fully on.
        if (this.hudRevealPhase == null || this.hudRevealStart == null) {
            return 1;
        }

        // Slot times: 0–1 reserved (old points/destroyed), then distance, pause.
        const at = slot === 'distance' ? 2 * fade
            : slot === 'pause' ? 3 * fade
            : 0;
        if (slot !== 'distance' && slot !== 'pause') {
            return 1;
        }

        const elapsed = now - this.hudRevealStart;
        const alpha = ease((elapsed - at) / fade);

        const lastAt = 3 * fade;
        if (elapsed >= lastAt + fade + 80) {
            this.hudRevealPhase = null;
            this.hudRevealStart = null;
            this.hudRevealWaitStart = null;
            return 1;
        }
        return alpha;
    }

    // Gameplay HUD — Space Mono tabular numerals with small uppercase Space
    // Grotesk unit/label chips. Compact top-left block aligned with pause.
    renderHud() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const inset = unit * 2;
        const journey = !this.profile.isEndless;

        const pointsA = this.hudRevealAlpha('points');
        const destroyedA = this.hudRevealAlpha('destroyed');
        const distanceA = this.hudRevealAlpha('distance');

        // Match the DOM pause control (top 16 / height 48) so left and right
        // read as one header row.
        const pauseTop = 16;
        const pauseH = 48;
        const numSize = unit * 1.9;
        const distY = pauseTop + pauseH * 0.62;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = color.ink;

        let goalBarH = 0;
        if (distanceA > 0.01) {
            ctx.save();
            ctx.globalAlpha *= distanceA;

            const curStr = ScoreService.formatScore(this.score);
            const unitSize = Math.max(9, unit * 0.82);

            if (journey) {
                // Bold current + tight, small "/goal KM" so the line sits on
                // the progress track instead of spilling past it.
                const goalStr = ScoreService.formatScore(this.profile.goalScore);
                setMonoType(ctx, numSize);
                ctx.fillStyle = color.ink;
                ctx.fillText(curStr, inset, distY);
                let x = inset + ctx.measureText(curStr).width;

                const goalPx = Math.max(8.5, numSize * 0.46);
                setMonoType(ctx, goalPx, 400);
                ctx.fillStyle = color.ink55;
                const mid = `/${goalStr}`;
                const midGap = unit * 0.12;
                ctx.fillText(mid, x + midGap, distY);
                x += midGap + ctx.measureText(mid).width;

                setLabelType(ctx, Math.max(7.5, goalPx * 0.9));
                ctx.fillStyle = color.ink55;
                const kmGap = unit * 0.1;
                ctx.fillText('KM', x + kmGap, distY);
                x += kmGap + ctx.measureText('KM').width;

                const barW = Math.min(
                    Math.max(x - inset, unit * 8),
                    this.width - inset * 2,
                );
                goalBarH = unit * 1.15;
                this.drawGoalBar(inset, distY + unit * 0.8, barW);
            } else {
                setMonoType(ctx, numSize);
                ctx.fillStyle = color.ink;
                ctx.fillText(curStr, inset, distY);
                const distW = ctx.measureText(curStr).width;
                setLabelType(ctx, unitSize);
                ctx.fillStyle = color.ink55;
                ctx.fillText('KM', inset + distW + unit * 0.55, distY);
            }

            ctx.restore();
        } else if (journey) {
            goalBarH = unit * 1.15;
        }

        // Obstacles destroyed — in Journey, also the smash-star mission target.
        const rowY = distY + goalBarH + unit * 1.55;
        const lblSize = Math.max(9, unit * 0.8);
        if (destroyedA > 0.01) {
            ctx.save();
            ctx.globalAlpha *= destroyedA;
            setLabelType(ctx, lblSize);
            ctx.fillStyle = color.ink55;
            ctx.fillText('DESTROYED', inset, rowY);
            const lblW = ctx.measureText('DESTROYED').width;

            setMonoType(ctx, unit * 1.35);
            ctx.fillStyle = color.ink;
            const destroyedStr = journey && this.profile.smashTarget
                ? `${this.obstaclesDestroyed} / ${this.profile.smashTarget}`
                : `${this.obstaclesDestroyed}`;
            ctx.fillText(destroyedStr, inset + lblW + unit * 0.9, rowY);
            ctx.restore();
        }

        // Points — the reward metric. A small Signal-Blue sparkle marks the row,
        // then a POINTS label + mono figure (matching the DESTROYED row above).
        const ptsRowY = rowY + unit * 1.8;
        if (pointsA > 0.01) {
            ctx.save();
            ctx.globalAlpha *= pointsA;
            const spR = unit * 0.55;
            drawSparkle(ctx, inset + spR, ptsRowY - lblSize * 0.35, spR, { fill: color.signal });

            setLabelType(ctx, lblSize);
            ctx.fillStyle = color.ink55;
            const ptsLblX = inset + spR * 2 + unit * 0.7;
            ctx.fillText('POINTS', ptsLblX, ptsRowY);
            const ptsLblW = ctx.measureText('POINTS').width;

            setMonoType(ctx, unit * 1.35);
            ctx.fillStyle = color.ink;
            ctx.fillText(`${this.points}`, ptsLblX + ptsLblW + unit * 0.9, ptsRowY);
            ctx.restore();
        }

        resetType(ctx);
        ctx.restore();
    }

    // Journey progress track: soft fill only — no stroke, no GOAL caption.
    // Goal distance lives in the "current / goal KM" line above.
    drawGoalBar(x, y, width) {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const height = unit * 0.32;
        const filled = width * this.profile.progress(this.score);

        ctx.save();
        // Pale rest of the track; done portion in full ink.
        ctx.fillStyle = color.ink06;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = color.ink;
        ctx.fillRect(x, y, Math.max(0, filled), height);
        ctx.restore();
    }

    // Pause state — a soft paper wash, the two-bar pause motif, and the
    // MISSION PAUSED micro-label. All geometry, no wobble.
    // Pause is a real screen, not just a label: it is the only way out of a run
    // mid-flight, so it carries Resume / Sound / Exit next to the live stats.
    // Bands: glyph + title, run stats, actions — same rhythm as game over.
    renderPauseOverlay() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        ctx.save();
        ctx.fillStyle = `rgba(${color.paperRgb}, 0.92)`;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();

        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 5.6 : unit * 5;
        const buttonGap = unit * 1.5;
        const buttonsH = buttonHeight * 3 + buttonGap * 2;

        const barW = unit * 0.9;
        const barH = unit * 3.2;
        const glyphGap = unit * 0.9;
        const titlePx = L.isMobile ? Math.min(unit * 2.8, 32) : unit * 2.6;
        const statValuePx = L.isMobile ? Math.min(unit * 2, 23) : unit * 1.9;
        const statLabelPx = Math.max(9, unit * 0.88);
        const statRowH = statValuePx * 1.25 + statLabelPx * 2;
        const footnotePx = Math.max(9, unit * 0.9);

        const headerH = barH + L.row + titlePx * 1.1;
        const totalH = headerH + L.section + statRowH + L.section + buttonsH;
        let y = Math.max(L.top + unit, (this.height - totalH) / 2);

        // --- Title: two-bar pause glyph (the brand's "Pause" primitive) ------
        ctx.save();
        ctx.fillStyle = color.ink;
        ctx.fillRect(L.centerX - glyphGap / 2 - barW, y, barW, barH);
        ctx.fillRect(L.centerX + glyphGap / 2, y, barW, barH);

        y += barH + L.row;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitPx(ctx, 'MISSION PAUSED', L.width, titlePx, unit * 1.6, (px) => setDisplayType(ctx, px));
        ctx.fillText('MISSION PAUSED', L.centerX, y + titlePx * 0.55);
        resetType(ctx);
        ctx.restore();

        y += titlePx * 1.1 + L.section / 2;
        drawDivider(ctx, L.left, L.right, y);
        y += L.section / 2;

        // --- Run so far ------------------------------------------------------
        const colGap = unit * 2;
        const colW = (Math.min(unit * 28, L.width) - colGap) / 2;

        this.drawStatColumn(
            L.centerX - colGap / 2 - colW / 2, y, ScoreService.formatScore(this.score), 'KM',
            { valuePx: statValuePx, labelPx: statLabelPx }
        );
        this.drawStatColumn(
            L.centerX + colGap / 2 + colW / 2, y, ScoreService.formatScore(this.points), 'POINTS',
            { sparkle: true, valuePx: statValuePx, labelPx: statLabelPx }
        );

        ctx.save();
        ctx.strokeStyle = color.ink12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(L.centerX) + 0.5, y + statValuePx * 0.1);
        ctx.lineTo(Math.round(L.centerX) + 0.5, y + statRowH);
        ctx.stroke();
        ctx.restore();

        y += statRowH + L.section / 2;
        drawDivider(ctx, L.left, L.right, y);
        y += L.section / 2;

        // --- Actions ---------------------------------------------------------
        const bx = L.centerX - buttonWidth / 2;
        const muted = this.soundManager?.isMuted?.() ?? false;
        this.pauseButtons = {};

        this.pauseButtons.resume = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Resume', { primary: true, tag: '\u25B6' }
        );
        y += buttonHeight + buttonGap;

        this.pauseButtons.sound = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Sound', { tag: muted ? 'OFF' : 'ON' }
        );
        y += buttonHeight + buttonGap;

        this.pauseButtons.exit = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Exit Run', { tag: '\u2302' }
        );

        // Abandoning a run scores nothing, so say so rather than surprise them.
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, footnotePx);
        ctx.fillStyle = color.ink30;
        ctx.fillText('EXIT ENDS THE RUN — NOTHING IS SAVED', L.centerX, L.bottom - footnotePx / 2);
        resetType(ctx);
        ctx.restore();
    }

    handlePauseClick(x, y) {
        const buttons = this.pauseButtons;
        if (!buttons) return;

        if (this.isClickInButton(x, y, buttons.resume)) {
            this.togglePause();
        } else if (this.isClickInButton(x, y, buttons.sound)) {
            this.soundManager?.toggleMuted?.();
        } else if (this.isClickInButton(x, y, buttons.exit)) {
            this.exitRun();
        }
    }

    // Abandon the run from the pause screen: nothing scored, nothing saved, world
    // torn down on the next beginRun(). Journey drops back to its map, since
    // that's where the run came from.
    exitRun() {
        this.isPaused = false;
        if (this.isJourney()) {
            this.goToJourneyMap();
        } else {
            this.goToMenu();
        }
    }

    // Framed motif-tile button (brand kit): an uppercase Space Grotesk label with
    // an optional Space Mono micro-tag split by a hairline. Returns the hit-box.
    // `labelPx` is there for narrow buttons (a two-up row) that need to step the
    // label down rather than let it run past the frame.
    drawBrandButton(x, y, width, height, text, {
        primary = false,
        signal = false,
        tag = null,
        labelPx = null,
    } = {}) {
        const isMobile = window.innerWidth <= 768;
        const defaultPx = isMobile
            ? Math.min(this.baseUnit * 1.9, 22)
            : Math.min(this.baseUnit * 1.7, 20);
        return drawFramedButton(this.ctx, {
            x, y, w: width, h: height,
            label: text,
            tag,
            primary,
            signal,
            baseUnit: this.baseUnit,
            labelPx: labelPx ?? defaultPx,
        });
    }

    // Shared screen header: optional Back control on the left, a centred display
    // title on the same band, closed by a dotted rule. Returns the Back hit-box
    // and the Y where page content should start.
    drawScreenHeader(title, { back = false } = {}) {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);
        const barH = L.isMobile ? unit * 4.2 : unit * 3.8;
        const y = L.top;

        let backRect = null;
        if (back) {
            // A touch wider + a step-down label so "BACK" has air from the frame
            // on phone widths (shared by every screen that uses this header).
            const backW = Math.max(unit * 10.5, this.width * 0.22);
            const backLabelPx = L.isMobile
                ? Math.min(unit * 1.55, 17)
                : Math.min(unit * 1.45, 16);
            backRect = this.drawBrandButton(L.left, y, backW, barH, 'Back', {
                tag: '\u2190',
                labelPx: backLabelPx,
            });
        }

        ctx.save();
        ctx.fillStyle = color.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitPx(
            ctx,
            title,
            L.width * (back ? 0.56 : 0.9),
            L.isMobile ? Math.min(unit * 2.5, 28) : unit * 2.4,
            unit * 1.4,
            (px) => setDisplayType(ctx, px)
        );
        ctx.fillText(title, L.centerX, y + barH / 2 + 1);
        resetType(ctx);
        ctx.restore();

        const ruleY = y + barH + L.block;
        drawDivider(ctx, L.left, L.right, ruleY);

        return { backRect, contentTop: ruleY + L.section };
    }

    renderMainMenu() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        const buttonWidth = Math.min(unit * 32, L.width);
        const buttonHeight = L.isMobile ? unit * 6.6 : unit * 6;
        const buttonGap = unit * 1.5;
        const buttonsH = buttonHeight * 4 + buttonGap * 3;
        const menuLabelPx = L.isMobile
            ? Math.min(unit * 2.35, 26)
            : Math.min(unit * 2.15, 24);

        const titlePx = L.isMobile ? Math.min(unit * 3.6, 42) : unit * 3.4;
        const taglinePx = L.isMobile ? Math.min(unit * 1.45, 16) : unit * 1.3;
        const previewR = unit * 1.5;
        const previewH = previewR * 5.6; // hull + fading wake
        const namePx = Math.max(10, unit * 0.95);

        // Section stack: identity, ship, actions — centred as one block.
        const identityH = titlePx * 1.1 + L.row + taglinePx * 1.3;
        const shipH = previewH + L.row + namePx * 1.4;
        const totalH = identityH + L.section + shipH + L.section * 1.2 + buttonsH;
        let y = Math.max(L.top + unit, (this.height - totalH) / 2);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color.ink;
        fitPx(ctx, 'SPACE SWOOSH', L.width, titlePx, unit * 2, (px) => setDisplayType(ctx, px));
        ctx.fillText('SPACE SWOOSH', L.centerX, y + titlePx * 0.55);
        resetType(ctx);

        y += titlePx * 1.1 + L.row;
        ctx.font = `500 ${taglinePx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText(this.menuFlavor || pickCopy('menu'), L.centerX, y + taglinePx * 0.6);
        ctx.restore();

        // Install stamp — Play Internal often lags; verify before judging feel.
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const buildLabel = Capacitor.isNativePlatform()
            ? 'BUILD 24 · NATIVE'
            : 'BUILD 24 · WEB';
        const buildPx = Math.max(11, unit * 1.05);
        ctx.font = `700 ${buildPx}px ${font.mono}`;
        const buildW = ctx.measureText(buildLabel).width + unit * 1.6;
        const buildH = buildPx * 1.8;
        const buildY = L.top + buildH * 0.55;
        ctx.fillStyle = color.ink;
        ctx.fillRect(L.centerX - buildW / 2, buildY - buildH / 2, buildW, buildH);
        ctx.fillStyle = color.paper;
        ctx.fillText(buildLabel, L.centerX, buildY);
        ctx.restore();

        y += taglinePx * 1.3 + L.section;

        // Ship section — live preview + name, flanked by Play-button triangles.
        // Hit zones span the left/right halves of this band for easy mobile taps.
        this.menuButtons = {};
        const previewCy = y + previewR * 1.2;
        drawSkinPreview(ctx, this.shipSkinId, L.centerX, previewCy, previewR);

        // Same glyph as Play's motif tag (\u25B6), mirrored for previous.
        // Sit mid-figure (hull + wake), not on the nose.
        const arrowPx = L.isMobile
            ? Math.min(unit * 2.6, 30)
            : Math.min(unit * 2.3, 26);
        const arrowGap = previewR * 2.8 + unit * 1.8;
        const arrowCy = previewCy + previewR * 1.7;
        const prevX = L.centerX - arrowGap;
        const nextX = L.centerX + arrowGap;
        const midGap = unit * 2.4;
        this.menuButtons.prevShip = {
            x: L.left,
            y,
            width: Math.max(unit * 4, L.centerX - midGap - L.left),
            height: shipH,
        };
        this.menuButtons.nextShip = {
            x: L.centerX + midGap,
            y,
            width: Math.max(unit * 4, L.right - (L.centerX + midGap)),
            height: shipH,
        };

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color.ink;
        ctx.font = `700 ${arrowPx}px ${font.mono}`;
        ctx.fillText('\u25C0', prevX, arrowCy);
        ctx.fillText('\u25B6', nextX, arrowCy);
        setLabelType(ctx, namePx);
        ctx.fillStyle = color.ink55;
        ctx.fillText(getSkin(this.shipSkinId).name.toUpperCase(), L.centerX, y + previewH + L.row);
        resetType(ctx);
        ctx.restore();

        y += shipH + L.section * 1.2;

        const bx = L.centerX - buttonWidth / 2;

        this.menuButtons.play = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Play', {
                primary: true, tag: '\u25B6', labelPx: menuLabelPx,
            }
        );
        y += buttonHeight + buttonGap;
        this.menuButtons.logbook = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Logbook', {
                tag: '\u25A1', labelPx: menuLabelPx,
            }
        );
        y += buttonHeight + buttonGap;
        this.menuButtons.options = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Options', {
                tag: '\u2699', labelPx: menuLabelPx,
            }
        );
        y += buttonHeight + buttonGap;
        this.menuButtons.highScores = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'High Scores', {
                tag: '#', labelPx: menuLabelPx,
            }
        );
    }

    // Options hub — Ship / Controls / Sound / Light·Dark Mode toggle.
    renderOptionsHub() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        const header = this.drawScreenHeader('OPTIONS', { back: true });
        this.optionsHubButtons = { back: header.backRect };

        const subPx = L.isMobile ? Math.min(unit * 1.35, 15) : unit * 1.2;
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 5.4 : unit * 5;
        const buttonGap = unit * 1.4;
        const buttonsH = buttonHeight * 4 + buttonGap * 3;
        const subH = subPx * 1.4;

        const blockH = subH + L.section + buttonsH;
        const available = L.bottom - header.contentTop;
        let y = header.contentTop + Math.max(0, (available - blockH) / 2);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 ${subPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText('Vessel. Controls. Signal.', L.centerX, y + subPx * 0.6);
        ctx.restore();

        y += subH + L.section;

        const bx = L.centerX - buttonWidth / 2;
        // Same framed style as the other hub rows (not primary/ink-filled).
        this.optionsHubButtons.ship = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Ship', { tag: '\u25CF' }
        );
        y += buttonHeight + buttonGap;
        this.optionsHubButtons.controls = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Controls', { tag: '\u2194' }
        );
        y += buttonHeight + buttonGap;
        this.optionsHubButtons.sound = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Sound', { tag: '\u266A' }
        );
        y += buttonHeight + buttonGap;
        // Shows the active look; tap flips light ↔ dark (persisted).
        this.optionsHubButtons.theme = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, themeLabel(), { tag: '\u25D0' }
        );
    }

    // Ship picker — fixed-size cards in a 2-col grid. Longer rosters scroll
    // inside the band between the blurb and the footer. After the player taps a
    // vessel, a Play now CTA jumps straight into Open World.
    renderOptionsShip() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        this.optionsButtons = { skins: {} };
        const header = this.drawScreenHeader('SHIP', { back: true });
        this.optionsButtons.back = header.backRect;

        const descPx = L.isMobile ? Math.min(unit * 1.3, 15) : unit * 1.2;
        const footnotePx = Math.max(9, unit * 0.9);
        const gap = unit * 1.5;
        const columns = 2;
        const rows = Math.ceil(SHIP_SKIN_LIST.length / columns);
        const tileW = Math.min(unit * 19, (L.width - gap) / columns);
        // Keep cards readable; scroll when the roster outgrows the viewport.
        const tileH = Math.min(unit * 16, L.isMobile ? unit * 15 : unit * 17);
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 5.6 : unit * 5.2;
        const showQuickPlay = this.shipPickerOfferPlay;

        let y = header.contentTop;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 ${descPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText('Same trajectory. Different vessel.', L.centerX, y + descPx * 0.6);
        ctx.restore();

        y += descPx * 1.4 + L.block;

        const footnoteY = L.bottom - footnotePx / 2;
        const footerTop = showQuickPlay
            ? footnoteY - footnotePx / 2 - L.block - buttonHeight - L.block
            : footnoteY - footnotePx / 2 - L.block;
        const viewTop = y;
        const viewBottom = footerTop;
        const viewportHeight = Math.max(0, viewBottom - viewTop);
        const contentHeight = tileH * rows + gap * Math.max(0, rows - 1);
        const maxScroll = Math.max(0, contentHeight - viewportHeight);
        this.shipPickerScroll = Math.min(maxScroll, Math.max(0, this.shipPickerScroll));
        this.optionsButtons.shipPickerMetrics = {
            viewTop,
            viewportHeight,
            contentHeight,
        };

        const rowW = tileW * columns + gap * (columns - 1);
        const startX = L.centerX - rowW / 2;
        const time = performance.now();
        const scroll = this.shipPickerScroll;

        ctx.save();
        ctx.beginPath();
        ctx.rect(L.left, viewTop, L.width, viewportHeight);
        ctx.clip();

        SHIP_SKIN_LIST.forEach((skin, i) => {
            const x = startX + (i % columns) * (tileW + gap);
            const tileY = viewTop - scroll + Math.floor(i / columns) * (tileH + gap);
            // Skip draw for far off-screen cards; hit rects still needed only
            // when visible so clicks don't land on scrolled-away tiles.
            if (tileY + tileH < viewTop || tileY > viewBottom) {
                this.optionsButtons.skins[skin.id] = null;
                return;
            }
            this.optionsButtons.skins[skin.id] = {
                x, y: tileY, width: tileW, height: tileH, skinId: skin.id,
            };
            this.drawShipTile(
                skin, x, tileY, tileW, tileH,
                this.shipSkinId === skin.id,
                time,
                { locked: !isSkinOwned(skin.id) }
            );
        });
        ctx.restore();

        if (showQuickPlay) {
            const btnY = footnoteY - footnotePx / 2 - L.block - buttonHeight;
            this.optionsButtons.quickPlay = this.drawBrandButton(
                L.centerX - buttonWidth / 2,
                btnY,
                buttonWidth,
                buttonHeight,
                'Play now',
                { primary: true }
            );
        } else {
            this.optionsButtons.quickPlay = null;
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, footnotePx);
        ctx.fillStyle = color.ink30;
        const footnote = this.purchaseStatus
            ? this.purchaseStatus.toUpperCase()
            : showQuickPlay
                ? 'EQUIPPED · TAP TO FLY'
                : (maxScroll > 0 ? 'SCROLL · TAP A SHIP' : 'TAP A SHIP');
        ctx.fillText(footnote, L.centerX, footnoteY);
        resetType(ctx);
        ctx.restore();
    }

    clampShipPickerScroll(value) {
        const metrics = this.optionsButtons?.shipPickerMetrics;
        if (!metrics) return 0;
        const max = Math.max(0, metrics.contentHeight - metrics.viewportHeight);
        return Math.min(max, Math.max(0, value));
    }

    // Sound sub-screen: one real switch (the same one the pause menu shows), so
    // the two places that talk about sound can't disagree. Per-channel volume
    // lands here later.
    renderOptionsSound() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        const header = this.drawScreenHeader('SOUND', { back: true });
        this.optionsButtons = { back: header.backRect };

        const descPx = L.isMobile ? Math.min(unit * 1.3, 15) : unit * 1.2;
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 6 : unit * 5.4;
        const footnotePx = Math.max(9, unit * 0.9);
        const muted = this.soundManager?.isMuted?.() ?? false;

        const blockH = descPx * 1.4 + L.section + buttonHeight;
        const available = L.bottom - header.contentTop - footnotePx - L.block;
        let y = header.contentTop + Math.max(0, (available - blockH) / 2);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 ${descPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText('Music and effects.', L.centerX, y + descPx * 0.6);
        ctx.restore();

        y += descPx * 1.4 + L.section;

        this.optionsButtons.sound = this.drawBrandButton(
            L.centerX - buttonWidth / 2, y, buttonWidth, buttonHeight, 'Sound',
            { primary: !muted, tag: muted ? 'OFF' : 'ON' }
        );

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, footnotePx);
        ctx.fillStyle = color.ink30;
        ctx.fillText('SAVED AUTOMATICALLY', L.centerX, L.bottom - footnotePx / 2);
        resetType(ctx);
        ctx.restore();
    }

    // Controls: pick Arc (classic swoosh) or Zigzag (straight ±52°, any tap flips).
    renderOptionsControls() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        const header = this.drawScreenHeader('CONTROLS', { back: true });
        this.optionsButtons = { back: header.backRect };

        const descPx = L.isMobile ? Math.min(unit * 1.3, 15) : unit * 1.2;
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 6 : unit * 5.4;
        const footnotePx = Math.max(9, unit * 0.9);
        const zigzag = this.flightStyle === FLIGHT_STYLE.zigzag;

        const blockH = descPx * 2.2 + L.section + buttonHeight * 2 + L.block;
        const available = L.bottom - header.contentTop - footnotePx - L.block;
        let y = header.contentTop + Math.max(0, (available - blockH) / 2);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 ${descPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText('How the ship steers.', L.centerX, y + descPx * 0.6);
        ctx.restore();

        y += descPx * 1.6 + L.section;

        this.optionsButtons.flightZigzag = this.drawBrandButton(
            L.centerX - buttonWidth / 2, y, buttonWidth, buttonHeight, 'Zigzag',
            { primary: zigzag, tag: zigzag ? 'ON' : '' }
        );
        y += buttonHeight + L.block;

        this.optionsButtons.flightArc = this.drawBrandButton(
            L.centerX - buttonWidth / 2, y, buttonWidth, buttonHeight, 'Arc',
            { primary: !zigzag, tag: zigzag ? '' : 'ON' }
        );

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, footnotePx);
        ctx.fillStyle = color.ink30;
        ctx.fillText(
            zigzag ? 'TAP OR SPACE · STRAIGHT ±52°' : 'CLASSIC SWOOSH ARCS',
            L.centerX,
            L.bottom - footnotePx / 2
        );
        resetType(ctx);
        ctx.restore();
    }

    setFlightStyle(style) {
        this.flightStyle = saveFlightStyle(style);
    }

    // One selectable ship card: preview, name, blurb. Selected cards take the
    // Signal-Blue border plus a corner mark. Locked (premium, unowned) cards
    // keep a full preview so the player can see what they're buying, with a
    // price / LOCKED tag instead of the selected mark.
    drawShipTile(skin, x, y, w, h, selected, time, { locked = false } = {}) {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const pad = unit * 1.3;
        const cx = x + w / 2;

        drawFramedTile(ctx, x, y, w, h, {
            surface: selected ? color.paperDeep : color.paperTint,
            stroke: selected ? color.signal : color.ink,
        });

        if (selected && !locked) {
            ctx.save();
            ctx.strokeStyle = color.signal;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            const dot = unit * 0.55;
            ctx.fillStyle = color.signal;
            ctx.beginPath();
            ctx.arc(x + w - pad, y + pad, dot, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (locked) {
            ctx.save();
            setMonoType(ctx, Math.max(9, unit * 0.85));
            ctx.fillStyle = color.signal;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            const price = getSkinPriceLabel(skin.id);
            ctx.fillText(price || 'LOCKED', x + w - pad, y + pad);
            resetType(ctx);
            ctx.restore();
        }

        // Radius follows the tile so the preview's wake never runs into the
        // name, whatever the roster size does to the grid.
        const previewR = Math.min(unit * 1.6, h * 0.085);
        drawSkinPreview(ctx, skin.id, cx, y + h * 0.26, previewR, time);

        const innerW = w - pad * 2;
        const nameY = y + h * 0.68;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const namePx = fitPx(
            ctx, skin.name.toUpperCase(), innerW, Math.max(11, unit * 1.15), 9,
            (px) => setLabelType(ctx, px)
        );
        ctx.fillStyle = locked ? color.ink55 : color.ink;
        ctx.fillText(skin.name.toUpperCase(), cx, nameY);
        resetType(ctx);

        const blurbPx = Math.max(9.5, unit * 0.95);
        ctx.font = `500 ${blurbPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        const blurb = locked && isSkinPremium(skin.id)
            ? 'Tap to unlock.'
            : skin.blurb;
        wrapLines(ctx, blurb, innerW, 2).forEach((line, i) => {
            ctx.fillText(line, cx, nameY + namePx * 0.7 + unit * 1.2 + i * blurbPx * 1.35);
        });
        ctx.restore();
    }

    setPurchaseStatus(message, ms = 3200) {
        this.purchaseStatus = message;
        clearTimeout(this._purchaseStatusTimer);
        if (message && ms > 0) {
            this._purchaseStatusTimer = setTimeout(() => {
                if (this.purchaseStatus === message) this.purchaseStatus = null;
            }, ms);
        }
    }

    /** Cycle equipped skin on the main menu (owned skins only; wraps). */
    cycleMenuShip(delta) {
        const owned = SHIP_SKIN_LIST.filter((skin) => isSkinOwned(skin.id));
        if (owned.length < 2) return;

        let index = owned.findIndex((skin) => skin.id === this.shipSkinId);
        if (index < 0) index = 0;
        const next = owned[(index + delta + owned.length) % owned.length];
        this.shipSkinId = saveShipSkinId(next.id);
    }

    /** ArrowLeft / ArrowRight change ship on the main menu only. */
    setupMenuShipKeys() {
        window.addEventListener('keydown', (e) => {
            if (this.appScreen !== 'menu') return;
            if (e.repeat) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.cycleMenuShip(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.cycleMenuShip(1);
            }
        });
    }

    async handleShipTileClick(skinId) {
        if (this.purchaseBusy) return;

        if (isSkinOwned(skinId)) {
            this.shipSkinId = saveShipSkinId(skinId);
            this.shipPickerOfferPlay = true;
            this.setPurchaseStatus(null, 0);
            return;
        }

        this.purchaseBusy = true;
        this.setPurchaseStatus('Contacting store…', 0);
        try {
            const result = await purchaseSkin(skinId);
            if (result.ok) {
                this.shipSkinId = saveShipSkinId(skinId);
                this.shipPickerOfferPlay = true;
                this.setPurchaseStatus('Unlocked.');
                track('purchase_skin', { skin_id: skinId });
            } else if (result.cancelled) {
                this.setPurchaseStatus(null, 0);
            } else {
                this.setPurchaseStatus(result.message || 'Purchase unavailable.');
            }
        } finally {
            this.purchaseBusy = false;
        }
    }

    /** Jump from the ship picker into Open World with the equipped vessel. */
    quickPlayEndless() {
        if (!isSkinOwned(this.shipSkinId)) return;
        track('quick_play_endless', { skin_id: this.shipSkinId });
        this.beginRun(PLAY_MODE.openWorld);
    }

    // The one entry point into a run. The profile is built first because the
    // world is built from it.
    beginRun(mode = this.playMode, level = this.journeyLevel) {
        this.playMode = mode;
        if (mode === PLAY_MODE.journey) this.journeyLevel = clampLevel(level);
        this.profile = createRunProfile(this, this.playMode, this.journeyLevel);

        this.resetRunState();
        this.appScreen = 'playing';
        this.isPaused = false;

        // Defer navigator beats until the intro hands off the controls.
        const beats = this.profile.introBeats
            || (this.profile.introMessage ? [this.profile.introMessage] : null);
        this.pendingIntroBeats = beats;
        this.pendingIntroMessage = this.profile.introMessage || null;
        this.introNarration?.dispose?.();
        this.introNarration = null;
        // Create intro BEFORE pause visibility — otherwise the button flashes on
        // for a playing run with no levelIntro yet.
        this.levelIntro = new LevelIntroSequence(this);
        this.updatePauseButtonVisibility();

        if (this.soundInitialized) {
            this.soundManager.playBGM();
        }
    }

    beginJourneyLevel(level) {
        this.beginRun(PLAY_MODE.journey, level);
        this.logbook?.onLevelStarted?.(this.journeyLevel);
        this.logbook?.flushToast?.();
    }

    // Tear down whatever the run left behind and land on `nextScreen`.
    leaveRun(nextScreen) {
        this.removeNameInput();
        this.pendingHighScore = null;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameOverAlpha = 0;
        this.gameOverScreen = 'main';
        this.explosionParticles = [];
        this.runOutcome = null;
        this.levelOutcome = null;
        this.levelOutcomeButtons = null;
        this.levelClear = null;
        this.levelIntro = null;
        this.introNarration?.dispose?.();
        this.introNarration = null;
        this.pendingIntroMessage = null;
        this.pendingIntroBeats = null;
        this.hudRevealPhase = null;
        this.hudRevealStart = null;
        this.hudRevealWaitStart = null;
        this.hudPointsRevealStart = null;
        this.hudDestroyedRevealStart = null;
        this.finishLineWorldY = null;
        this.appScreen = nextScreen;
        this.soundManager?.stopLevelVoice?.({ notify: false });
        this.soundManager?.stopBGM?.();
        this.updatePauseButtonVisibility();
    }

    goToMenu() {
        this.leaveRun('menu');
        this.menuFlavor = pickCopy('menu');
    }

    // Play → mode cards. Fresh blurbs each visit so the copy doesn't stick.
    goToModeSelect() {
        this.modeJourneyBlurb = pickCopy('modeJourney');
        this.modeOpenWorldBlurb = pickCopy('modeOpenWorld');
        this.appScreen = 'modeSelect';
        this.updatePauseButtonVisibility();
    }

    goToJourneyMap() {
        this.leaveRun('journeyMap');
        this.journeyMapNeedsScroll = true;
    }

    resetRunState() {
        this.score = 0;
        this.points = 0;
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.gameOverScreen = 'main';
        this.hasWon = false;
        this.obstaclesDestroyed = 0;
        this.runOutcome = null;
        this.levelOutcome = null;
        this.levelClear = null;
        this.levelIntro = null;
        this.introNarration?.dispose?.();
        this.introNarration = null;
        this.pendingIntroMessage = null;
        this.pendingIntroBeats = null;
        this.hudRevealPhase = null;
        this.hudRevealStart = null;
        this.hudRevealWaitStart = null;
        this.hudPointsRevealStart = null;
        this.hudDestroyedRevealStart = null;
        this.finishLineWorldY = null;
        this.endFlavor = null;
        // Dropped with the outcome itself: otherwise the previous level's button
        // boxes are still live during the next level's clear beat.
        this.levelOutcomeButtons = null;
        this.scoreSubmitted = false;
        this.pendingHighScore = null;
        this.removeNameInput();

        this.camera = new Camera(this);
        this.spacecraft = new Spacecraft(this);
        this.obstacleManager = new ObstacleManager(this);
        this.milestoneManager = new MilestoneManager(this);
        this.collectibleManager = new CollectibleManager(this);
        this.styleSwooshManager = new StyleSwooshManager(this);
        this.wallBoopManager = new WallBoopManager(this);
        this.powerUpManager = new PowerUpManager(this);
        this.explosionParticles = [];
    }

    // A single stat column: mono figure over a micro-label, optionally led by the
    // Signal-Blue sparkle used for points everywhere else.
    drawStatColumn(cx, top, value, label, { sparkle = false, valuePx, labelPx } = {}) {
        const ctx = this.ctx;
        const unit = this.baseUnit;

        ctx.save();
        ctx.textBaseline = 'middle';
        setMonoType(ctx, valuePx);
        const valueW = ctx.measureText(value).width;
        const spR = sparkle ? valuePx * 0.4 : 0;
        const spGap = sparkle ? unit * 0.6 : 0;
        let x = cx - (valueW + spR * 2 + spGap) / 2;

        if (sparkle) {
            drawSparkle(ctx, x + spR, top + valuePx * 0.52, spR, { fill: color.signal });
            x += spR * 2 + spGap;
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = color.ink;
        ctx.fillText(value, x, top + valuePx * 0.55);

        setLabelType(ctx, labelPx);
        ctx.fillStyle = color.ink55;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, top + valuePx * 1.25 + labelPx);
        resetType(ctx);
        ctx.restore();
    }

    renderMainGameOver() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        // Three bands: verdict, stats, actions — separated by dotted rules and
        // centred as one block so the screen never sits top-heavy.
        const numButtons = this.scoreSubmitted ? 3 : 4;
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 5.6 : unit * 5;
        const buttonGap = unit * 1.5;
        const buttonsH = buttonHeight * numButtons + buttonGap * (numButtons - 1);

        const titlePx = L.isMobile ? Math.min(unit * 3.2, 38) : unit * 3;
        const subPx = L.isMobile ? Math.min(unit * 1.45, 16) : unit * 1.3;
        const distPx = L.isMobile ? Math.min(unit * 3.4, 40) : unit * 3.2;
        const kmPx = Math.max(10, unit * 1);
        const statValuePx = L.isMobile ? Math.min(unit * 2, 23) : unit * 1.9;
        const statLabelPx = Math.max(9, unit * 0.88);

        const verdictH = titlePx * 1.1 + L.row + subPx * 1.3;
        const distH = distPx * 1.15;
        const statRowH = statValuePx * 1.25 + statLabelPx * 2;
        const statsH = distH + L.block + statRowH;
        const totalH = verdictH + L.section + statsH + L.section + buttonsH;

        let y = Math.max(L.top + unit, (this.height - totalH) / 2);

        // --- Verdict ---------------------------------------------------------
        const titleText = this.hasWon ? 'MISSION COMPLETE' : 'MISSION FAILED';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color.ink;
        fitPx(ctx, titleText, L.width, titlePx, unit * 1.8, (px) => setDisplayType(ctx, px));
        ctx.fillText(titleText, L.centerX, y + titlePx * 0.55);
        resetType(ctx);

        y += titlePx * 1.1 + L.row;

        const subText = this.endFlavor
            || (this.hasWon ? pickCopy('victory') : pickCopy('crash'));
        ctx.font = `500 ${subPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        ctx.fillText(subText, L.centerX, y + subPx * 0.6);
        ctx.restore();

        y += subPx * 1.3 + L.section / 2;
        drawDivider(ctx, L.left, L.right, y);
        y += L.section / 2;

        // --- Stats: headline distance, then destroyed | points ---------------
        const distStr = ScoreService.formatScore(this.finalScore);
        ctx.save();
        ctx.textBaseline = 'middle';
        setMonoType(ctx, distPx);
        const distW = ctx.measureText(distStr).width;
        setLabelType(ctx, kmPx);
        const kmW = ctx.measureText('KM').width;
        const kmGap = unit * 0.7;
        const distX = L.centerX - (distW + kmGap + kmW) / 2;
        ctx.textAlign = 'left';
        setMonoType(ctx, distPx);
        ctx.fillStyle = color.ink;
        ctx.fillText(distStr, distX, y + distPx * 0.55);
        setLabelType(ctx, kmPx);
        ctx.fillStyle = color.ink55;
        ctx.fillText('KM', distX + distW + kmGap, y + distPx * 0.72);
        resetType(ctx);
        ctx.restore();

        y += distH + L.block;

        const colGap = unit * 2;
        const colW = (Math.min(unit * 28, L.width) - colGap) / 2;
        const leftCx = L.centerX - colGap / 2 - colW / 2;
        const rightCx = L.centerX + colGap / 2 + colW / 2;

        this.drawStatColumn(
            leftCx, y, ScoreService.formatScore(this.obstaclesDestroyed), 'DESTROYED',
            { valuePx: statValuePx, labelPx: statLabelPx }
        );
        this.drawStatColumn(
            rightCx, y, ScoreService.formatScore(this.points), 'POINTS',
            { sparkle: true, valuePx: statValuePx, labelPx: statLabelPx }
        );

        // Hairline between the two stat columns.
        ctx.save();
        ctx.strokeStyle = color.ink12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(L.centerX) + 0.5, y + statValuePx * 0.1);
        ctx.lineTo(Math.round(L.centerX) + 0.5, y + statRowH);
        ctx.stroke();
        ctx.restore();

        y += statRowH + L.section / 2;
        drawDivider(ctx, L.left, L.right, y);
        y += L.section / 2;

        // --- Actions ---------------------------------------------------------
        const bx = L.centerX - buttonWidth / 2;
        this.gameOverButtons = {};

        this.gameOverButtons.playAgain = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Play Again', { primary: true, tag: '\u21BA' }
        );
        y += buttonHeight + buttonGap;

        if (!this.scoreSubmitted) {
            this.gameOverButtons.submitScore = this.drawBrandButton(
                bx, y, buttonWidth, buttonHeight, 'Submit Score', { tag: '\u2191' }
            );
            y += buttonHeight + buttonGap;
        }

        this.gameOverButtons.highScores = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'High Scores', { tag: '#' }
        );
        y += buttonHeight + buttonGap;

        this.gameOverButtons.menu = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Menu', { tag: '\u2302' }
        );

        // Submit modal only after Mission Failed has fully settled — avoids the
        // modal flashing in over a half-faded end screen.
        if (this.pendingHighScore?.shouldPromptName && this.gameOverAlpha >= 1) {
            this.renderNameInputModal();
        }
    }

    renderHighScores() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);
        const isMobile = L.isMobile;
        const PAGE_SIZE = 10;
        const MAX_PAGES = 10;
        const RANK_TROPHIES = ['🥇', '🥈', '🥉'];

        const header = this.drawScreenHeader('LEADERBOARD', { back: true });
        this.highScoresBackButton = header.backRect;
        this.highScorePrevButton = null;
        this.highScoreNextButton = null;

        // Tabs — uppercase labels; the active tab is marked by a dotted trail.
        const tabWidth = this.width * (isMobile ? 0.4 : 0.3);
        const tabHeight = unit * 3.6;
        const tabY = header.contentTop - L.section / 2;
        const tabSpacing = unit * 2;

        this.distanceTab = {
            x: this.width / 2 - tabWidth - tabSpacing / 2,
            y: tabY,
            width: tabWidth,
            height: tabHeight
        };
        this.obstaclesTab = {
            x: this.width / 2 + tabSpacing / 2,
            y: tabY,
            width: tabWidth,
            height: tabHeight
        };

        [
            { tab: this.distanceTab, text: 'DISTANCE', active: this.highScoreTab === 'distance' },
            { tab: this.obstaclesTab, text: 'OBSTACLES', active: this.highScoreTab === 'obstacles' }
        ].forEach(({ tab, text, active }) => {
            ctx.save();
            ctx.fillStyle = active ? color.ink : color.ink55;
            setLabelType(ctx, isMobile ? Math.min(unit * 1.4, 15) : unit * 1.2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, tab.x + tab.width / 2, tab.y + tab.height / 2);
            resetType(ctx);

            if (active) {
                dottedLine(ctx, tab.x + tab.width * 0.15, tab.x + tab.width * 0.85, tab.y + tab.height, 1.6, 7, color.ink);
            }
            ctx.restore();
        });

        // Wider columns; leave a bottom band so PAGE n/m can sit mid-gap.
        const leftX = this.width * 0.08;
        const rightX = this.width * 0.92;
        const listTop = tabY + tabHeight + unit * 2.4;
        const pagerZone = Math.max(unit * 7, this.height * 0.16);
        const listBottom = this.height - pagerZone;
        const listH = Math.max(unit * 20, listBottom - listTop);
        const scoreSpacing = unit * 0.55;
        const scoreHeight = (listH - scoreSpacing * (PAGE_SIZE - 1)) / PAGE_SIZE;
        const numPx = isMobile ? Math.min(unit * 1.85, 22) : unit * 1.7;
        const namePx = isMobile ? Math.min(unit * 1.85, 22) : unit * 1.7;
        const rankColW = unit * 3.2;
        const nameLeft = leftX + rankColW + unit * 0.8;

        const scores = this.highScores || [];
        const totalPages = scores.length === 0
            ? 1
            : Math.min(MAX_PAGES, Math.max(1, Math.ceil(scores.length / PAGE_SIZE)));
        if (this.highScorePage >= totalPages) this.highScorePage = totalPages - 1;
        if (this.highScorePage < 0) this.highScorePage = 0;

        if (scores.length === 0) {
            ctx.save();
            ctx.fillStyle = color.ink55;
            ctx.font = `500 ${namePx}px ${font.ui}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No signals logged. Be the first.', this.width / 2, listTop + scoreHeight);
            ctx.restore();
            return;
        }

        const pageScores = scores.slice(
            this.highScorePage * PAGE_SIZE,
            this.highScorePage * PAGE_SIZE + PAGE_SIZE
        );

        pageScores.forEach((score, index) => {
            const rank = this.highScorePage * PAGE_SIZE + index + 1;
            const y = listTop + (scoreHeight + scoreSpacing) * index;
            const midY = y + scoreHeight / 2;
            const isTop = rank <= 3;

            ctx.save();
            ctx.textBaseline = 'middle';

            // Rank — trophy emoji for 1–3, mono number otherwise.
            if (isTop) {
                ctx.font = `${Math.max(numPx * 1.15, 18)}px ${font.ui}`;
                ctx.textAlign = 'center';
                ctx.fillText(RANK_TROPHIES[rank - 1], leftX + rankColW / 2, midY);
            } else {
                ctx.fillStyle = color.ink55;
                setMonoType(ctx, numPx);
                ctx.textAlign = 'right';
                ctx.fillText(`${rank}`, leftX + rankColW, midY);
            }

            // Call sign (+ ship) — clean gap to the score, no dotted leader.
            ctx.fillStyle = color.ink;
            ctx.font = `${isTop ? 700 : 500} ${namePx}px ${font.ui}`;
            ctx.textAlign = 'left';
            ctx.fillText(score.player_name, nameLeft, midY);
            let labelEnd = nameLeft + ctx.measureText(score.player_name).width;

            const shipName = score.ship_id ? getSkin(score.ship_id).name : null;
            if (shipName) {
                const comma = ', ';
                ctx.fillText(comma, labelEnd, midY);
                labelEnd += ctx.measureText(comma).width;
                const shipPx = Math.max(10, namePx * 0.82);
                ctx.fillStyle = color.ink55;
                ctx.font = `500 ${shipPx}px ${font.ui}`;
                ctx.fillText(shipName, labelEnd, midY);
            }

            // Score — mono figure, optional KM label for distance.
            setMonoType(ctx, numPx, 700);
            ctx.fillStyle = color.ink;
            ctx.textAlign = 'right';
            if (this.highScoreTab === 'distance') {
                const kmSize = Math.max(9, unit * 0.8);
                setLabelType(ctx, kmSize);
                ctx.fillStyle = color.ink55;
                ctx.fillText('KM', rightX, midY);
                const kmW = ctx.measureText('KM').width;
                setMonoType(ctx, numPx, 700);
                ctx.fillStyle = color.ink;
                ctx.fillText(score.formattedScore, rightX - kmW - unit * 0.5, midY);
            } else {
                ctx.fillText(score.formattedScore, rightX, midY);
            }

            resetType(ctx);
            ctx.restore();

            if (index < pageScores.length - 1) {
                // Sharper dotted row separators.
                dottedLine(
                    ctx,
                    leftX,
                    rightX,
                    y + scoreHeight + scoreSpacing / 2,
                    1,
                    5,
                    color.ink30
                );
            }
        });

        // Pager: ←  PAGE n/m  → — vertically mid between last row and screen bottom.
        const pageLabel = `PAGE ${this.highScorePage + 1}/${totalPages}`;
        const lastRowBottom = listTop
            + pageScores.length * scoreHeight
            + Math.max(0, pageScores.length - 1) * scoreSpacing;
        const pagerY = (lastRowBottom + this.height) / 2;
        const arrowW = unit * 5;
        const arrowH = unit * 3.6;
        const labelW = unit * 14;
        const canPrev = this.highScorePage > 0;
        const canNext = this.highScorePage < totalPages - 1;

        this.highScorePrevButton = {
            x: this.width / 2 - labelW / 2 - arrowW - unit,
            y: pagerY - arrowH / 2,
            width: arrowW,
            height: arrowH,
            enabled: canPrev
        };
        this.highScoreNextButton = {
            x: this.width / 2 + labelW / 2 + unit,
            y: pagerY - arrowH / 2,
            width: arrowW,
            height: arrowH,
            enabled: canNext
        };

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setLabelType(ctx, isMobile ? Math.min(unit * 1.35, 15) : unit * 1.2);
        ctx.fillStyle = color.ink;
        ctx.fillText(pageLabel, this.width / 2, pagerY);

        ctx.fillStyle = canPrev ? color.ink : color.ink30;
        ctx.font = `600 ${numPx}px ${font.ui}`;
        ctx.fillText('\u2190', this.highScorePrevButton.x + arrowW / 2, pagerY);

        ctx.fillStyle = canNext ? color.ink : color.ink30;
        ctx.fillText('\u2192', this.highScoreNextButton.x + arrowW / 2, pagerY);
        resetType(ctx);
        ctx.restore();
    }

    updateScore() {
        // Calculate remaining distance
        const distanceTraveled = Math.abs(this.camera.totalDistance);
        this.score = Math.max(0, this.TOTAL_DISTANCE - distanceTraveled);

        // Check for win condition
        if (this.score === 0 && !this.hasWon) {
            this.hasWon = true;
            this.victory();
        }
    }

    // Reaching the profile's goal. In Journey that's a cleared level; in Open
    // World it's the (practically unreachable) victory line.
    completeRun() {
        if (this.isGameOver) return;

        this.runOutcome = 'completed';

        if (!this.isJourney()) {
            this.victory();
            return;
        }

        this.isGameOver = true;
        this.appScreen = 'gameover';
        this.gameOverScreen = 'main';
        this.gameOverStartTime = performance.now();
        this.finalScore = Math.floor(this.score);
        this.gameOverAlpha = 0;
        this.hasWon = true;
        this.updatePauseButtonVisibility();
        this.introNarration?.dispose?.();
        this.introNarration = null;
        this.soundManager?.stopLevelVoice?.({ notify: false });
        this.soundManager?.stopBGM?.();
        // Lock the finish line here so the ship can fly through a fixed mark.
        // Journey results finalize when the flyout enters screenIn — smashes and
        // sparkles during hold/boost/fadeOut still count toward points /
        // destroyed / stars.
        this.logbook?.onFinishGateCrossed?.();
        this.finishLineWorldY = this.spacecraft.y;
        this.levelClear = new LevelClearSequence(this);
        this.logbook?.flushToast?.();
    }

    // Score the finished level, fold it into the saved progress, and build what
    // the outcome screen reads.
    finishJourneyLevel(completed) {
        const descriptor = getLevel(this.journeyLevel);
        const stars = evaluateStars(descriptor, {
            completed,
            points: this.points,
            obstaclesDestroyed: this.obstaclesDestroyed,
        });

        const result = recordLevelResult(this.journeyProgress, {
            level: descriptor.level,
            stars,
            points: this.points,
            completed,
        });
        this.journeyProgress = result.progress;

        if (completed) {
            this.logbook?.onLevelCleared?.(descriptor.level);
        }

        this.levelOutcome = {
            descriptor,
            completed,
            stars: result.stars,
            newStars: result.newStars,
            unlockedNext: result.unlockedNext,
            score: this.score,
            points: this.points,
            obstaclesDestroyed: this.obstaclesDestroyed,
            flavor: pickCopy(journeyFlavorPool({
                completed,
                stars: result.stars,
                descriptor,
            }, TOTAL_LEVELS)),
        };

        track('journey_level_end', {
            'level': descriptor.level,
            'chapter': descriptor.chapterId,
            'completed': completed,
            'stars': result.stars.slice(0, descriptor.starSlots ?? 3).filter(Boolean).length,
            'points': this.points,
            'distance': Math.floor(this.score),
        });
    }

    // Open the map roughly at the level the player is on, rather than at the top
    // of a forty-level list.
    scrollJourneyMapToLevel() {
        const metrics = this.journeyMapButtons?.metrics;
        const tile = this.journeyMapButtons?.levels
            ?.find((entry) => entry.level === nextPlayableLevel(this.journeyProgress));

        if (!metrics || !tile) {
            this.journeyMapScroll = 0;
            return;
        }

        // `tile.y` is screen space, so add the scroll back to get list space.
        const listY = tile.y + this.journeyMapScroll;
        const target = listY - metrics.viewTop - metrics.viewportHeight * 0.35;
        this.journeyMapScroll = this.clampJourneyScroll(target);
    }

    clampJourneyScroll(value) {
        const metrics = this.journeyMapButtons?.metrics;
        if (!metrics) return 0;
        const max = Math.max(0, metrics.contentHeight - metrics.viewportHeight);
        return Math.min(max, Math.max(0, value));
    }

    victory() {
        this.isGameOver = true;
        this.appScreen = 'gameover';
        this.gameOverScreen = 'main';
        this.gameOverStartTime = performance.now();
        this.finalScore = this.score;
        this.gameOverAlpha = 0;
        this.endFlavor = pickCopy('victory');
        this.updatePauseButtonVisibility();
        this.soundManager.stopBGM();
        this.soundManager.playVictory?.();
        
        // Save victory score
        const playerName = localStorage.getItem('playerName') || 'Anonymous';
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        
        // Store the actual distance traveled
        const distanceTraveled = 50000 - this.score;
        
        highScores.push({ 
            player_name: playerName, 
            score: distanceTraveled,  // Store actual distance traveled
            isWinner: true
        });
        
        // Higher scores (more distance) should be first
        highScores.sort((a, b) => b.score - a.score);
        localStorage.setItem('highScores', JSON.stringify(highScores.slice(0, 10)));
        this.highScores = highScores;
    }

    async gameOver() {
        if (!this.isGameOver) {
            this.introNarration?.dispose?.();
            this.introNarration = null;
            this.soundManager.stopLevelVoice?.({ notify: false });
            this.soundManager.stopBGM();
            this.soundManager.playCrash();
            this.soundManager.playExplosion();
            this.isGameOver = true;
            this.appScreen = 'gameover';
            this.gameOverScreen = 'main';
            this.runOutcome = 'crashed';
            this.gameOverStartTime = performance.now();
            this.finalScore = Math.floor(this.score);

            // Hide pause button
            this.updatePauseButtonVisibility();

            this.explosionParticles = this.createExplosionParticles(
                this.spacecraft.x,
                this.spacecraft.y
            );
            this.spacecraft.isVisible = false;

            // Journey is self-contained: no rank lookup, no leaderboard prompt.
            if (this.isJourney()) {
                this.finishJourneyLevel(false);
                return;
            }

            this.endFlavor = pickCopy('crash');

            // Local personal best for the Play → Open World card (device-only).
            const bestResult = recordOpenWorldScore(this.openWorldProgress, this.finalScore);
            this.openWorldProgress = bestResult.progress;

            track('game_over', {
                'score': this.finalScore,
                'obstacles_destroyed': this.obstaclesDestroyed,
                'points': this.points,
                'distance': Math.floor(this.score)
            });

            try {
                // Get actual rank by counting all higher scores
                const higherScoresCount = await ScoreService.getAllScoresCount(this.finalScore);
                const rank = higherScoresCount + 1;
                
                // Store rank separately so it persists even if modal is closed
                this.currentRank = rank;
                
                // Auto-prompt for a call sign only when the run lands in the top 10.
                // Ranks 11+ can still submit via the manual Submit Score button.
                const isTop10 = rank <= 10;

                this.pendingHighScore = isTop10 ? {
                    score: this.finalScore,
                    obstaclesDestroyed: this.obstaclesDestroyed,
                    isWinner: this.hasWon,
                    shouldPromptName: true,
                    rank: this.currentRank
                } : null;
                
                await this.loadHighScores();
            } catch (error) {
                console.error('Error handling high score:', error);
                this.currentRank = '?';
                this.pendingHighScore = null;
            }
        }
    }

    async loadHighScores() {
        try {
            this.highScores = await ScoreService.getTopScores(this.highScoreTab);
        } catch (error) {
            console.error('Failed to load high scores:', error);
            this.highScores = [];
        }
        const totalPages = this.highScores.length === 0
            ? 1
            : Math.min(10, Math.max(1, Math.ceil(this.highScores.length / 10)));
        if (this.highScorePage >= totalPages) this.highScorePage = totalPages - 1;
        if (this.highScorePage < 0) this.highScorePage = 0;
    }

    createExplosionParticles(x, y) {
        const particles = [];
        const baseSpeed = this.baseUnit * 0.5; // Scale speed with screen size
        
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = baseSpeed * (2 + Math.random() * 3);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: this.baseUnit * (0.3 + Math.random() * 0.4),
                opacity: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
        return particles;
    }

    updateExplosion() {
        const currentTime = performance.now();
        
        if (this.isGameOver) {
            const timeSinceGameOver = currentTime - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;

            // A completed run has nothing to blow up. Journey's flyout drives its
            // own fade, so this is only the Open World victory line.
            if (this.runOutcome === 'completed') {
                this.gameOverAlpha = Math.min(1, timeSinceGameOver / 500);
                return;
            }

            // Blast particles for the deceleration window; Mission Failed starts
            // crossfading in during the second half so there is no blank beat.
            const screenFadeStart = deceleration * 0.5;
            const screenFadeMs = deceleration * 0.5 + 350;

            if (timeSinceGameOver < deceleration) {
                this.explosionParticles = this.explosionParticles
                    .map(particle => {
                        const progress = timeSinceGameOver / deceleration;
                        return {
                            ...particle,
                            x: particle.x + particle.vx * (1 - progress),
                            y: particle.y + particle.vy * (1 - progress),
                            size: particle.size * (1 + progress * 0.5),
                            opacity: 1 - (timeSinceGameOver / deceleration)
                        };
                    });
            } else {
                this.explosionParticles = [];
            }

            if (timeSinceGameOver >= screenFadeStart) {
                this.gameOverAlpha = Math.min(
                    1,
                    (timeSinceGameOver - screenFadeStart) / screenFadeMs
                );
            }
        }
    }

    setupEventListeners() {
        const handleInteraction = async (clientX, clientY) => {
            // Active run: InputHandler owns steering — skip layout thrash.
            // Pause menu still needs hit-testing below.
            if (this.appScreen === 'playing' && !this.isPaused && !this.isGameOver) {
                return;
            }

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const scaleY = this.height / rect.height;
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            // The pause menu covers the run, so it gets first refusal on clicks.
            if (this.appScreen === 'playing' && this.isPaused) {
                this.handlePauseClick(x, y);
                return;
            }

            // Gameplay touches are handled by InputHandler; UI screens handle clicks here.
            if (this.appScreen === 'playing' && !this.isGameOver) return;

            if (this.appScreen === 'modeSelect') {
                handleModeSelectClick(this, x, y);
                return;
            }

            if (this.appScreen === 'lore') {
                handleLoreScreenClick(this, x, y);
                return;
            }

            if (this.appScreen === 'journeyMap') {
                handleJourneyMapClick(this, x, y);
                return;
            }

            if (this.appScreen === 'logbook') {
                handleLogbookClick(this, x, y);
                return;
            }

            if (this.appScreen === 'menu' && this.menuButtons) {
                if (this.isClickInButton(x, y, this.menuButtons.prevShip)) {
                    this.cycleMenuShip(-1);
                } else if (this.isClickInButton(x, y, this.menuButtons.nextShip)) {
                    this.cycleMenuShip(1);
                } else if (this.isClickInButton(x, y, this.menuButtons.play)) {
                    this.goToModeSelect();
                } else if (this.isClickInButton(x, y, this.menuButtons.logbook)) {
                    this.logbookCategory = 'obstacles';
                    this.logbookScroll = 0;
                    this.appScreen = 'logbook';
                    this.updatePauseButtonVisibility();
                } else if (this.isClickInButton(x, y, this.menuButtons.options)) {
                    this.appScreen = 'options';
                    this.updatePauseButtonVisibility();
                } else if (this.isClickInButton(x, y, this.menuButtons.highScores)) {
                    this.highScoresReturnScreen = 'menu';
                    this.appScreen = 'highscores';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                    this.updatePauseButtonVisibility();
                }
                return;
            }

            if (this.appScreen === 'options' && this.optionsHubButtons) {
                if (this.isClickInButton(x, y, this.optionsHubButtons.back)) {
                    this.showMenu();
                    return;
                }
                if (this.isClickInButton(x, y, this.optionsHubButtons.ship)) {
                    this.shipPickerScroll = 0;
                    this.shipPickerOfferPlay = false;
                    this.appScreen = 'optionsShip';
                    return;
                }
                if (this.isClickInButton(x, y, this.optionsHubButtons.controls)) {
                    this.appScreen = 'optionsControls';
                    return;
                }
                if (this.isClickInButton(x, y, this.optionsHubButtons.sound)) {
                    this.appScreen = 'optionsSound';
                    return;
                }
                if (this.isClickInButton(x, y, this.optionsHubButtons.theme)) {
                    toggleTheme();
                    syncStatusBarTheme().catch(() => {});
                    return;
                }
                return;
            }

            if (this.appScreen === 'optionsShip' && this.optionsButtons) {
                if (this.isClickInButton(x, y, this.optionsButtons.back)) {
                    this.appScreen = 'options';
                    return;
                }
                if (this.isClickInButton(x, y, this.optionsButtons.quickPlay)) {
                    this.quickPlayEndless();
                    return;
                }
                for (const skin of SHIP_SKIN_LIST) {
                    const hit = this.optionsButtons.skins?.[skin.id];
                    if (this.isClickInButton(x, y, hit)) {
                        await this.handleShipTileClick(skin.id);
                        return;
                    }
                }
                return;
            }

            if (this.appScreen === 'optionsControls' && this.optionsButtons) {
                if (this.isClickInButton(x, y, this.optionsButtons.back)) {
                    this.appScreen = 'options';
                } else if (this.isClickInButton(x, y, this.optionsButtons.flightArc)) {
                    this.setFlightStyle(FLIGHT_STYLE.arc);
                } else if (this.isClickInButton(x, y, this.optionsButtons.flightZigzag)) {
                    this.setFlightStyle(FLIGHT_STYLE.zigzag);
                }
                return;
            }

            if (this.appScreen === 'optionsSound' && this.optionsButtons) {
                if (this.isClickInButton(x, y, this.optionsButtons.back)) {
                    this.appScreen = 'options';
                } else if (this.isClickInButton(x, y, this.optionsButtons.sound)) {
                    this.soundManager?.toggleMuted?.();
                }
                return;
            }

            if (this.appScreen === 'highscores') {
                if (this.isClickInButton(x, y, this.distanceTab) && this.highScoreTab !== 'distance') {
                    this.highScoreTab = 'distance';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.obstaclesTab) && this.highScoreTab !== 'obstacles') {
                    this.highScoreTab = 'obstacles';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                } else if (this.highScorePrevButton?.enabled && this.isClickInButton(x, y, this.highScorePrevButton)) {
                    this.highScorePage -= 1;
                } else if (this.highScoreNextButton?.enabled && this.isClickInButton(x, y, this.highScoreNextButton)) {
                    this.highScorePage += 1;
                } else if (this.isClickInButton(x, y, this.highScoresBackButton)) {
                    if (this.highScoresReturnScreen === 'gameover') {
                        this.appScreen = 'gameover';
                        this.gameOverScreen = 'main';
                        this.updatePauseButtonVisibility();
                    } else {
                        this.showMenu();
                    }
                }
                return;
            }

            if (this.appScreen !== 'gameover' && !this.isGameOver) return;

            // Mid-flyout: eat the tap so it cannot press outcome buttons early.
            if (this.levelClear?.active) {
                return;
            }

            // Journey's end screen owns its own actions (next / retry / map).
            if (this.isJourney()) {
                handleLevelOutcomeClick(this, x, y);
                return;
            }

            // Handle name input modal (only once the end screen has settled).
            if (this.pendingHighScore?.shouldPromptName && this.gameOverAlpha >= 1) {
                if (this.isClickInButton(x, y, this.closeButton)) {
                    this.closeNameInputModal();
                    return;
                }
                if (this.submitButton && this.isClickInButton(x, y, this.submitButton) && this.nameInput?.value.trim()) {
                    await this.submitHighScore(this.nameInput.value.trim());
                }
                return;
            }

            // Nested high scores opened from game-over (legacy gameOverScreen path)
            if (this.gameOverScreen === 'highscores') {
                if (this.isClickInButton(x, y, this.distanceTab) && this.highScoreTab !== 'distance') {
                    this.highScoreTab = 'distance';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.obstaclesTab) && this.highScoreTab !== 'obstacles') {
                    this.highScoreTab = 'obstacles';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                } else if (this.highScorePrevButton?.enabled && this.isClickInButton(x, y, this.highScorePrevButton)) {
                    this.highScorePage -= 1;
                } else if (this.highScoreNextButton?.enabled && this.isClickInButton(x, y, this.highScoreNextButton)) {
                    this.highScorePage += 1;
                } else if (this.isClickInButton(x, y, this.highScoresBackButton)) {
                    this.gameOverScreen = 'main';
                }
                return;
            }

            // Handle main game over buttons
            if (this.gameOverScreen === 'main' && this.gameOverButtons) {
                if (this.isClickInButton(x, y, this.gameOverButtons.playAgain)) {
                    this.restart();
                } else if (this.isClickInButton(x, y, this.gameOverButtons.highScores)) {
                    this.highScoresReturnScreen = 'gameover';
                    this.appScreen = 'highscores';
                    this.gameOverScreen = 'main';
                    this.highScorePage = 0;
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.gameOverButtons.menu)) {
                    this.goToMenu();
                } else if (!this.scoreSubmitted && 
                          this.gameOverButtons.submitScore && 
                          this.isClickInButton(x, y, this.gameOverButtons.submitScore)) {
                    this.pendingHighScore = {
                        score: this.finalScore,
                        obstaclesDestroyed: this.obstaclesDestroyed,
                        isWinner: this.hasWon,
                        shouldPromptName: true,
                        rank: this.currentRank
                    };
                }
            }
        };

        // Mouse events
        this.canvas.addEventListener('click', (e) => {
            handleInteraction(e.clientX, e.clientY);
        });

        // Touch events
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            // A drag on a scrollable list wasn't aiming at a tile/button.
            if ((this.appScreen === 'journeyMap'
                || this.appScreen === 'optionsShip'
                || this.appScreen === 'logbook')
                && this.touchDragged) {
                this.touchDragged = false;
                this.touchStart = null;
                return;
            }
            const touch = e.changedTouches[0];
            handleInteraction(touch.clientX, touch.clientY);
        });

        this.setupListScrolling();
    }

    // Tall lists (Journey map, ship picker, logbook) scroll with wheel / touch-drag.
    setupListScrolling() {
        this.touchStart = null;
        this.touchDragged = false;

        this.canvas.addEventListener('wheel', (e) => {
            if (this.appScreen === 'journeyMap') {
                e.preventDefault();
                this.journeyMapScroll = this.clampJourneyScroll(this.journeyMapScroll + e.deltaY);
                return;
            }
            if (this.appScreen === 'logbook') {
                e.preventDefault();
                this.logbookScroll = clampLogbookScroll(this, this.logbookScroll + e.deltaY);
                return;
            }
            if (this.appScreen === 'optionsShip') {
                e.preventDefault();
                this.shipPickerScroll = this.clampShipPickerScroll(this.shipPickerScroll + e.deltaY);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            const scrollable = this.appScreen === 'journeyMap'
                || this.appScreen === 'optionsShip'
                || this.appScreen === 'logbook';
            if (!scrollable) return;
            const touch = e.touches[0];
            this.touchStart = {
                y: touch.clientY,
                x: touch.clientX,
                scroll: this.appScreen === 'journeyMap'
                    ? this.journeyMapScroll
                    : this.appScreen === 'logbook'
                        ? this.logbookScroll
                        : this.shipPickerScroll,
            };
            this.touchDragged = false;
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.touchStart) return;
            if (this.appScreen !== 'journeyMap'
                && this.appScreen !== 'optionsShip'
                && this.appScreen !== 'logbook') return;
            const touch = e.touches[0];
            const dy = touch.clientY - this.touchStart.y;
            const dx = touch.clientX - this.touchStart.x;

            if (Math.hypot(dx, dy) > 8) this.touchDragged = true;
            const next = this.touchStart.scroll - dy;
            if (this.appScreen === 'journeyMap') {
                this.journeyMapScroll = this.clampJourneyScroll(next);
            } else if (this.appScreen === 'logbook') {
                this.logbookScroll = clampLogbookScroll(this, next);
            } else {
                this.shipPickerScroll = this.clampShipPickerScroll(next);
            }
        }, { passive: true });
    }

    isClickInButton(x, y, button) {
        if (!button) return false;
        
        return x >= button.x && 
               x <= button.x + button.width && 
               y >= button.y && 
               y <= button.y + button.height;
    }

    // Play Again keeps you in the mode you were in — in Journey that means the
    // same level, not the next one.
    restart() {
        if (this.playMode === PLAY_MODE.journey) {
            this.beginJourneyLevel(this.journeyLevel);
        } else {
            this.beginRun(this.playMode, this.journeyLevel);
        }
    }

    setupPauseButton() {
        const button = document.createElement('button');
        button.innerHTML = '&#9208;'; // Two-bar pause motif
        button.setAttribute('aria-label', 'Pause');
        button.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: var(--ss-paper-tint, #EAE4D2);
            border: 1.5px solid var(--ss-ink, #1A1A1A);
            border-radius: 0;
            font-size: 22px;
            cursor: pointer;
            z-index: 1000;
            padding: 0;
            color: var(--ss-ink, #1A1A1A);
            opacity: 0.85;
            transition: transform var(--ss-dur-fast, 120ms) var(--ss-ease-standard, ease), opacity 1s ease;
            font-family: var(--ss-font-ui, system-ui, sans-serif);
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            visibility: hidden;
            opacity: 0;
            pointer-events: none;
        `;

        button.addEventListener('mouseover', () => {
            if (button.style.visibility === 'hidden') return;
            button.style.opacity = '1';
            button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseout', () => {
            if (button.style.visibility === 'hidden') return;
            // Match the in-run rest opacity used by updatePauseButtonVisibility.
            button.style.opacity = '0.8';
            button.style.transform = 'translateY(0)';
        });
        button.addEventListener('click', () => this.togglePause());

        this.canvas.parentElement.appendChild(button);
        this.pauseButton = button;

        // Escape always toggles pause. Space: Zigzag flips direction (same as
        // tap); Arc still pauses. While paused, Space resumes. Keys are ignored
        // for the whole level-clear flyout (it is not skippable). Run-start intro
        // locks steering (and Space zigzag) but still allows Escape to pause.
        window.addEventListener('keydown', (e) => {
            if (this.levelClear?.active) {
                e.preventDefault();
                return;
            }
            if (!this.isPlaying()) return;

            if (e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
                return;
            }
            if (this.levelIntro?.active) {
                if (e.code === 'Space') e.preventDefault();
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isPaused) {
                    this.togglePause();
                } else if (this.flightStyle === FLIGHT_STYLE.zigzag) {
                    if (!e.repeat) this.spacecraft.flipZigzag();
                } else {
                    this.togglePause();
                }
            }
        });

        // Initial state
        this.updatePauseButtonVisibility();
    }

    // Pause control only during an active run — and not while the pause menu is
    // up, since that screen carries its own Resume control. Hidden through the
    // ship intro + title beat; fades in last during the HUD reveal.
    updatePauseButtonVisibility() {
        if (this.pauseButton) {
            const playing = this.appScreen === 'playing'
                && !this.isGameOver
                && !this.isPaused;
            const suppress = !playing
                || this.levelIntro?.active
                || this.hudRevealPhase === 'title'
                || this.hudRevealPhase === 'wait';

            if (suppress) {
                // Drop transitions so visibility:hidden isn't delayed 300ms —
                // that delay was letting the button linger into the title beat.
                this.pauseButton.style.transition = 'none';
                this.pauseButton.style.visibility = 'hidden';
                this.pauseButton.style.opacity = '0';
                this.pauseButton.style.pointerEvents = 'none';
            } else {
                const a = this.hudRevealAlpha('pause');
                this.pauseButton.style.transition =
                    'transform var(--ss-dur-fast, 120ms) var(--ss-ease-standard, ease), opacity 1s ease';
                this.pauseButton.style.visibility = a > 0.01 ? 'visible' : 'hidden';
                this.pauseButton.style.opacity = String(0.8 * a);
                this.pauseButton.style.pointerEvents = a > 0.01 ? 'auto' : 'none';
            }
        }

        // Every screen change and pause toggle funnels through here, which makes
        // it the one reliable place to tell the native shell whether a run is
        // on screen and the display must stay awake. No-ops on the web.
        syncKeepAwake(this);
        // Same funnel: pin the Android display at its highest refresh mode
        // while a run is on screen (60<->120 VRR flaps read as jerk).
        syncHighRefresh(this);
    }

    // Tear down the submit-score modal. Shared by its close button and by
    // hardware back, which must dismiss the same way.
    closeNameInputModal() {
        this.removeNameInput();
        this.pendingHighScore = null;
        this.scoreSubmitted = false;
        this.gameOverScreen = 'main';
    }

    // Safe DOM teardown — input is mounted on #gameContainer, not always body.
    removeNameInput() {
        if (!this.nameInput) return;
        this.nameInput.remove();
        this.nameInput = null;
    }

    // True while the call-sign field has focus (IME likely up even before the
    // Keyboard plugin fires) or the plugin reports a non-zero IME height.
    isSoftKeyboardOpen() {
        if ((this.softKeyboardHeight || 0) > 0) return true;
        return !!(this.nameInput && document.activeElement === this.nameInput);
    }

    // Canvas-space rectangle still clear of the soft keyboard.
    // Prefer Cap Keyboard height (reliable on Android edge-to-edge); fall back
    // to visualViewport; when the field is focused but height is unknown, keep
    // the top ~58% of the stage so the pinned card still fits.
    getVisibleCanvasBounds() {
        let top = 0;
        let height = this.height;
        if (this.height <= 0) return { top, height };

        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleY = canvasRect.height / this.height;
        if (!(scaleY > 0)) return { top, height };

        const kbCss = this.softKeyboardHeight || 0;
        if (kbCss > 0) {
            const overlapCss = Math.max(
                0,
                (canvasRect.top + canvasRect.height) - (window.innerHeight - kbCss)
            );
            const inset = Math.min(this.height * 0.62, overlapCss / scaleY);
            return { top: 0, height: Math.max(200, this.height - inset) };
        }

        const vv = window.visualViewport;
        if (vv) {
            const visibleTop = Math.max(0, -canvasRect.top) / scaleY;
            const visibleBottom = Math.min(
                this.height,
                (vv.height - canvasRect.top) / scaleY
            );
            if (visibleBottom > visibleTop + 1) {
                const slice = visibleBottom - visibleTop;
                // Ignore tiny viewport jitter; only trust a real keyboard-sized cut.
                if (slice < this.height * 0.92) {
                    return { top: visibleTop, height: slice };
                }
            }
        }

        if (this.isSoftKeyboardOpen()) {
            return { top: 0, height: this.height * 0.58 };
        }
        return { top, height };
    }

    togglePause() {
        if (!this.isPlaying()) return;
        
        this.isPaused = !this.isPaused;
        this.updatePauseButtonVisibility();

        // Handle background music
        if (this.isPaused) {
            this.soundManager.pauseBGM();
        } else {
            this.soundManager.resumeBGM();
        }
    }

    checkCollisions() {
        if (this.spacecraft.invulnerable) return;

        const collision = this.obstacleManager.checkCollisions(this.spacecraft);
        if (collision) {
            if (this.spacecraft.shieldActive) {
                this.soundManager.playShieldCrash();
                this.spacecraft.deactivateShield();
                this.camera.shake = {
                    x: (Math.random() - 0.5) * this.baseUnit,
                    y: (Math.random() - 0.5) * this.baseUnit
                };
            } else {
                this.soundManager.playCrash(); // Play crash sound
                this.gameOver();
            }
        }
    }

    renderNameInputModal() {
        const ctx = this.ctx;

        // Soft charcoal dim — Mission Failed stays readable underneath.
        ctx.fillStyle = `rgba(${color.paperRgb}, 0.72)`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Keyboard open: pin the card to the top and put call sign + Submit
        // first. Android edge-to-edge often leaves the WebView full-bleed, so
        // centering a bottom-heavy form always loses the field under Gboard.
        // `!this.nameInput` covers the first frame before auto-focus lands.
        const keyboardOpen = this.isSoftKeyboardOpen() || !this.nameInput;
        const view = this.getVisibleCanvasBounds();
        const modalWidth = Math.min(360, this.width * 0.88);
        const idealHeight = keyboardOpen ? 340 : 460;
        const modalHeight = Math.min(idealHeight, Math.max(240, view.height - 12));
        const compact = keyboardOpen || modalHeight < 400;
        const pad = compact ? 16 : 28;
        const modalX = (this.width - modalWidth) / 2;
        const modalY = keyboardOpen
            ? view.top + 8
            : view.top + Math.max(8, (view.height - modalHeight) / 2);
        const contentLeft = modalX + pad;
        const contentRight = modalX + modalWidth - pad;
        const contentWidth = contentRight - contentLeft;

        drawFramedTile(ctx, modalX, modalY, modalWidth, modalHeight, { surface: color.paperTint });

        // Close (×)
        const closeSize = 26;
        this.closeButton = {
            x: modalX + modalWidth - closeSize - 12,
            y: modalY + 12,
            width: closeSize,
            height: closeSize,
        };
        ctx.save();
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const cb = this.closeButton;
        ctx.beginPath();
        ctx.moveTo(cb.x + 6, cb.y + 6);
        ctx.lineTo(cb.x + cb.width - 6, cb.y + cb.height - 6);
        ctx.moveTo(cb.x + cb.width - 6, cb.y + 6);
        ctx.lineTo(cb.x + 6, cb.y + cb.height - 6);
        ctx.stroke();
        ctx.restore();

        // Caption
        ctx.save();
        setLabelType(ctx, 12);
        ctx.fillStyle = color.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('SUBMIT SIGNAL', contentLeft, modalY + pad + 8);
        resetType(ctx);
        ctx.restore();

        let currentY = modalY + pad * 2;
        dottedLine(ctx, contentLeft, contentRight, currentY, 1.4, 7, color.ink30);
        currentY += compact ? pad * 0.75 : pad;

        const inputWidth = contentWidth;
        const inputHeight = compact ? 40 : 44;
        const buttonHeight = compact ? 44 : 50;
        const container = this.canvas.parentElement;

        // Ensure the DOM field exists before we place it (focus ⇒ keyboard).
        if (!this.nameInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = CALL_SIGN_MAX_LEN;
            input.placeholder = 'ENTER CALL SIGN';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.enterKeyHint = 'done';
            // 16px minimum avoids Android WebView zoom-on-focus.
            input.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 0;
                height: 0;
                box-sizing: border-box;
                font-size: 16px;
                border: none;
                border-bottom: 2px solid var(--ss-ink, #1A1A1A);
                border-radius: 0;
                outline: none;
                padding: 0 4px;
                background: transparent;
                color: var(--ss-ink, #1A1A1A);
                font-family: var(--ss-font-ui, 'Space Grotesk', 'Segoe UI', system-ui, sans-serif);
                font-weight: 500;
                letter-spacing: 0.04em;
                z-index: 5;
            `;

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.submitHighScore(input.value.trim());
                }
            });

            this.nameInput = input;
            (container || document.body).appendChild(input);
            input.focus({ preventScroll: true });
            window.scrollTo(0, 0);
        }

        // Keyboard / focused: call sign + Submit first (safe above Gboard).
        // Idle: stats first, then field + Submit (original reading order).
        const drawCallSignAndSubmit = () => {
            const inputX = contentLeft;
            const inputY = currentY;
            const input = this.nameInput;
            input.style.left = `${inputX}px`;
            input.style.top = `${inputY}px`;
            input.style.width = `${inputWidth}px`;
            input.style.height = `${inputHeight}px`;

            currentY = inputY + inputHeight + pad * 0.7;
            this.submitButton = this.drawBrandButton(
                contentLeft, currentY, inputWidth, buttonHeight, 'Submit', {
                    primary: true,
                    tag: '\u2191',
                }
            );
            this.submitButton.enabled = !!(input.value && input.value.trim().length > 0);
            currentY += buttonHeight;

            if (this.submitError) {
                currentY += 14;
                ctx.save();
                setLabelType(ctx, 10);
                ctx.fillStyle = color.signal;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(this.submitError.toUpperCase(), contentLeft, currentY);
                resetType(ctx);
                ctx.restore();
                currentY += 8;
            }
            currentY += pad * 0.55;
        };

        const valuePx = compact ? 20 : 28;
        const stackGap = compact ? pad * 0.7 : pad * 1.35;
        const drawStat = (value, unitLabel, caption) => {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            setMonoType(ctx, valuePx);
            ctx.fillStyle = color.ink;
            ctx.fillText(value, contentLeft, currentY);
            const cursor = contentLeft + ctx.measureText(value).width;
            if (unitLabel) {
                setLabelType(ctx, 11);
                ctx.fillStyle = color.ink55;
                ctx.fillText(unitLabel, cursor + 8, currentY);
            }
            currentY += compact ? 12 : 18;
            setLabelType(ctx, 10);
            ctx.fillStyle = color.ink55;
            ctx.fillText(caption, contentLeft, currentY);
            resetType(ctx);
            ctx.restore();
            currentY += stackGap;
        };

        const drawStats = () => {
            drawStat(ScoreService.formatScore(this.finalScore), 'KM', 'DISTANCE');
            drawStat(
                ScoreService.formatScore(this.obstaclesDestroyed),
                null,
                'ASTEROIDS DESTROYED'
            );
            drawStat(`#${this.pendingHighScore.rank}`, null, 'YOUR RANK');
        };

        if (keyboardOpen) {
            drawCallSignAndSubmit();
            dottedLine(ctx, contentLeft, contentRight, currentY, 1.4, 7, color.ink30);
            currentY += pad * 0.65;
            drawStats();
        } else {
            drawStats();
            dottedLine(ctx, contentLeft, contentRight, currentY, 1.4, 7, color.ink30);
            currentY += pad * 0.7;
            drawCallSignAndSubmit();
        }
    }

    async submitHighScore(name) {
        if (!name.trim()) return;
        this.submitError = null;

        try {
            await ScoreService.saveScore(
                this.finalScore,
                name,
                this.obstaclesDestroyed,
                this.shipSkinId,
            );

            track('submit_highscore', {
                'score': this.finalScore,
                'player_name': name,
                'obstacles_destroyed': this.obstaclesDestroyed,
                'ship_id': this.shipSkinId,
                'rank': this.currentRank
            });

            this.removeNameInput();

            this.pendingHighScore = null;
            this.scoreSubmitted = true;
            await this.loadHighScores();
            this.gameOverScreen = 'highscores';
        } catch (error) {
            console.error('Error saving score:', error);
            if (error instanceof CallSignRejectedError) {
                this.submitError = error.message;
            } else if (error instanceof LeaderboardUnavailableError) {
                this.submitError = 'Leaderboard offline in this build.';
            } else {
                this.submitError = 'Could not submit. Try again.';
            }
            if (this.nameInput) {
                this.nameInput.style.borderBottomColor = color.signal;
            }
        }
    }

    // Clean up input when game restarts or component unmounts
    cleanup() {
        this.removeNameInput();
    }

    showScoreModal() {
        const modal = document.createElement('div');
        modal.className = 'score-modal';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 10px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: white;
            padding: 5px 10px;
        `;
        
        closeButton.addEventListener('click', () => {
            modal.remove();
            this.resetGame();  // Reset the game state when modal is closed
        });

        modal.appendChild(closeButton);
        
        // Rest of your existing modal content...
        // ...

        document.body.appendChild(modal);
    }
} 