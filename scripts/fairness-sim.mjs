// fairness-sim.mjs
// Headless zigzag bot through the real spawner. Prints deaths and peak demand
// for every Journey day, six Open Space bands, and Hazard Lab.
// Changes:
// - Created file. `npm run fairness`. A death is one lethal overlap; the bot
//   then ignores hits for 0.45s. Flagged when a run averages 3 or more deaths.
//   The bot flips away from a hit it can see 0.22s ahead. Not a ship port.

const WIDTH = 430;
const HEIGHT = 900;
const SECONDS = 10;
const SEEDS = 2;
const DT = 1 / 30;
const FLAG_DEATHS = 3;

function stubGlobal(name, value) {
    try {
        globalThis[name] = value;
    } catch {
        // Node 22 already exposes some of these as getters.
    }
}
stubGlobal('window', globalThis);
stubGlobal('location', { search: '', href: 'http://127.0.0.1/' });
stubGlobal('performance', globalThis.performance || { now: () => 0 });
stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
stubGlobal('document', {
    title: '',
    readyState: 'complete',
    documentElement: { style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} } },
    body: { style: {}, classList: { add() {}, remove() {} }, appendChild() {} },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    getElementById() { return null; },
    createElement() {
        return { style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} };
    },
});

const { GameConfig } = await import('../src/config/GameConfig.js');
const { ObstacleManager } = await import('../src/managers/ObstacleManager.js');
const { JourneyProfile } = await import('../src/modes/JourneyProfile.js');
const { OpenWorldProfile } = await import('../src/modes/RunProfile.js');
const { HazardLabProfile } = await import('../src/modes/HazardLabProfile.js');

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function makeGame(profile, score) {
    const u = Math.min(WIDTH, HEIGHT) * 0.018;
    const game = {
        width: WIDTH,
        height: HEIGHT,
        baseUnit: u,
        dt: DT,
        snappyHz: 120,
        score,
        config: GameConfig,
        TOTAL_DISTANCE: 1e7,
        camera: { y: 0, speed: 1, shake: null, getRelativeY(y) { return y - this.y; } },
        profile: null,
        milestoneManager: { showMessage() {}, currentMessage: null },
        logbook: null,
        levelClear: null,
        points: 0,
        obstaclesDestroyed: 0,
        deaths: 0,
        invuln: 0,
        isAtOrPastFinaleGate() { return false; },
        noteHudDestroyedFromSmash() {},
        gameOver() {
            if (this.invuln > 0) return;
            this.deaths += 1;
            this.invuln = 0.45;
        },
    };
    game.profile = profile(game);
    const radius = u * (GameConfig.spacecraft.radius || 1);
    const speedMul = game.profile.speedMultiplier ?? 1.1;
    game.spacecraft = {
        x: WIDTH * 0.5,
        y: HEIGHT * 0.8,
        radius,
        baseSpeed: GameConfig.spacecraft.speed * HEIGHT * speedMul,
        zigzagSign: 1,
        shieldActive: false,
        wormholeTransit: false,
        moveState: null,
        hitCircles: [],
        isZigzag: () => true,
        collidesWith(target) {
            if (game.invuln > 0) return false;
            return this.hitCircles.some((circle) => target.checkCollision(circle));
        },
    };
    game.obstacleManager = new ObstacleManager(game);
    game.obstacleManager.tutorialPhase = false;
    game.obstacleManager.updateAvailableTypes(score, { announce: false });
    return game;
}

function blocked(game, sign) {
    const ship = game.spacecraft;
    const cfg = GameConfig.spacecraft;
    const rad = ((cfg.zigzagAngleDeg ?? 52) * Math.PI) / 180;
    const speed = ship.baseSpeed * (cfg.zigzagSpeedScale ?? 1.45);
    const ahead = speed * 0.22;
    const x = ship.x + Math.sin(rad) * sign * ahead;
    const y = ship.y - Math.cos(rad) * ahead;
    if (x < ship.radius * 1.4 || x > game.width - ship.radius * 1.4) return true;
    const probe = { radius: ship.radius };
    for (const obstacle of game.obstacleManager.obstacles) {
        if (obstacle.retired || obstacle.y > ship.y + ship.radius) continue;
        if (obstacle.y < y - ship.radius * 6) continue;
        probe.x = ship.x;
        probe.y = ship.y;
        if (obstacle.checkCollision?.(probe)) return true;
        probe.x = x;
        probe.y = y;
        if (obstacle.checkCollision?.(probe)) return true;
    }
    return false;
}

