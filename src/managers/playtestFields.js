// playtestFields.js
// Forgiving Hazard Lab set pieces for the playtest/new-obstacles branch.
// Changes:
// - Tunnel slack and leg count, Shoal count and speed read intensity knobs
//   (config/ObstacleIntensity.js); those four values left TUNNEL / SHOAL. The
//   school's oval grows with sqrt(count / 10) so every rock keeps its spacing.
// - Shoal bounces twice (SHOAL.bounces): it heads for the nearer wall, turns
//   there as a whole school, turns again at the far wall, then crosses back
//   and exits through the first wall and retires.
// - Shoal: no wakes; rocks placed at least 2.7 u apart, each wandering on its
//   own sine pair, with neighbour separation and a whole-school sway, so it
//   moves as one loose organic unit.
// - Tunnel field narrower: clear core 2.0 u, lining 1.2 u, 0.08 s of flip
//   slack, wall raggedness 0.9 u. Bumper trio removed.
// - Tunnel field: no dotted guide line; shorter band (legs up to 0.42 of the
//   width); wider pebble spacing; ragged tunnel walls and band edges from
//   smooth noise plus random erosion. Raggedness only removes rock, so the
//   guaranteed tunnel width is unchanged.
// - Shoal swims toward the far wall once on screen, exits, and retires.
//   No wall bounce.
// - Tunnel field: smaller pebbles with real gaps between them, less jitter,
//   and a narrower tunnel (0.15 s of flip slack instead of 0.2 s).
// - Shoal no longer flees the ship. It swims across the corridor as a school
//   with a wave running through it.
// - Created file: Tunnel field (rubble band with a zigzag tunnel at the
//   ship's lean), Shoal, and Bumper trio (Signal rings that flip your lean,
//   never lethal).
// - Tunnel field claims its band so other rows don't spawn inside it
//   (ObstacleManager reads `claim`).

import { color } from '../brand/tokens.js';
import {
    PlaytestBody,
    burstInto,
    circleHits,
    clamp,
} from './playtestShared.js';
import { knob, knobInt } from '../config/ObstacleIntensity.js';

const TAU = Math.PI * 2;

/** All sizes in baseUnits (ship radius = 1). */
const TUNNEL = {
    clearHalf: 2.0,
    lining: 1.2,
    spacing: 2.75,
    jitter: 0.22,
    /** Ragged edges only ever carve extra rock away, never into the tunnel. */
    wallBite: 0.9,
    bandBite: 3.5,
    erode: 0.3,
    pebbleMin: 0.5,
    pebbleMax: 0.75,
    lead: 6,
    straightHeight: 0.45,
    padBelow: 10,
    padAbove: 6,
    /** A flip this late (or early) at a bend still clears the solid rubble. */
};

/** Ship travel along its lean, px per second. */
function tunnelSpeed(game) {
    const ship = game.spacecraft;
    if (!ship?.baseSpeed) return 0;
    const scale = game.config.spacecraft?.zigzagSpeedScale ?? 1.45;
    const hz = game.snappyHz ?? 120;
    return ship.baseSpeed * scale * (hz / 60);
}

function zigzagTan(game) {
    const deg = game.config.spacecraft?.zigzagAngleDeg ?? 52;
    return Math.tan((deg * Math.PI) / 180);
}

/** Where a hands-off zigzag ship crosses `targetY`, wall bounces included. */
export function predictZigzagCrossing(ship, targetY, width, tan) {
    const dy = ship.y - targetY;
    const lo = ship.radius;
    const span = width - ship.radius * 2;
    const sign = ship.zigzagSign || 1;
    if (dy <= 0 || span <= 0) return { x: ship.x, sign };
    const period = span * 2;
    const unfolded = ship.x - lo + sign * tan * dy;
    const t = ((unfolded % period) + period) % period;
    if (t <= span) return { x: lo + t, sign };
    return { x: lo + period - t, sign: -sign };
}

