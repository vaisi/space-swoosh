// playtestWallHazards.js
// Hazard Lab pieces that play off the screen edges: Satellite debris and
// Lightning.
// Changes:
// - Satellite speed, Lightning warn / rest / reach read intensity knobs
//   (config/ObstacleIntensity.js); BOLT keeps only the fixed shape and timing.
// - Panel cells no longer bounce: they fly out through the next wall and are
//   dropped once off screen.
// - Satellite re-break: a panel that hits a wall breaks into its 3 cells
//   (plain mini rectangles, no divider lines, no further splits). The body
//   still halves until small; the antenna only bounces. Pieces fly at
//   0.2-0.32 widths/s so the second break happens while still on screen.
// - Satellite pieces split again on wall hits until small
//   (long half-side 0.6 u). Lightning is slimmer (0.18 u half-width) and grows
//   2-4 random branches that re-roll with the flicker; branches kill too.
// - Solar flare replaced by Lightning: the wall glows and crackles with a
//   dashed reach line, then a jagged horizontal bolt snaps out for 0.22 s and
//   fades. Only the bolt kills, and only during the strike.
// - Created file: Satellite debris (slow tumbling satellite that shatters
//   into pieces when it reaches a wall) and Solar flare (wall glow tell, then
//   a curved arc whips out from the edge and retracts; only the arc kills).

import { color } from '../brand/tokens.js';
import {
    PlaytestBody,
    burstInto,
    circleHitsRect,
    circleHitsSegment,
    clamp,
    traceRect,
} from './playtestShared.js';
import { knob } from '../config/ObstacleIntensity.js';

/** Satellite parts in baseUnits, local to the body centre. */
const SAT_PARTS = [
    { lx: 0, ly: 0, hw: 1.0, hh: 1.0, kind: 'body' },
    { lx: -2.4, ly: 0, hw: 1.15, hh: 0.62, kind: 'panel' },
    { lx: 2.4, ly: 0, hw: 1.15, hh: 0.62, kind: 'panel' },
    { lx: 0, ly: -1.65, hw: 0.14, hh: 0.65, kind: 'antenna' },
];

/** Pieces keep halving on wall hits until their long half-side is this small (u). */
const SAT_MIN_SPLIT = 0.6;

/** A satellite drifting toward a wall, turning slowly. It shatters on contact. */
export class SatelliteDebrisObstacle extends PlaytestBody {
    constructor(game, x, y) {
        const u = game.baseUnit;
        const w = game.width;
        const startX = clamp(x, w * 0.3, w * 0.7);
        super(game, startX, y, u * 3.6, 'satDebris');
        const toward = startX < w * 0.5 ? -1 : 1;
        this.pace = knob(game, 'satDebris', 'speed');
        this.vx = toward * w * (0.11 + Math.random() * 0.04) * this.pace;
        this.spin = (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.4);
        this.rot = Math.random() * Math.PI * 2;
        this.awake = false;
        this.pieces = null;
    }

    /** Whole satellite as world-space rectangles. */
    wholeParts() {
        const u = this.game.baseUnit;
        const cos = Math.cos(this.rot);
        const sin = Math.sin(this.rot);
        return SAT_PARTS.map((p) => ({
            x: this.x + (p.lx * cos - p.ly * sin) * u,
            y: this.y + (p.lx * sin + p.ly * cos) * u,
            rot: this.rot,
            hw: p.hw * u,
            hh: p.hh * u,
            kind: p.kind,
        }));
    }

    update() {
        const dt = this.tick();
        if (!this.awake) {
            if (this.game.camera.getRelativeY(this.y) < -this.size * 2) return;
            this.awake = true;
        }
        if (this.pieces) {
            this.updatePieces(dt);
            return;
        }
        this.x += this.vx * dt;
        this.rot += this.spin * dt;
        const side = this.wallTouched(this.wholeParts());
        if (side) this.shatter(side);
    }