function stepShip(game) {
    const ship = game.spacecraft;
    const cfg = GameConfig.spacecraft;
    const rad = ((cfg.zigzagAngleDeg ?? 52) * Math.PI) / 180;
    const speed = ship.baseSpeed * (cfg.zigzagSpeedScale ?? 1.45);
    const dist = speed * DT;
    if (game.invuln <= 0 && blocked(game, ship.zigzagSign) && !blocked(game, -ship.zigzagSign)) {
        ship.zigzagSign *= -1;
    }
    ship.x += Math.sin(rad) * ship.zigzagSign * dist;
    ship.y -= Math.cos(rad) * dist;
    if (ship.x < ship.radius) {
        ship.x = ship.radius;
        ship.zigzagSign = 1;
    } else if (ship.x > game.width - ship.radius) {
        ship.x = game.width - ship.radius;
        ship.zigzagSign = -1;
    }
    game.camera.y = ship.y - game.height * 0.8;
    ship.hitCircles = [{ x: ship.x, y: ship.y, radius: ship.radius }];
    if (game.invuln > 0) game.invuln -= DT;
}

function peakOf(game, peak) {
    const load = game.obstacleManager.budget.liveLoad();
    for (const key of ['space', 'timing', 'tracking', 'movers', 'setPieces']) {
        peak[key] = Math.max(peak[key], load[key]);
    }
}

function runOne(profile, score, seed) {
    const random = Math.random;
    Math.random = mulberry32(seed);
    const game = makeGame(profile, score);
    const startY = game.spacecraft.y;
    const frames = Math.round(SECONDS / DT);
    const peak = { space: 0, timing: 0, tracking: 0, movers: 0, setPieces: 0 };
    let near = Infinity;
    try {
        for (let i = 0; i < frames; i++) {
            stepShip(game);
            game.score = score + game.config.kmDelta(startY - game.spacecraft.y, game.height);
            game.obstacleManager.updateAvailableTypes(game.score, { announce: false });
            game.obstacleManager.update();
            peakOf(game, peak);
            const ship = game.spacecraft;
            for (const obstacle of game.obstacleManager.obstacles) {
                if (obstacle.x == null || obstacle.size == null) continue;
                const gap = Math.hypot(ship.x - obstacle.x, ship.y - obstacle.y) - obstacle.size - ship.radius;
                if (gap < near) near = gap;
            }
        }
    } finally {
        Math.random = random;
    }
    return { deaths: game.deaths, peak, near, budget: game.profile.usesLoadBudget === true };
}

function average(profile, score) {
    const runs = [];
    for (let seed = 1; seed <= SEEDS; seed++) runs.push(runOne(profile, score, seed * 997));
    const deaths = runs.reduce((sum, run) => sum + run.deaths, 0) / runs.length;
    const near = Math.min(...runs.map((run) => run.near));
    const peak = { space: 0, timing: 0, tracking: 0, movers: 0, setPieces: 0 };
    for (const run of runs) peakOf({ obstacleManager: { budget: { liveLoad: () => run.peak } } }, peak);
    return { deaths, peak, near, budget: runs[0].budget };
}

function line(name, result, caps) {
    const flag = result.deaths >= FLAG_DEATHS ? '  FLAG' : '';
    const over = ['space', 'timing', 'tracking'].filter((axis) => result.peak[axis] > caps[axis] + 0.05);
    const capNote = over.length ? `  over ${over.join(',')}` : '';
    const nums = ['space', 'timing', 'tracking', 'movers', 'setPieces']
        .map((key) => `${key} ${result.peak[key].toFixed(1)}`)
        .join('  ');
    const near = Number.isFinite(result.near) ? result.near.toFixed(0) : '—';
    console.log(`${name.padEnd(16)} deaths ${result.deaths.toFixed(1)}  near ${near}px   ${nums}${capNote}${flag}`);
}

const capsGame = makeGame((game) => new JourneyProfile(game, 30), 0);
const caps = capsGame.obstacleManager.budget.caps();
console.log(`Fairness bot: ${SECONDS}s x ${SEEDS} seeds, phone ${WIDTH}px, dt ${DT.toFixed(3)}.`);
console.log(`Flag at ${FLAG_DEATHS}+ deaths/run. Caps shown are day-30 (budget off except lab).`);
console.log('');

for (let day = 1; day <= 42; day++) {
    const result = average((game) => new JourneyProfile(game, day), 0);
    line(`journey ${day}`, result, caps);
}

console.log('');
for (const km of [0, 2000, 5000, 7000, 12500, 20000]) {
    const result = average((game) => new OpenWorldProfile(game), km);
    line(`open ${km}`, result, caps);
}

console.log('');
const lab = average((game) => new HazardLabProfile(game), 0);
line('hazard lab', lab, lab.budget ? makeGame((game) => new HazardLabProfile(game), 0).obstacleManager.budget.caps() : caps);