function planZigzagPath(game, bottomY, margin, legs) {
    const width = game.width;
    const tan = zigzagTan(game);
    const ship = game.spacecraft;
    const pred = ship
        ? predictZigzagCrossing(ship, bottomY, width, tan)
        : { x: width * 0.5, sign: 1 };
    const room = (x, s) => (s > 0 ? width - margin - x : x - margin);
    const minRun = width * 0.16;
    const maxRun = width * 0.42;

    let x = clamp(pred.x, margin, width - margin);
    let s = pred.sign;
    let y = bottomY;
    const points = [{ x, y }];
    for (let i = 0; i < legs; i++) {
        if (room(x, s) < minRun) s = -s;
        const avail = room(x, s);
        const run = Math.min(maxRun, Math.max(Math.min(avail, minRun), avail * (0.5 + Math.random() * 0.4)));
        x += s * run;
        y -= run / tan;
        points.push({ x, y });
        if (i < legs - 1) s = -s;
    }

    const lead = game.baseUnit * TUNNEL.lead;
    const first = Math.sign(points[1].x - points[0].x) || 1;
    const last = Math.sign(points[points.length - 1].x - points[points.length - 2].x) || 1;
    const top = points[points.length - 1].y;
    points.unshift({ x: points[0].x - first * tan * lead, y: bottomY + lead });
    const end = points[points.length - 1];
    points.push({ x: end.x + last * tan * lead, y: top - lead });
    return { points, top };
}

/** Smooth 0..1 wobble over a distance in baseUnits; a fresh shape per call. */
function makeNoise() {
    const waves = [0.19, 0.47, 1.1].map((freq, i) => ({
        freq: freq * (0.8 + Math.random() * 0.4),
        phase: Math.random() * TAU,
        amp: [0.5, 0.32, 0.18][i],
    }));
    return (t) => {
        let v = 0;
        for (const w of waves) v += Math.sin(t * w.freq + w.phase) * w.amp;
        return clamp(0.5 + v * 0.5, 0, 1);
    };
}

/** Distance to the path, arc length at the closest point, and which side. */
function closestOnPath(px, py, points) {
    let best = { d: Infinity, s: 0, side: 1 };
    let walked = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / (len * len), 0, 1);
        const ex = px - (a.x + t * dx);
        const ey = py - (a.y + t * dy);
        const d = Math.hypot(ex, ey);
        if (d < best.d) {
            best = { d, s: walked + t * len, side: Math.sign(dx * ey - dy * ex) || 1 };
        }
        walked += len;
    }
    return best;
}

function planStraightPath(game, bottomY, margin) {
    const ship = game.spacecraft;
    const x = clamp(ship?.x ?? game.width * 0.5, margin, game.width - margin);
    const top = bottomY - game.height * TUNNEL.straightHeight;
    const lead = game.baseUnit * TUNNEL.lead;
    return { points: [{ x, y: bottomY + lead }, { x, y: top - lead }], top };
}

/**
 * Full-width rubble band with one tunnel carved at the zigzag lean.
 * Solid ink kills. The dashed lining around the tunnel chips off on contact.
 */
export class TunnelFieldObstacle extends PlaytestBody {
    constructor(game, bottomY) {
        const u = game.baseUnit;
        super(game, game.width * 0.5, bottomY, u * 2, 'tunnelField');
        const zigzag = game.spacecraft?.isZigzag?.() ?? true;
        const widen = zigzag ? 1 : 1.3;
        this.maxR = u * TUNNEL.pebbleMax;
        const slack = tunnelSpeed(game) * knob(game, 'tunnelField', 'slackSec');
        this.softHalf = Math.max(
            u * (TUNNEL.clearHalf + TUNNEL.lining),
            this.maxR + u * 1.15 + slack,
        ) * widen;
        this.clearHalf = Math.max(u * TUNNEL.clearHalf, this.softHalf - u * TUNNEL.lining);
        const margin = this.softHalf + u;
        const plan = zigzag
            ? planZigzagPath(game, bottomY, margin, knobInt(game, 'tunnelField', 'legs'))
            : planStraightPath(game, bottomY, margin);
        this.path = plan.points;
        this.top = plan.top;
        this.bottom = bottomY;
        this.height = this.bottom - this.top;
        this.claim = {
            top: this.top - u * TUNNEL.padAbove,
            bottom: this.bottom + u * TUNNEL.padBelow,
        };
        this.touched = false;
        this.lastCrashAt = -1;
        this.scatterPebbles();
    }