    wallTouched(parts) {
        for (const p of parts) {
            const ext = Math.abs(p.hw * Math.cos(p.rot)) + Math.abs(p.hh * Math.sin(p.rot));
            if (p.x - ext <= 0) return -1;
            if (p.x + ext >= this.game.width) return 1;
        }
        return 0;
    }

    shatter(side) {
        const { width, height, baseUnit: u } = this.game;
        this.pieces = this.wholeParts().map((p) => ({
            ...p,
            x: clamp(p.x, p.hw + u * 0.2, width - p.hw - u * 0.2),
            vx: -side * width * (0.2 + Math.random() * 0.12) * this.pace,
            vy: (Math.random() - 0.5) * height * 0.14,
            spin: (Math.random() - 0.5) * 5,
        }));
        burstInto(this.game, side < 0 ? 0 : width, this.y, u * 3, 10);
    }

    updatePieces(dt) {
        const w = this.game.width;
        const next = [];
        for (const p of this.pieces) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;
            const ext = Math.max(p.hw, p.hh);
            if (p.kind === 'cell') {
                if (p.x > -ext * 2 && p.x < w + ext * 2) next.push(p);
                continue;
            }
            let side = 0;
            if (p.x < ext) {
                p.x = ext;
                p.vx = Math.abs(p.vx);
                side = -1;
            } else if (p.x > w - ext) {
                p.x = w - ext;
                p.vx = -Math.abs(p.vx);
                side = 1;
            }
            if (side && this.canSplit(p)) next.push(...this.splitPiece(p, side));
            else next.push(p);
        }
        this.pieces = next;
    }

    /** Panels break into their 3 cells; the body halves; the antenna only bounces. */
    canSplit(p) {
        if (p.kind === 'panel') return true;
        return p.kind === 'body' && Math.max(p.hw, p.hh) > this.game.baseUnit * SAT_MIN_SPLIT;
    }

    splitPiece(p, side) {
        if (p.kind === 'panel') return this.cutAlongLongSide(p, side, 3, 'cell');
        return this.cutAlongLongSide(p, side, 2, 'body');
    }

    /** Cut a piece into `count` equal slices across its long side; they fly apart off the wall. */
    cutAlongLongSide(p, side, count, kind) {
        const { width, height, baseUnit: u } = this.game;
        const alongX = p.hw >= p.hh;
        const hw = alongX ? p.hw / count : p.hw;
        const hh = alongX ? p.hh : p.hh / count;
        const step = (alongX ? hw : hh) * 2;
        const ax = alongX ? Math.cos(p.rot) : -Math.sin(p.rot);
        const ay = alongX ? Math.sin(p.rot) : Math.cos(p.rot);
        burstInto(this.game, side < 0 ? 0 : width, p.y, u * 2, 6);
        return Array.from({ length: count }, (_, i) => {
            const k = i - (count - 1) / 2;
            return {
                ...p,
                kind,
                hw,
                hh,
                x: clamp(p.x + ax * step * k, hw, width - hw),
                y: p.y + ay * step * k,
                vx: -side * width * (0.2 + Math.random() * 0.12) * this.pace,
                vy: p.vy + k * height * (0.03 + Math.random() * 0.04),
                spin: (Math.random() - 0.5) * 6,
            };
        });
    }

    render(ctx) {
        const screenY = this.onScreen(this.size * 4);
        if (screenY == null) return;
        const offset = screenY - this.y;
        const parts = this.pieces ?? this.wholeParts();
        ctx.save();
        if (!this.pieces) this.drawArms(ctx, parts, offset);
        ctx.fillStyle = color.ink;
        ctx.beginPath();
        for (const p of parts) traceRect(ctx, p.x, p.y + offset, p.rot, p.hw, p.hh);
        ctx.fill();
        this.drawPanelCells(ctx, parts, offset);
        ctx.restore();
    }

    drawArms(ctx, parts, offset) {
        const [body, left, right] = parts;
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = Math.max(1.2, this.game.baseUnit * 0.18);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y + offset);
        ctx.lineTo(body.x, body.y + offset);
        ctx.lineTo(right.x, right.y + offset);
        ctx.stroke();
    }

    drawPanelCells(ctx, parts, offset) {
        ctx.strokeStyle = color.paper;
        ctx.lineWidth = Math.max(1, this.game.baseUnit * 0.1);
        ctx.beginPath();
        for (const p of parts) {
            if (p.kind !== 'panel') continue;
            const cos = Math.cos(p.rot);
            const sin = Math.sin(p.rot);
            for (const k of [-0.33, 0.33]) {
                const lx = p.hw * k;
                ctx.moveTo(p.x + lx * cos + p.hh * sin, p.y + offset + lx * sin - p.hh * cos);
                ctx.lineTo(p.x + lx * cos - p.hh * sin, p.y + offset + lx * sin + p.hh * cos);
            }
        }
        ctx.stroke();
    }

    checkCollision(probe) {
        const parts = this.pieces ?? this.wholeParts();
        const hit = parts.find((p) =>
            circleHitsRect(probe.x, probe.y, probe.radius, p.x, p.y, p.rot, p.hw, p.hh));
        return hit ? this.markHit(hit.x, hit.y) : false;
    }
}

