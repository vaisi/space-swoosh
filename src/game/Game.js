// Game.js
// Core game loop + rendering: main menu, mode select, options (ship skins),
// high scores, gameplay, and game-over / level-outcome screens.
// Changes:
// - iOS native: cap update/render to ~60 Hz (skip rAF ticks under 16.5 ms) so
//   ProMotion 120 Hz does not double Canvas2D fill-rate; tickScale still uses
//   wall-clock dt so travel speed stays snappy. Opaque 2D context on native.
// - Snappy pacing (web + Android): one update per paint, `tickScale = dt * 120`.
//   Ship updates before camera. Camera is a catch-up follower (cruise + accelerate
//   when the ship rides too high) so climb feels smooth, not spring-sluggish.
//   KM from abs(Δcamera.y) * (100/60).
// - HiDPI: setupCanvas renders the backing store at devicePixelRatio (capped at
//   3 on web / 2 on native) and scales the context so all game math stays in
//   CSS pixels via this.width / this.height. Menu stamp is BUILD 23.
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
// - Clearing a Journey level runs a flyout (game/LevelClearSequence.js) instead of
//   holding the world for a beat: the sequence owns the `gameover` update/render
//   branches while `levelClear` is live, and drives `gameOverAlpha` itself. Input
//   is swallowed until it finishes (not skippable). `renderWorld()` takes
//   `{ hudAlpha }` so the readout can fade ahead of the world, and
//   `drawBrandButton()` accepts a `labelPx` override for buttons too narrow for
//   the default label size.
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
import { SoundManager } from '../managers/SoundManager.js';
import { CallSignRejectedError, ScoreService } from '../services/ScoreService.js';
import { track } from '../services/Analytics.js';
import {
    getSkinPriceLabel,
    isSkinOwned,
    isSkinPremium,
    purchaseSkin,
    restorePurchases,
} from '../services/Entitlements.js';
import { syncKeepAwake } from '../native/index.js';
import { dottedLine } from '../utils/DrawUtils.js';
import { color, font } from '../brand/tokens.js';
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
    renderModeSelect,
    handleModeSelectClick,
} from '../ui/screens/ModeSelectScreen.js';
import {
    renderJourneyMap,
    handleJourneyMapClick,
} from '../ui/screens/JourneyMapScreen.js';
import {
    renderLevelOutcome,
    handleLevelOutcomeClick,
} from '../ui/screens/LevelOutcomeScreen.js';
import { LevelClearSequence } from './LevelClearSequence.js';
import { clamp01 } from '../utils/math.js';
import { pickCopy, journeyFlavorPool } from '../brand/CopyBank.js';
import {
    FLIGHT_STYLE,
    loadFlightStyle,
    saveFlightStyle,
} from '../config/flightStyle.js';

