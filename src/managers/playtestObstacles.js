// playtestObstacles.js
// Hazard Lab candidates kept on the playtest/new-obstacles branch.
// Ink still kills on contact. Each one draws its tell before the hit.
// Journey days and the iOS sim do not spawn these types.
// Changes:
// - Spinner / Hollow orbit spin, Ricochet speed, and Blink row beat read
//   intensity knobs (config/ObstacleIntensity.js); today's values are the middle.
// - Ricochet is back. Bumper trio and Comet removed.
// - Meteor shower (playtestStreakers.js), Satellite debris and Lightning
//   (playtestWallHazards.js), Tunnel field and Shoal (playtestFields.js).
// - Helpers and PlaytestBody live in playtestShared.js.
// - Spinner is a radar: faint sweep arcs trail the hand (drawSweepTrail).
// - Removed Snap. Kept Spinner, Hollow orbit, and Blink row.
// - createPlaytestObstacle() is the only spawn entry ObstacleManager calls.

import { color } from '../brand/tokens.js';
import { knob } from '../config/ObstacleIntensity.js';
import {
    PlaytestBody,
    circleHits,
    circleHitsHand,
    circleHitsTriangle,
    clamp,
    drawSweepTrail,
    inkBurst,
    rockRadius,
} from './playtestShared.js';
import { ShoalObstacle, TunnelFieldObstacle } from './playtestFields.js';
import { MeteorShowerObstacle } from './playtestStreakers.js';
import { SatelliteDebrisObstacle, LightningObstacle } from './playtestWallHazards.js';

const PLAYTEST_IDS = [
    'spinner',
    'hollowOrbit',
    'ricochet',
    'blinkRow',
    'tunnelField',
    'shoal',
    'satDebris',
    'lightning',
    'meteorShower',
];

export function isPlaytestObstacleType(type) {
    return PLAYTEST_IDS.includes(type);
}

/** Radar hand on a hub. The hand kills; the fading arcs behind it are only its sweep. */
class SpinnerObstacle extends PlaytestBody {
    constructor(game, x, y, size) {
        super(game, x, y, size, 'spinner');
        this.length = size * 2.7;
        this.halfW = Math.max(1.1, size * 0.11);
        this.hub = size * 0.28;
        this.spin = (Math.random() < 0.5 ? -1 : 1) * knob(game, 'spinner', 'spin');
        this.rotation = Math.random() * Math.PI * 2;
    }

    update() {
        this.rotation += this.spin * this.tick();
    }