/** Seconds per beat of the lightning loop; sizes in baseUnits. */
const BOLT = {
    strike: 0.22,
    fade: 0.18,
    kinks: 10,
    jag: 1.3,
    hitHalf: 0.18,
    branchHalf: 0.12,
    branchMin: 2,
    branchMax: 4,
    branchLen: [1.5, 3.5],
    reshuffle: 0.045,
};

/** The wall crackles, then a jagged bolt snaps across and vanishes. Only the bolt kills. */
export class LightningObstacle extends PlaytestBody {
    constructor(game, x, y) {
        const side = x < game.width * 0.5 ? -1 : 1;
        super(game, side < 0 ? 0 : game.width, y, game.baseUnit * 2, 'lightning');
        this.side = side;
        this.warn = knob(game, 'lightning', 'warn');
        this.cycle = this.warn + BOLT.strike + BOLT.fade + knob(game, 'lightning', 'rest');
        this.reach = game.width * knob(game, 'lightning', 'reach');
        this.clock = null;
        this.points = null;
        this.branches = [];
        this.shuffledAt = -1;
        this.height = game.baseUnit * BOLT.jag * 2;
    }

    update() {
        const dt = this.tick();
        if (this.clock == null) {
            if (this.game.camera.getRelativeY(this.y) < 0) return;
            this.clock = 0;
        }
        this.clock = (this.clock + dt) % this.cycle;
        if (this.phase() === 'strike' && this.age - this.shuffledAt >= BOLT.reshuffle) {
            this.points = this.jaggedLine();
            this.branches = this.growBranches(this.points);
            this.shuffledAt = this.age;
        }
    }

    phase() {
        let t = this.clock ?? -1;
        if (t < 0) return 'idle';
        if (t < this.warn) return 'warn';
        t -= this.warn;
        if (t < BOLT.strike) return 'strike';
        t -= BOLT.strike;
        if (t < BOLT.fade) return 'fade';
        return 'rest';
    }

    /** Wall to tip, kinked up and down; the root sits on the wall. */
    jaggedLine() {
        const u = this.game.baseUnit;
        const points = [{ x: this.x, y: this.y }];
        for (let i = 1; i <= BOLT.kinks; i++) {
            const s = i / BOLT.kinks;
            const jag = (Math.random() * 2 - 1) * u * BOLT.jag * Math.min(1, s * 3);
            points.push({ x: this.x - this.side * this.reach * s, y: this.y + jag });
        }
        return points;
    }