    scatterPebbles() {
        const u = this.game.baseUnit;
        const spacing = u * TUNNEL.spacing;
        const lining = this.softHalf - this.clearHalf;
        const wallNoise = [makeNoise(), makeNoise()];
        const topNoise = makeNoise();
        const bottomNoise = makeNoise();
        this.rowStep = spacing * 0.87;
        this.rows = [];
        const rowCount = Math.ceil(this.height / this.rowStep);
        for (let row = 0; row < rowCount; row++) {
            const baseY = this.top + (row + 0.5) * this.rowStep;
            const offset = row % 2 ? spacing * 0.5 : 0;
            for (let bx = offset; bx < this.game.width + spacing * 0.5; bx += spacing) {
                const x = bx + (Math.random() - 0.5) * spacing * TUNNEL.jitter * 2;
                const y = baseY + (Math.random() - 0.5) * this.rowStep * TUNNEL.jitter * 2;
                if (y < this.top + topNoise(x / u) * u * TUNNEL.bandBite) continue;
                if (y > this.bottom - bottomNoise(x / u) * u * TUNNEL.bandBite) continue;
                const r = u * (TUNNEL.pebbleMin + Math.random() * (TUNNEL.pebbleMax - TUNNEL.pebbleMin));
                const near = closestOnPath(x, y, this.path);
                const edge = this.clearHalf + wallNoise[near.side > 0 ? 0 : 1](near.s / u) * u * TUNNEL.wallBite;
                if (near.d < edge + r) continue;
                if (near.d < edge + lining + u * 1.5 && Math.random() < TUNNEL.erode) continue;
                this.addPebble({
                    x,
                    y,
                    r,
                    soft: near.d < edge + lining,
                    broken: false,
                    square: Math.random() < 0.22,
                    rot: Math.random() * TAU,
                });
            }
        }
    }

    addPebble(p) {
        const idx = clamp(Math.floor((p.y - this.top) / this.rowStep), 0, 1e6);
        (this.rows[idx] ||= []).push(p);
    }

    forNear(y, reach, fn) {
        const from = Math.max(0, Math.floor((y - reach - this.top) / this.rowStep));
        const to = Math.min(this.rows.length - 1, Math.floor((y + reach - this.top) / this.rowStep));
        for (let i = from; i <= to; i++) {
            const row = this.rows[i];
            if (!row) continue;
            for (const p of row) {
                if (!p.broken && fn(p)) return true;
            }
        }
        return false;
    }

    update() {
        this.tick();
        const ship = this.game.spacecraft;
        if (!ship?.hitCircles) return;
        if (ship.y < this.top - this.maxR * 4 || ship.y > this.bottom + this.maxR * 4) return;
        const shield = ship.shieldActive;
        for (const c of ship.hitCircles) {
            this.forNear(c.y, c.radius + this.maxR, (p) => {
                if (!circleHits(c.x, c.y, c.radius, p.x, p.y, p.r)) return false;
                if (p.soft || shield) this.breakPebble(p, !p.soft);
                return false;
            });
        }
    }

    breakPebble(p, crash) {
        p.broken = true;
        burstInto(this.game, p.x, p.y, p.r * 2.4, crash ? 8 : 5);
        if (!this.touched) {
            this.touched = true;
            this.game.logbook?.onObstacleInteract?.(this);
        }
        if (crash && this.age - this.lastCrashAt > 0.12) {
            this.lastCrashAt = this.age;
            this.game.obstacleManager?.playSmashCrashFeedback?.();
        }
    }