    render(ctx) {
        const extent = this.length + this.size;
        const screenY = this.onScreen(extent);
        if (screenY == null) return;
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        drawSweepTrail(ctx, this.length, Math.sign(this.spin), color.ink30, Math.max(1.25, this.halfW * 0.9));
        ctx.fillStyle = color.ink;
        ctx.fillRect(0, -this.halfW, this.length, this.halfW * 2);
        ctx.beginPath();
        ctx.arc(0, 0, this.hub, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    checkCollision(probe) {
        if (circleHits(probe.x, probe.y, probe.radius, this.x, this.y, this.hub)) return true;
        return circleHitsHand(
            probe.x, probe.y, probe.radius,
            this.x, this.y, this.rotation, this.length, this.halfW,
        );
    }
}

/** Two moons around an empty centre. The hole turns with them. */
class HollowOrbitObstacle extends PlaytestBody {
    constructor(game, x, y, size) {
        super(game, x, y, size, 'hollowOrbit');
        this.moonR = size * 0.42;
        this.orbit = size * 2.15;
        this.spin = (Math.random() < 0.5 ? -1 : 1) * knob(game, 'hollowOrbit', 'spin');
        this.rotation = Math.random() * Math.PI * 2;
        this.size = this.orbit + this.moonR;
    }

    update() {
        this.rotation += this.spin * this.tick();
    }

    moons() {
        const a = this.rotation;
        return [0, Math.PI].map((offset) => ({
            x: this.x + Math.cos(a + offset) * this.orbit,
            y: this.y + Math.sin(a + offset) * this.orbit,
        }));
    }

    render(ctx) {
        const screenY = this.onScreen(this.size);
        if (screenY == null) return;
        const dy = screenY - this.y;
        ctx.save();
        ctx.fillStyle = color.ink;
        for (const moon of this.moons()) {
            ctx.beginPath();
            ctx.arc(moon.x, moon.y + dy, this.moonR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    checkCollision(probe) {
        return this.moons().some((moon) =>
            circleHits(probe.x, probe.y, probe.radius, moon.x, moon.y, this.moonR));
    }
}

/** A shard on a straight diagonal that banks off the screen edges. */
class RicochetObstacle extends PlaytestBody {
    constructor(game, x, y, size) {
        super(game, x, y, size, 'ricochet');
        const dir = Math.random() < 0.5 ? -1 : 1;
        const pace = knob(game, 'ricochet', 'speed');
        this.vx = dir * game.width * 0.38 * pace;
        this.vy = game.height * 0.11 * pace;
        this.yMin = y - game.height * 0.22;
        this.yMax = y + game.height * 0.42;
    }

    update() {
        const dt = this.tick();
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const margin = this.size;
        if (this.x < margin) {
            this.x = margin;
            this.vx = Math.abs(this.vx);
        } else if (this.x > this.game.width - margin) {
            this.x = this.game.width - margin;
            this.vx = -Math.abs(this.vx);
        }
        if (this.y < this.yMin) {
            this.y = this.yMin;
            this.vy = Math.abs(this.vy);
        } else if (this.y > this.yMax) {
            this.y = this.yMax;
            this.vy = -Math.abs(this.vy);
        }
    }

    vertices() {
        const heading = Math.atan2(this.vy, this.vx);
        const verts = [];
        for (let i = 0; i < 3; i++) {
            const a = heading + (i * 2 * Math.PI) / 3;
            verts.push({
                x: this.x + Math.cos(a) * this.size,
                y: this.y + Math.sin(a) * this.size,
            });
        }
        return verts;
    }

    render(ctx) {
        const screenY = this.onScreen(this.size * 2);
        if (screenY == null) return;
        const dy = screenY - this.y;
        ctx.save();
        ctx.beginPath();
        this.vertices().forEach((v, i) => {
            if (i === 0) ctx.moveTo(v.x, v.y + dy);
            else ctx.lineTo(v.x, v.y + dy);
        });
        ctx.closePath();
        ctx.fillStyle = color.ink;
        ctx.fill();
        ctx.restore();
    }

    checkCollision(probe) {
        return circleHitsTriangle(probe.x, probe.y, probe.radius, this.vertices());
    }
}

/** Three rocks. One lane is hollow at a time, and that lane cycles. */
class BlinkRowObstacle extends PlaytestBody {
    constructor(game, y) {
        const rockR = Math.min(game.baseUnit * 1.65, game.width * 0.085);
        super(game, game.width * 0.5, y, rockR, 'blinkRow');
        this.rockR = rockR;
        this.beat = knob(game, 'blinkRow', 'beat');
        const margin = rockR * 1.7;
        const span = game.width - margin * 2;
        this.lanes = [0, 1, 2].map((i) => margin + (span * i) / 2);
    }

    update() {
        this.tick();
    }

    hollowIndex() {
        return Math.floor(this.age / this.beat) % 3;
    }

    render(ctx) {
        const screenY = this.onScreen(this.rockR * 2);
        if (screenY == null) return;
        const hollow = this.hollowIndex();
        const u = this.game.baseUnit;
        ctx.save();
        this.lanes.forEach((x, i) => {
            ctx.beginPath();
            ctx.arc(x, screenY, this.rockR, 0, Math.PI * 2);
            if (i === hollow) {
                ctx.strokeStyle = color.ink30;
                ctx.lineWidth = Math.max(1.25, u * 0.08);
                ctx.setLineDash([this.rockR * 0.38, this.rockR * 0.24]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.fillStyle = color.ink;
                ctx.fill();
            }
        });
        ctx.restore();
    }

    checkCollision(probe) {
        const hollow = this.hollowIndex();
        return this.lanes.some((x, i) => {
            if (i === hollow) return false;
            return circleHits(probe.x, probe.y, probe.radius, x, this.y, this.rockR);
        });
    }

    createDestructionParticles() {
        const ship = this.game.spacecraft;
        let x = this.x;
        if (ship) {
            let best = Infinity;
            for (const lane of this.lanes) {
                const d = Math.abs(lane - ship.x);
                if (d < best) {
                    best = d;
                    x = lane;
                }
            }
        }
        return inkBurst(this.game, x, this.y, this.rockR);
    }
}

/**
 * @param {string} type
 * @param {object} game
 * @param {number} x lane origin in pixels
 * @param {number} width lane width in pixels
 * @param {number} y world Y
 */
export function createPlaytestObstacle(type, game, x, width, y) {
    const laneX = width > game.width * 0.15 ? x + width * 0.5 : x;
    const margin = game.baseUnit * 4;
    const placed = clamp(laneX, margin, game.width - margin);
    switch (type) {
        case 'spinner':
            return new SpinnerObstacle(game, placed, y, rockRadius(game));
        case 'hollowOrbit':
            return new HollowOrbitObstacle(game, placed, y, Math.max(rockRadius(game), game.baseUnit * 2.4));
        case 'blinkRow':
            return new BlinkRowObstacle(game, y);
        case 'tunnelField':
            return new TunnelFieldObstacle(game, y);
        case 'shoal':
            return new ShoalObstacle(game, placed, y);
        case 'ricochet':
            return new RicochetObstacle(game, placed, y, rockRadius(game) * 0.85);
        case 'satDebris':
            return new SatelliteDebrisObstacle(game, placed, y);
        case 'lightning':
            return new LightningObstacle(game, placed, y);
        case 'meteorShower':
            return new MeteorShowerObstacle(game, placed, y);
        default:
            return null;
    }
}