    render(ctx) {
        const screenY = this.onScreen(this.game.baseUnit * 6);
        if (screenY == null) return;
        const phase = this.phase();
        if (phase === 'idle' || phase === 'rest') return;
        const offset = screenY - this.y;
        ctx.save();
        if (phase === 'warn') this.drawWarning(ctx, screenY);
        else this.drawBolt(ctx, offset, phase === 'strike' ? 1 : 1 - (this.clock - this.warn - BOLT.strike) / BOLT.fade);
        ctx.restore();
    }

    drawWarning(ctx, screenY) {
        const u = this.game.baseUnit;
        const k = this.clock / this.warn;
        const flicker = 0.5 + 0.5 * Math.sin(this.age * (14 + k * 30));
        const r = u * (2.5 + k * 3);
        const g = ctx.createRadialGradient(this.x, screenY, 0, this.x, screenY, r);
        g.addColorStop(0, `rgba(${color.inkRgb}, ${(0.2 + 0.4 * k * flicker).toFixed(3)})`);
        g.addColorStop(1, `rgba(${color.inkRgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, screenY, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color.ink;
        ctx.lineWidth = Math.max(1, u * 0.12);
        ctx.globalAlpha = 0.4 + 0.6 * flicker;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            let x = this.x;
            let y = screenY + (Math.random() - 0.5) * u * 2;
            ctx.moveTo(x, y);
            for (let j = 0; j < 3; j++) {
                x -= this.side * u * (0.5 + Math.random() * 0.6) * (0.5 + k);
                y += (Math.random() - 0.5) * u * 1.2;
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.globalAlpha = k;
        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = Math.max(1, u * 0.08);
        ctx.setLineDash([u * 0.4, u * 0.6]);
        ctx.beginPath();
        ctx.moveTo(this.x, screenY);
        ctx.lineTo(this.x - this.side * this.reach, screenY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    /** A few short forks off the main bolt, angled forward and up or down. */
    growBranches(main) {
        const u = this.game.baseUnit;
        const count = BOLT.branchMin + Math.floor(Math.random() * (BOLT.branchMax - BOLT.branchMin + 1));
        const branches = [];
        for (let b = 0; b < count; b++) {
            const from = main[2 + Math.floor(Math.random() * (main.length - 3))];
            const tilt = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.6);
            const [minLen, maxLen] = BOLT.branchLen;
            const step = (u * (minLen + Math.random() * (maxLen - minLen))) / 3;
            let x = from.x;
            let y = from.y;
            const points = [{ x, y }];
            for (let i = 0; i < 3; i++) {
                const a = tilt + (Math.random() - 0.5) * 0.7;
                x += -this.side * Math.cos(a) * step;
                y += Math.sin(a) * step;
                points.push({ x, y });
            }
            branches.push(points);
        }
        return branches;
    }

    drawBolt(ctx, offset, alpha) {
        if (!this.points) {
            this.points = this.jaggedLine();
            this.branches = this.growBranches(this.points);
        }
        const u = this.game.baseUnit;
        const trace = (points) => {
            ctx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y + offset);
                else ctx.lineTo(p.x, p.y + offset);
            });
            ctx.stroke();
        };
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = u * 0.6;
        trace(this.points);
        ctx.lineWidth = u * 0.4;
        this.branches.forEach(trace);
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = u * BOLT.hitHalf * 2;
        trace(this.points);
        ctx.lineWidth = u * BOLT.branchHalf * 2;
        this.branches.forEach(trace);
        ctx.globalAlpha = 1;
    }

    checkCollision(probe) {
        if (this.phase() !== 'strike' || !this.points) return false;
        const u = this.game.baseUnit;
        return this.hitsLine(probe, this.points, u * BOLT.hitHalf)
            || this.branches.some((points) => this.hitsLine(probe, points, u * BOLT.branchHalf));
    }

    hitsLine(probe, points, half) {
        const r = probe.radius + half;
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            if (circleHitsSegment(probe.x, probe.y, r, a.x, a.y, b.x, b.y)) {
                return this.markHit((a.x + b.x) / 2, (a.y + b.y) / 2);
            }
        }
        return false;
    }
}