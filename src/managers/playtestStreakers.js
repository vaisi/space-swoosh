// playtestStreakers.js
// Hazard Lab movers that cross the screen fast: Meteor shower.
// Changes:
// - Before the rocks, four dashed ink30 streaks fall on the same slant.
//   They do not collide. Warn time is an intensity knob (today 0.75 s).
// - Meteor count and speed read intensity knobs (config/ObstacleIntensity.js).
// - Removed Comet.
// - Created file: Comet and Meteor shower (a short burst of tiny rocks
//   falling at one shared diagonal).

import { color } from '../brand/tokens.js';
import { PlaytestBody, circleHits } from './playtestShared.js';
import { knob, knobInt } from '../config/ObstacleIntensity.js';

const TAU = Math.PI * 2;

/** Sizes in baseUnits, speeds in screen heights per second. */
const SHOWER = {
    burstSec: 1.4,
    angleDeg: 28,
    rockR: 0.42,
    streak: 3.5,
    ghosts: 4,
};

/** A short burst of tiny rocks falling at one shared diagonal, like rain on glass. */
export class MeteorShowerObstacle extends PlaytestBody {
    constructor(game, x, y) {
        const u = game.baseUnit;
        super(game, game.width * 0.5, y, u * 2, 'meteorShower');
        this.dir = Math.random() < 0.5 ? -1 : 1;
        const a = (SHOWER.angleDeg * Math.PI) / 180;
        const v = game.height * knob(game, 'meteorShower', 'speed');
        this.count = knobInt(game, 'meteorShower', 'count');
        this.vx = this.dir * Math.sin(a) * v;
        this.vy = Math.cos(a) * v;
        this.rockR = u * SHOWER.rockR;
        this.warn = knob(game, 'meteorShower', 'warn');
        this.meteors = [];
        this.ghosts = [];
        this.ghostsSent = false;
        this.spawned = 0;
        this.active = false;
        this.timer = 0;
    }

    update() {
        const dt = this.tick();
        const { camera, height } = this.game;
        if (!this.active) {
            if (camera.getRelativeY(this.y) < 0) return;
            this.active = true;
        }
        this.timer += dt;
        if (this.timer < this.warn) {
            if (!this.ghostsSent) {
                this.emitGhosts();
                this.ghostsSent = true;
            }
        } else {
            const burstT = this.timer - this.warn;
            const due = Math.min(this.count, Math.floor((burstT / SHOWER.burstSec) * this.count) + 1);
            while (this.spawned < due) this.emit();
        }

        this.ghosts = this.advance(this.ghosts, dt);
        this.meteors = this.advance(this.meteors, dt);
        this.y = camera.y + height * 0.5;
        const rocksDone = this.timer >= this.warn && this.spawned >= this.count && this.meteors.length === 0;
        if (rocksDone && this.ghosts.length === 0) this.retire();
    }

    /** Move one list of points and drop whatever has left the view. */
    advance(points, dt) {
        const { camera, height, width } = this.game;
        const bottom = camera.y + height + this.rockR * 4;
        return points.filter((m) => {
            m.x += this.vx * dt;
            m.y += this.vy * dt;
            return m.y < bottom && m.x > -width * 0.3 && m.x < width * 1.3;
        });
    }

    /** Harmless dashed streaks, spaced across the width, on the rock slant. */
    emitGhosts() {
        const { width, height, camera } = this.game;
        const upstream = (this.vx / this.vy) * height * 0.35;
        const n = SHOWER.ghosts;
        for (let i = 0; i < n; i++) {
            this.ghosts.push({
                x: (width * (i + 0.5)) / n - upstream,
                y: camera.y - this.rockR * (4 + i * 5),
            });
        }
    }

    emit() {
        const { width, height, camera } = this.game;
        const upstream = (this.vx / this.vy) * height * 0.35;
        this.meteors.push({
            x: Math.random() * width - upstream,
            y: camera.y - this.rockR * 3,
        });
        this.spawned++;
    }

    render(ctx) {
        if (!this.active || this.retired) return;
        const offset = -this.game.camera.y;
        this.drawGhosts(ctx, offset);
        const speed = Math.hypot(this.vx, this.vy);
        const sx = (this.vx / speed) * this.game.baseUnit * SHOWER.streak;
        const sy = (this.vy / speed) * this.game.baseUnit * SHOWER.streak;
        ctx.save();
        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = this.rockR * 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const m of this.meteors) {
            ctx.moveTo(m.x, m.y + offset);
            ctx.lineTo(m.x - sx, m.y + offset - sy);
        }
        ctx.stroke();
        ctx.fillStyle = color.ink;
        ctx.beginPath();
        for (const m of this.meteors) {
            ctx.moveTo(m.x + this.rockR, m.y + offset);
            ctx.arc(m.x, m.y + offset, this.rockR, 0, TAU);
        }
        ctx.fill();
        ctx.restore();
    }

    /** Dashed ink30 only. Same slant as the rocks, and it does not kill. */
    drawGhosts(ctx, offset) {
        if (this.ghosts.length === 0) return;
        const u = this.game.baseUnit;
        const speed = Math.hypot(this.vx, this.vy) || 1;
        const len = u * SHOWER.streak * 2.4;
        const sx = (this.vx / speed) * len;
        const sy = (this.vy / speed) * len;
        ctx.save();
        ctx.strokeStyle = color.ink30;
        ctx.lineWidth = Math.max(1.25, this.rockR * 0.65);
        ctx.lineCap = 'butt';
        ctx.setLineDash([u * 0.45, u * 0.55]);
        ctx.beginPath();
        for (const g of this.ghosts) {
            ctx.moveTo(g.x, g.y + offset);
            ctx.lineTo(g.x - sx, g.y + offset - sy);
        }
        ctx.stroke();
        ctx.restore();
    }

    checkCollision(probe) {
        const hit = this.meteors.find((m) =>
            circleHits(probe.x, probe.y, probe.radius, m.x, m.y, this.rockR));
        return hit ? this.markHit(hit.x, hit.y) : false;
    }
}