    checkCollision(probe) {
        if (this.game.spacecraft?.shieldActive) return false;
        return this.forNear(probe.y, probe.radius + this.maxR, (p) =>
            !p.soft && circleHits(probe.x, probe.y, probe.radius, p.x, p.y, p.r));
    }

    render(ctx) {
        const offset = this.game.camera.getRelativeY(this.top) - this.top;
        const viewTop = -offset - this.maxR * 2;
        const viewBottom = this.game.height - offset + this.maxR * 2;
        if (this.bottom < viewTop - this.game.baseUnit * TUNNEL.lead || this.top > viewBottom) return;
        const u = this.game.baseUnit;
        ctx.save();
        ctx.fillStyle = color.ink;
        ctx.beginPath();
        this.tracePebbles(ctx, offset, viewTop, viewBottom, false);
        ctx.fill();

        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = Math.max(1.1, u * 0.08);
        ctx.setLineDash([u * 0.32, u * 0.22]);
        ctx.beginPath();
        this.tracePebbles(ctx, offset, viewTop, viewBottom, true);
        ctx.stroke();
        ctx.restore();
    }

    tracePebbles(ctx, offset, viewTop, viewBottom, soft) {
        const from = Math.max(0, Math.floor((viewTop - this.top) / this.rowStep));
        const to = Math.min(this.rows.length - 1, Math.floor((viewBottom - this.top) / this.rowStep));
        for (let i = from; i <= to; i++) {
            const row = this.rows[i];
            if (!row) continue;
            for (const p of row) {
                if (p.broken || p.soft !== soft) continue;
                const y = p.y + offset;
                if (p.square) {
                    const k = p.r * 0.92;
                    for (let n = 0; n < 4; n++) {
                        const a = p.rot + (n * Math.PI) / 2;
                        const px = p.x + Math.cos(a) * k * Math.SQRT2;
                        const py = y + Math.sin(a) * k * Math.SQRT2;
                        if (n === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else {
                    ctx.moveTo(p.x + p.r, y);
                    ctx.arc(p.x, y, p.r, 0, TAU);
                }
            }
        }
    }

    createDestructionParticles() {
        return [];
    }
}

/** Sizes in baseUnits, speeds in widths per second. */
const SHOAL = {
    spreadX: 6.5,
    spreadY: 3.8,
    minGap: 2.7,
    rockMin: 0.7,
    rockMax: 0.95,
    wander: 0.9,
    pull: 7,
    push: 90,
    damping: 4,
    bounces: 2,
};

/** Scatter `count` slots inside an ellipse, at least `gap` apart. */
function placeSchool(count, rx, ry, gap) {
    const slots = [];
    for (let tries = 0; tries < count * 200 && slots.length < count; tries++) {
        const a = Math.random() * TAU;
        const rr = Math.sqrt(Math.random());
        const x = Math.cos(a) * rr * rx;
        const y = Math.sin(a) * rr * ry;
        if (slots.every((s) => Math.hypot(s.x - x, s.y - y) >= gap)) slots.push({ x, y });
    }
    return slots;
}

/**
 * A school of small rocks. It swims to the nearer wall and bounces off the
 * walls SHOAL.bounces times, then crosses and leaves through the far wall for good.
 * Each rock wanders on its own and keeps its distance; the school holds together.
 */
export class ShoalObstacle extends PlaytestBody {
    constructor(game, x, y) {
        const u = game.baseUnit;
        const count = knobInt(game, 'shoal', 'count');
        const grow = Math.sqrt(count / 10);
        const spreadX = u * SHOAL.spreadX * grow;
        const cx = clamp(x, spreadX + u * 2, game.width - spreadX - u * 2);
        super(game, cx, y, spreadX, 'shoal');
        this.vx = (cx < game.width * 0.5 ? -1 : 1) * game.width * knob(game, 'shoal', 'speed');
        this.awake = false;
        this.bouncesLeft = SHOAL.bounces;
        this.swayPhase = Math.random() * TAU;
        this.fish = placeSchool(count, spreadX, u * SHOAL.spreadY * grow, u * SHOAL.minGap).map((slot) => ({
            hx: slot.x,
            hy: slot.y,
            x: cx + slot.x,
            y: y + slot.y,
            vx: 0,
            vy: 0,
            r: u * (SHOAL.rockMin + Math.random() * (SHOAL.rockMax - SHOAL.rockMin)),
            fx: 0.6 + Math.random() * 0.9,
            fy: 0.5 + Math.random() * 0.8,
            px: Math.random() * TAU,
            py: Math.random() * TAU,
        }));
    }

    update() {
        const dt = Math.min(this.tick(), 0.05);
        const u = this.game.baseUnit;
        const w = this.game.width;
        if (!this.awake && this.game.camera.getRelativeY(this.y) > -this.size * 2) this.awake = true;
        if (this.awake) this.x += this.vx * dt;
        if (this.bouncesLeft > 0) this.bounceOffWall(w);
        const gone = this.size + u * 3;
        if (this.x < -gone || this.x > w + gone) {
            this.retire();
            return;
        }
        this.steer(dt, u);
    }

    /** When the leading rock touches a wall, the whole school turns around. */
    bounceOffWall(w) {
        const heading = Math.sign(this.vx);
        const lead = heading < 0
            ? Math.min(...this.fish.map((f) => f.x - f.r))
            : Math.max(...this.fish.map((f) => f.x + f.r));
        if (heading < 0 ? lead > 0 : lead < w) return;
        this.bouncesLeft -= 1;
        this.vx = -this.vx;
        for (const f of this.fish) f.vx = -f.vx;
    }

    /** Spring each rock toward its wandering slot, then push close neighbours apart. */
    steer(dt, u) {
        const swayY = Math.sin(this.age * 0.8 + this.swayPhase) * u * 0.8;
        const wander = u * SHOAL.wander;
        const gap = u * SHOAL.minGap;
        const damp = Math.exp(-SHOAL.damping * dt);
        for (const f of this.fish) {
            const tx = this.x + f.hx + Math.sin(this.age * f.fx + f.px) * wander;
            const ty = this.y + swayY + f.hy + Math.sin(this.age * f.fy + f.py) * wander;
            f.ax = (tx - f.x) * SHOAL.pull;
            f.ay = (ty - f.y) * SHOAL.pull;
        }
        for (let i = 0; i < this.fish.length; i++) {
            for (let j = i + 1; j < this.fish.length; j++) {
                const a = this.fish[i];
                const b = this.fish[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d = Math.hypot(dx, dy) || 0.001;
                if (d >= gap) continue;
                const k = ((gap - d) / gap) * SHOAL.push * u;
                a.ax -= (dx / d) * k;
                a.ay -= (dy / d) * k;
                b.ax += (dx / d) * k;
                b.ay += (dy / d) * k;
            }
        }
        for (const f of this.fish) {
            f.vx = (f.vx + f.ax * dt) * damp;
            f.vy = (f.vy + f.ay * dt) * damp;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
        }
    }

    render(ctx) {
        const screenY = this.onScreen(this.size * 2.5);
        if (screenY == null) return;
        const offset = screenY - this.y;
        ctx.save();
        ctx.fillStyle = color.ink;
        ctx.beginPath();
        for (const f of this.fish) {
            ctx.moveTo(f.x + f.r, f.y + offset);
            ctx.arc(f.x, f.y + offset, f.r, 0, TAU);
        }
        ctx.fill();
        ctx.restore();
    }

    checkCollision(probe) {
        return this.fish.some((f) => circleHits(probe.x, probe.y, probe.radius, f.x, f.y, f.r));
    }
}