export class Game {
    constructor(config) {
        console.log('Game initializing...'); // Debug log
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        // Opaque buffer on native: we always paint paper first; WKWebView skips
        // alpha compositing. Web keeps the default (transparent) context.
        const ctxOpts = Capacitor.isNativePlatform() ? { alpha: false } : undefined;
        this.ctx = this.canvas.getContext('2d', ctxOpts);
        this.baseUnit = 0;
        this.score = 0;
        this.points = 0; // Points system: +1 per asteroid destroyed, +10 per collectible
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.explosionParticles = [];
        this.gameOverScreen = 'main'; // nested: 'main' or 'highscores' while appScreen is gameover
        // menu | modeSelect | journeyMap | options | optionsShip |
        // optionsControls | optionsSound | highscores | playing | gameover
        this.appScreen = 'menu';
        this.menuFlavor = pickCopy('menu');
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
        // iOS ProMotion can fire rAF at 120 Hz; Canvas2D can't keep up in
        // WKWebView. Cap worked frames to ~60 Hz; Android/web stay unlocked.
        this.iosPaintCap =
            Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
        this.minFrameMs = 1000 / 60;
        this.obstaclesDestroyed = 0; // Shield-smash count; Journey's third star
        this.scoreSubmitted = false; // Track if score has been submitted
        this.highScoreTab = 'distance'; // Add tab state

        // Journey state. Progress is local-only; the leaderboard stays Open World.
        this.journeyProgress = loadJourneyProgress();
        this.journeyLevel = nextPlayableLevel(this.journeyProgress);
        this.journeyMapScroll = 0;
        this.shipPickerScroll = 0;
        // Ship picker: reveal Play now after the player taps a vessel.
        this.shipPickerOfferPlay = false;
        this.journeyMapNeedsScroll = true;
        this.levelOutcome = null;
        this.runOutcome = null; // 'crashed' | 'completed' while on the end screen
        this.levelClear = null; // the flyout cinematic, while it's running
        this.finishLineWorldY = null; // locked when a Journey goal is crossed

        this.setupCanvas();
        // The managers read `profile` as they're built, so the run's rules have to
        // exist before the world does.
        this.playMode = PLAY_MODE.openWorld;
        this.profile = createRunProfile(this, this.playMode);
        this.initializeGame();
        
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupEventListeners();
        this.powerUpManager = new PowerUpManager(this);
        this.collectibleManager = new CollectibleManager(this);
        this.styleSwooshManager = new StyleSwooshManager(this);
        this.wallBoopManager = new WallBoopManager(this);
        this.soundManager = new SoundManager();
        this.soundInitialized = false;
        
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
        });
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        // Logical (CSS) size — all game math and hit-testing stay in these units.
        const cssWidth = container.clientWidth;
        const cssHeight = container.clientHeight;
        // Web 3×; native 2× (1× looked pixelated and did not fix pacing).
        const maxDpr = Capacitor.isNativePlatform() ? 2 : 3;
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

    gameLoop() {
        // Only run the game loop if the tab is visible
        if (!document.hidden) {
            const currentTime = performance.now();
            const elapsedMs = currentTime - this.lastTime;

            // iOS: skip sub-16.5 ms rAF ticks so we paint ~60 Hz on ProMotion.
            // lastTime stays put so the next worked frame gets the full wall dt.
            if (this.iosPaintCap && elapsedMs < this.minFrameMs) {
                requestAnimationFrame(() => this.gameLoop());
                return;
            }

            if (!this.isPaused || this.appScreen !== 'playing') {
                // One update per paint — smooth with the display. tickScale maps
                // wall time onto the snappy ~120 Hz classic-tick reference.
                const frameTime = Math.min(elapsedMs / 1000, 0.05);
                this.lastTime = currentTime;
                this.tickScale = frameTime * this.snappyHz;
                this.dt = (1 / 60) * this.tickScale;
                this.update(frameTime);
            } else {
                this.lastTime = currentTime;
            }

            this.render();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        const currentTime = performance.now();

        if (this.appScreen === 'gameover' && this.isGameOver) {
            // A cleared level flies out instead of exploding, and the sequence
            // owns everything that moves — including the screen's fade-in.
            if (this.levelClear) {
                this.levelClear.update(deltaTime);
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
            // Ship first so the catch-up camera reacts to this frame's lead.
            this.spacecraft.update();
            const prevCameraY = this.camera.y;
            this.camera.update(1);

            // KM from world travel only — locked to camera motion this frame.
            this.score += Math.abs(this.camera.y - prevCameraY) * (100 / 60);

            this.obstacleManager.update();
            this.milestoneManager.update();
            this.powerUpManager.update();
            this.collectibleManager.update();
            this.styleSwooshManager.update();
            this.wallBoopManager.update();

            if (this.profile.isRunComplete(this.score)) {
                this.completeRun();
            }
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

            if (this.runOutcome === 'crashed' && timeSinceGameOver < deceleration) {
                for (const particle of this.explosionParticles) {
                    this.ctx.fillStyle = `rgba(26, 26, 26, ${particle.opacity})`;
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
            } else {
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

        this.renderWorld();

        if (this.isPaused) {
            this.renderPauseOverlay();
        }
    }

    // The run itself: obstacles, ship, pickups, effects and the HUD. Split out so
    // the level-clear flyout can keep showing it after gameplay has stopped —
    // where the HUD fades ahead of the world, hence `hudAlpha`.
    renderWorld({ hudAlpha = 1 } = {}) {
        this.obstacleManager.render(this.ctx);

        // Draw under the ship so crossing the goal reads as flying through it.
        this.renderFinishLine();

        if (this.spacecraft.isVisible) {
            this.spacecraft.render(this.ctx);
        }

        this.milestoneManager.render(this.ctx);
        this.powerUpManager.render(this.ctx);
        this.collectibleManager.render(this.ctx);
        this.styleSwooshManager.render(this.ctx);
        this.wallBoopManager.render(this.ctx);

        if (hudAlpha <= 0) return;
        this.ctx.save();
        this.ctx.globalAlpha *= hudAlpha;
        this.renderHud();
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

    // Gameplay HUD — Space Mono tabular numerals with small uppercase Space
    // Grotesk unit/label chips, so the readout stays rock-steady as it ticks.
    renderHud() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const inset = unit * 2;
        const journey = !this.profile.isEndless;

        // Distance readout.
        const distStr = ScoreService.formatScore(this.score);
        const numSize = unit * 2.2;
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = color.ink;

        // In Journey the run has a finish line, so the readout is led by the
        // level and closed by a bar showing how much of it is left.
        let distY = inset + numSize;
        if (journey) {
            const chipPx = Math.max(9, unit * 0.85);
            setLabelType(ctx, chipPx);
            ctx.fillStyle = color.ink55;
            ctx.fillText(`LEVEL ${this.profile.level}`, inset, inset + chipPx);
            resetType(ctx);
            distY += chipPx * 1.9;
        }

        setMonoType(ctx, numSize);
        ctx.fillStyle = color.ink;
        ctx.fillText(distStr, inset, distY);
        const distW = ctx.measureText(distStr).width;

        // KM unit label — small uppercase Space Grotesk beside the figure.
        const unitSize = Math.max(10, unit * 0.9);
        setLabelType(ctx, unitSize);
        ctx.fillStyle = color.ink55;
        ctx.fillText('KM', inset + distW + unit * 0.7, distY);

        let goalBarH = 0;
        if (journey) {
            goalBarH = unit * 1.8;
            this.drawGoalBar(inset, distY + unit * 0.9, Math.min(unit * 16, this.width - inset * 2));
        }

        // Obstacles destroyed — in Journey, also the smash-star mission target.
        const rowY = distY + goalBarH + unit * 1.9;
        const lblSize = Math.max(9, unit * 0.8);
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

        // Points — the reward metric. A small Signal-Blue sparkle marks the row,
        // then a POINTS label + mono figure (matching the DESTROYED row above).
        const ptsRowY = rowY + unit * 1.8;
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

        resetType(ctx);
        ctx.restore();
    }

    // Journey's goal bar: a hairline track with an ink fill, closed by the
    // target distance. Flat geometry, same idiom as the dotted rules.
    drawGoalBar(x, y, width) {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const height = unit * 0.5;
        const filled = width * this.profile.progress(this.score);

        ctx.save();
        ctx.fillStyle = color.ink12;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = color.ink;
        ctx.fillRect(x, y, filled, height);

        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

        const labelPx = Math.max(8.5, unit * 0.78);
        setLabelType(ctx, labelPx);
        ctx.fillStyle = color.ink55;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(
            `GOAL ${ScoreService.formatScore(this.profile.goalScore)}`,
            x,
            y + height + labelPx * 1.35
        );
        resetType(ctx);
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
        ctx.fillStyle = 'rgba(225, 217, 193, 0.92)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();

        this.drawScreenFrame();

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

    // A crisp framed border around the screen so the end screens read as one
    // clean panel, set well in from the edges for breathing room.
    drawScreenFrame() {
        const m = this.baseUnit * 2.4;
        this.ctx.save();
        this.ctx.strokeStyle = color.ink12;
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(m + 0.75, m + 0.75, this.width - m * 2 - 1.5, this.height - m * 2 - 1.5);
        this.ctx.restore();
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
            const backW = Math.max(unit * 9, this.width * 0.19);
            backRect = this.drawBrandButton(L.left, y, backW, barH, 'Back', { tag: '\u2190' });
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

        this.drawScreenFrame();

        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 6 : unit * 5.4;
        const buttonGap = unit * 1.6;
        const buttonsH = buttonHeight * 3 + buttonGap * 2;

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
            ? 'BUILD 23 · NATIVE'
            : 'BUILD 23 · WEB';
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

        // Ship section — live preview of the current skin plus its name.
        drawSkinPreview(ctx, this.shipSkinId, L.centerX, y + previewR * 1.2, previewR);
        ctx.save();
        setLabelType(ctx, namePx);
        ctx.fillStyle = color.ink55;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getSkin(this.shipSkinId).name.toUpperCase(), L.centerX, y + previewH + L.row);
        resetType(ctx);
        ctx.restore();

        y += shipH + L.section * 1.2;

        const bx = L.centerX - buttonWidth / 2;
        this.menuButtons = {};

        this.menuButtons.play = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Play', { primary: true, tag: '\u25B6' }
        );
        y += buttonHeight + buttonGap;
        this.menuButtons.options = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Options', { tag: '\u2699' }
        );
        y += buttonHeight + buttonGap;
        this.menuButtons.highScores = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'High Scores', { tag: '#' }
        );
    }

    // Options hub — Ship / Controls / Sound / Restore Purchases.
    renderOptionsHub() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        this.drawScreenFrame();

        const header = this.drawScreenHeader('OPTIONS', { back: true });
        this.optionsHubButtons = { back: header.backRect };

        const subPx = L.isMobile ? Math.min(unit * 1.35, 15) : unit * 1.2;
        const buttonWidth = Math.min(unit * 30, L.width);
        const buttonHeight = L.isMobile ? unit * 5.4 : unit * 5;
        const buttonGap = unit * 1.4;
        const buttonsH = buttonHeight * 4 + buttonGap * 3;
        const statusPx = Math.max(10, unit * 0.95);
        const statusH = this.purchaseStatus ? statusPx * 1.6 + L.block : 0;
        const subH = subPx * 1.4;

        const blockH = subH + L.section + buttonsH + statusH;
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
        // Required on iOS (guideline 3.1.1) whenever the app sells non-consumables.
        this.optionsHubButtons.restore = this.drawBrandButton(
            bx, y, buttonWidth, buttonHeight, 'Restore Purchases', { tag: '\u21A9' }
        );

        if (this.purchaseStatus) {
            y += buttonHeight + L.block;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            setLabelType(ctx, statusPx);
            ctx.fillStyle = color.ink55;
            ctx.fillText(this.purchaseStatus.toUpperCase(), L.centerX, y + statusPx * 0.5);
            resetType(ctx);
            ctx.restore();
        }
    }

    // Ship picker — fixed-size cards in a 2-col grid. Longer rosters scroll
    // inside the band between the blurb and the footer. After the player taps a
    // vessel, a Play now CTA jumps straight into Open World.
    renderOptionsShip() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);

        this.drawScreenFrame();

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

        this.drawScreenFrame();

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

        this.drawScreenFrame();

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

    async handleRestorePurchases() {
        if (this.purchaseBusy) return;
        this.purchaseBusy = true;
        this.setPurchaseStatus('Restoring…', 0);
        try {
            const result = await restorePurchases();
            if (result.ok) {
                // If the equipped skin was locked and is now owned, keep it;
                // otherwise fall back through loadShipSkinId.
                this.shipSkinId = loadShipSkinId();
                this.setPurchaseStatus(result.message || 'Restored.');
                track('restore_purchases', { count: result.count || 0 });
            } else {
                this.setPurchaseStatus(result.message || 'Restore unavailable.');
            }
        } finally {
            this.purchaseBusy = false;
        }
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
        this.updatePauseButtonVisibility();

        if (this.profile.introMessage) {
            this.milestoneManager.showMessage(this.profile.introMessage);
        }
        if (this.soundInitialized) {
            this.soundManager.playBGM();
        }
    }

    beginJourneyLevel(level) {
        this.beginRun(PLAY_MODE.journey, level);
    }

    // Tear down whatever the run left behind and land on `nextScreen`.
    leaveRun(nextScreen) {
        if (this.nameInput) {
            document.body.removeChild(this.nameInput);
            this.nameInput = null;
        }
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
        this.finishLineWorldY = null;
        this.appScreen = nextScreen;
        this.soundManager?.stopBGM?.();
        this.updatePauseButtonVisibility();
    }

    goToMenu() {
        this.leaveRun('menu');
        this.menuFlavor = pickCopy('menu');
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
        this.finishLineWorldY = null;
        this.endFlavor = null;
        // Dropped with the outcome itself: otherwise the previous level's button
        // boxes are still live during the next level's clear beat.
        this.levelOutcomeButtons = null;
        this.scoreSubmitted = false;
        this.pendingHighScore = null;

        if (this.nameInput) {
            document.body.removeChild(this.nameInput);
            this.nameInput = null;
        }

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

        this.drawScreenFrame();

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

        if (this.pendingHighScore?.shouldPromptName) {
            this.renderNameInputModal();
            return;
        }

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
    }

    renderHighScores() {
        const ctx = this.ctx;
        const unit = this.baseUnit;
        const L = screenLayout(this, unit);
        const isMobile = L.isMobile;
        const padding = unit * 3;

        this.drawScreenFrame();

        const header = this.drawScreenHeader('LEADERBOARD', { back: true });
        this.highScoresBackButton = header.backRect;

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

        // Scores list with dotted-trail separators.
        const startY = tabY + tabHeight + padding * 1.4;
        const scoreHeight = isMobile ? unit * 3.6 : unit * 3.1;
        const scoreSpacing = unit * 1;
        const numPx = isMobile ? Math.min(unit * 1.8, 21) : unit * 1.6;
        const namePx = isMobile ? Math.min(unit * 1.8, 21) : unit * 1.6;
        const leftX = this.width * 0.2;
        const rightX = this.width * 0.8;

        if (!this.highScores || this.highScores.length === 0) {
            ctx.save();
            ctx.fillStyle = color.ink55;
            ctx.font = `500 ${namePx}px ${font.ui}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No signals logged. Be the first.', this.width / 2, startY + scoreHeight);
            ctx.restore();
            return;
        }

        this.highScores.forEach((score, index) => {
            const y = startY + (scoreHeight + scoreSpacing) * index;
            const midY = y + scoreHeight / 2;
            const isTop = index < 3;

            ctx.save();
            ctx.textBaseline = 'middle';

            // Rank — mono, top 3 in full ink.
            ctx.fillStyle = isTop ? color.ink : color.ink55;
            setMonoType(ctx, numPx);
            ctx.textAlign = 'right';
            ctx.fillText(`${index + 1}`, leftX, midY);

            // Name — Space Grotesk.
            ctx.fillStyle = color.ink;
            ctx.font = `${isTop ? 700 : 500} ${namePx}px ${font.ui}`;
            ctx.textAlign = 'left';
            ctx.fillText(score.player_name, leftX + unit * 1.2, midY);

            // Score — mono figure, optional KM label for distance.
            setMonoType(ctx, numPx, 700);
            ctx.fillStyle = color.ink;
            ctx.textAlign = 'right';
            if (this.highScoreTab === 'distance') {
                const sw = ctx.measureText(score.formattedScore).width;
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

            if (index < this.highScores.length - 1) {
                dottedLine(ctx, leftX, rightX, y + scoreHeight + scoreSpacing / 2, 1.4, 7);
            }
        });
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
        this.soundManager?.stopBGM?.();
        // Snapshot the result first: the flyout that follows must not be able to
        // change what the outcome screen reports. Lock the finish line here so
        // the ship can fly through a fixed mark rather than dragging it along.
        this.finishJourneyLevel(true);
        this.finishLineWorldY = this.spacecraft.y;
        this.levelClear = new LevelClearSequence(this);
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
            'stars': result.stars.filter(Boolean).length,
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
                
                // Only show score submission immediately for top 20
                const isTop20 = rank <= 20;
                
                this.pendingHighScore = isTop20 ? {
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

            // Update explosion particles during the first 2 seconds
            if (timeSinceGameOver < deceleration) {
                // Expand and update particles
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
            } else if (timeSinceGameOver >= deceleration) {
                // Clear particles after deceleration
                this.explosionParticles = [];
                // Start fading in game over screen
                this.gameOverAlpha = Math.min(1, (timeSinceGameOver - deceleration) / 1000);
            }
        }
    }

    setupEventListeners() {
        const handleInteraction = async (clientX, clientY) => {
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

            if (this.appScreen === 'journeyMap') {
                handleJourneyMapClick(this, x, y);
                return;
            }

            if (this.appScreen === 'menu' && this.menuButtons) {
                if (this.isClickInButton(x, y, this.menuButtons.play)) {
                    this.appScreen = 'modeSelect';
                    this.updatePauseButtonVisibility();
                } else if (this.isClickInButton(x, y, this.menuButtons.options)) {
                    this.appScreen = 'options';
                    this.updatePauseButtonVisibility();
                } else if (this.isClickInButton(x, y, this.menuButtons.highScores)) {
                    this.highScoresReturnScreen = 'menu';
                    this.appScreen = 'highscores';
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
                if (this.isClickInButton(x, y, this.optionsHubButtons.restore)) {
                    await this.handleRestorePurchases();
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
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.obstaclesTab) && this.highScoreTab !== 'obstacles') {
                    this.highScoreTab = 'obstacles';
                    await this.loadHighScores();
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

            // Handle name input modal
            if (this.pendingHighScore?.shouldPromptName) {
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
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.obstaclesTab) && this.highScoreTab !== 'obstacles') {
                    this.highScoreTab = 'obstacles';
                    await this.loadHighScores();
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
            if ((this.appScreen === 'journeyMap' || this.appScreen === 'optionsShip')
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

    // Tall lists (Journey map, ship picker) scroll with wheel / touch-drag.
    setupListScrolling() {
        this.touchStart = null;
        this.touchDragged = false;

        this.canvas.addEventListener('wheel', (e) => {
            if (this.appScreen === 'journeyMap') {
                e.preventDefault();
                this.journeyMapScroll = this.clampJourneyScroll(this.journeyMapScroll + e.deltaY);
                return;
            }
            if (this.appScreen === 'optionsShip') {
                e.preventDefault();
                this.shipPickerScroll = this.clampShipPickerScroll(this.shipPickerScroll + e.deltaY);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.appScreen !== 'journeyMap' && this.appScreen !== 'optionsShip') return;
            const touch = e.touches[0];
            this.touchStart = {
                y: touch.clientY,
                x: touch.clientX,
                scroll: this.appScreen === 'journeyMap'
                    ? this.journeyMapScroll
                    : this.shipPickerScroll,
            };
            this.touchDragged = false;
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.touchStart) return;
            if (this.appScreen !== 'journeyMap' && this.appScreen !== 'optionsShip') return;
            const touch = e.touches[0];
            const dy = touch.clientY - this.touchStart.y;
            const dx = touch.clientX - this.touchStart.x;

            if (Math.hypot(dx, dy) > 8) this.touchDragged = true;
            const next = this.touchStart.scroll - dy;
            if (this.appScreen === 'journeyMap') {
                this.journeyMapScroll = this.clampJourneyScroll(next);
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
        this.beginRun(this.playMode, this.journeyLevel);
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
            transition: transform var(--ss-dur-fast, 120ms) var(--ss-ease-standard, ease), opacity 0.3s, visibility 0.3s;
            font-family: var(--ss-font-ui, system-ui, sans-serif);
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        `;
        
        button.addEventListener('mouseover', () => { button.style.opacity = '1'; button.style.transform = 'translateY(-2px)'; });
        button.addEventListener('mouseout', () => { button.style.opacity = '0.85'; button.style.transform = 'translateY(0)'; });
        button.addEventListener('click', () => this.togglePause());
        
        this.canvas.parentElement.appendChild(button);
        this.pauseButton = button;

        // Escape always toggles pause. Space: Zigzag flips direction (same as
        // tap); Arc still pauses. While paused, Space resumes. Keys are ignored
        // for the whole level-clear flyout (it is not skippable).
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
    // up, since that screen carries its own Resume control.
    updatePauseButtonVisibility() {
        if (this.pauseButton) {
            if (this.appScreen === 'playing' && !this.isGameOver && !this.isPaused) {
                this.pauseButton.style.visibility = 'visible';
                this.pauseButton.style.opacity = '0.8';
            } else {
                this.pauseButton.style.visibility = 'hidden';
                this.pauseButton.style.opacity = '0';
            }
        }

        // Every screen change and pause toggle funnels through here, which makes
        // it the one reliable place to tell the native shell whether a run is
        // on screen and the display must stay awake. No-ops on the web.
        syncKeepAwake(this);
    }

    // Tear down the submit-score modal. Shared by its close button and by
    // hardware back, which must dismiss the same way.
    closeNameInputModal() {
        if (this.nameInput) {
            this.nameInput.remove();
            this.nameInput = null;
        }
        this.pendingHighScore = null;
        this.scoreSubmitted = false;
        this.gameOverScreen = 'main';
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

        // Soft ink dim to focus attention while keeping the paper world visible.
        ctx.fillStyle = 'rgba(26, 26, 26, 0.42)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Framed motif-tile card, sized relative to the canvas.
        const modalWidth = Math.min(384, this.width * 0.88);
        const modalHeight = 344;
        const modalX = (this.width - modalWidth) / 2;
        const modalY = (this.height - modalHeight) / 2;
        const padding = 32;

        drawFramedTile(ctx, modalX, modalY, modalWidth, modalHeight, { surface: color.paperTint });

        // Caption-bar hairline under the header.
        ctx.save();
        ctx.strokeStyle = color.ink12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(modalX + 0.75, modalY + padding * 2 + 0.5);
        ctx.lineTo(modalX + modalWidth - 0.75, modalY + padding * 2 + 0.5);
        ctx.stroke();
        ctx.restore();

        // Close (×) button top-right — wired to the existing modal-close handler.
        const closeSize = 26;
        this.closeButton = {
            x: modalX + modalWidth - closeSize - 12,
            y: modalY + 12,
            width: closeSize,
            height: closeSize
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

        let currentY = modalY + padding;

        // Header — uppercase label + a mono rank micro-tag on the right.
        ctx.save();
        ctx.fillStyle = color.ink;
        setLabelType(ctx, 13);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('SUBMIT SIGNAL', modalX + padding, currentY + 10);

        setMonoType(ctx, 13);
        ctx.textAlign = 'right';
        ctx.fillStyle = color.ink55;
        ctx.fillText(`RANK #${this.pendingHighScore.rank}`, this.closeButton.x - 12, currentY + 10);
        resetType(ctx);
        ctx.restore();

        currentY += padding * 2 + padding * 0.6;

        // Big score — Space Mono figure + KM label.
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        setMonoType(ctx, 34);
        ctx.fillStyle = color.ink;
        const scoreText = ScoreService.formatScore(this.finalScore);
        const scoreWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, modalX + padding, currentY);

        setLabelType(ctx, 12);
        ctx.fillStyle = color.ink55;
        ctx.fillText('KM', modalX + padding + scoreWidth + 10, currentY);

        currentY += padding * 0.9;

        setLabelType(ctx, 10);
        ctx.fillStyle = color.ink55;
        ctx.fillText(`${this.obstaclesDestroyed} DESTROYED`, modalX + padding, currentY);
        resetType(ctx);
        ctx.restore();

        currentY += padding * 1.4;

        // Name input (DOM element positioned over the canvas).
        const inputWidth = modalWidth - padding * 2;
        const inputHeight = 48;
        const inputX = modalX + padding;

        if (!this.nameInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 15;
            input.placeholder = 'ENTER CALL SIGN';

            const canvasRect = this.canvas.getBoundingClientRect();
            const scaledX = canvasRect.left + (inputX * canvasRect.width / this.width);
            const scaledY = canvasRect.top + (currentY * canvasRect.height / this.height);
            const scaledWidth = inputWidth * canvasRect.width / this.width;
            const scaledHeight = inputHeight * canvasRect.height / this.height;

            input.style.cssText = `
                position: absolute;
                left: ${scaledX}px;
                top: ${scaledY}px;
                width: ${scaledWidth}px;
                height: ${scaledHeight}px;
                box-sizing: border-box;
                font-size: 16px;
                border: none;
                border-bottom: 2px solid #1A1A1A;
                border-radius: 0;
                outline: none;
                padding: 0 4px;
                background: transparent;
                color: #1A1A1A;
                font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
                font-weight: 500;
                letter-spacing: 0.04em;
            `;

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.submitHighScore(input.value.trim());
                }
            });

            this.nameInput = input;
            document.body.appendChild(input);
            input.focus();
        }

        currentY += inputHeight + padding;

        // Submit button (primary framed tile).
        const buttonHeight = 52;
        this.submitButton = this.drawBrandButton(
            modalX + padding, currentY, inputWidth, buttonHeight, 'Submit', { primary: true, tag: '\u2191' }
        );
        this.submitButton.enabled = this.nameInput && this.nameInput.value.trim().length > 0;

        if (this.submitError) {
            ctx.save();
            setLabelType(ctx, 10);
            ctx.fillStyle = color.signal;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(this.submitError.toUpperCase(), modalX + padding, currentY + buttonHeight + 18);
            resetType(ctx);
            ctx.restore();
        }
    }

    async submitHighScore(name) {
        if (!name.trim()) return;
        this.submitError = null;

        try {
            await ScoreService.saveScore(
                this.finalScore,
                name,
                this.obstaclesDestroyed
            );

            track('submit_highscore', {
                'score': this.finalScore,
                'player_name': name,
                'obstacles_destroyed': this.obstaclesDestroyed,
                'rank': this.currentRank
            });

            if (this.nameInput) {
                this.nameInput.remove();
                this.nameInput = null;
            }

            this.pendingHighScore = null;
            this.scoreSubmitted = true;
            await this.loadHighScores();
            this.gameOverScreen = 'highscores';
        } catch (error) {
            console.error('Error saving score:', error);
            this.submitError = error instanceof CallSignRejectedError
                ? error.message
                : 'Could not submit. Try again.';
            if (this.nameInput) {
                this.nameInput.style.borderBottomColor = '#0000FF';
            }
        }
    }

    // Clean up input when game restarts or component unmounts
    cleanup() {
        if (this.nameInput) {
            document.body.removeChild(this.nameInput);
            this.nameInput = null;
        }
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