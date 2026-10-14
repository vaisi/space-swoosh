// playtestShared.js
// Shared maths and base class for Hazard Lab playtest obstacles.
// Changes:
// - Created file: helpers and PlaytestBody moved out of playtestObstacles.js
//   so playtestFields.js can extend the same base without a circular import.
// - Added distToPolyline() and burstInto() for the tunnel field and shoal.
// - Added circleHitsRect()/traceRect() for satellite debris, and
//   PlaytestBody.retire()/markHit() for movers that finish or burst off-centre.

export function dtOf(game) {
    return game.dt ?? (1 / 60);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function rockRadius(game) {
    const { minSize, maxSize } = game.config.obstacles;
    const span = maxSize - minSize;
    return (minSize + Math.random() * span) * game.baseUnit * 0.62;
}

export function inkBurst(game, x, y, size, count = 10) {
    const particles = [];
    const baseSpeed = game.baseUnit * 0.5;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = baseSpeed * (2 + Math.random() * 3);
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size * (0.1 + Math.random() * 0.2),
            opacity: 1,
            rotation: Math.random() * Math.PI * 2,
        });
    }
    return particles;
}

/** Push a small burst straight into the manager's particle list. */
export function burstInto(game, x, y, size, count = 6) {
    const list = game.obstacleManager?.destructionParticles;
    if (list) list.push(...inkBurst(game, x, y, size, count));
}

/**
 * Radar sweep behind a hand that points along +x. `dir` is the spin sign, so
 * the arcs fan out over the ground the hand just left and fade toward the tail.
 * Decoration only: nothing here collides.
 */
export function drawSweepTrail(ctx, length, dir, style, width, { sweep = 0.95, rings = 4, slices = 7 } = {}) {
    const step = sweep / slices;
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    for (let s = 0; s < slices; s++) {
        const near = -dir * s * step;
        const far = -dir * (s + 1) * step;
        const from = Math.min(near, far);
        const to = Math.max(near, far);
        ctx.globalAlpha = 1 - s / slices;
        ctx.beginPath();
        for (let k = 1; k <= rings; k++) {
            const r = length * (0.4 + (0.6 * k) / rings);
            ctx.moveTo(Math.cos(from) * r, Math.sin(from) * r);
            ctx.arc(0, 0, r, from, to);
        }
        ctx.stroke();
    }
    ctx.restore();
}

export function circleHits(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy <= r * r;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
        t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
    }
    const ex = px - (x1 + t * dx);
    const ey = py - (y1 + t * dy);
    return Math.sqrt(ex * ex + ey * ey);
}

export function distToPolyline(px, py, points) {
    let best = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const d = distToSegment(px, py, a.x, a.y, b.x, b.y);
        if (d < best) best = d;
    }
    return best;
}

export function circleHitsSegment(px, py, r, x1, y1, x2, y2) {
    return distToSegment(px, py, x1, y1, x2, y2) <= r;
}

/** Rotated bar from local (0,0) to (length,0), thickness 2*halfW. */
export function circleHitsHand(px, py, r, ox, oy, rotation, length, halfW) {
    const dx = px - ox;
    const dy = py - oy;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const cx = Math.max(0, Math.min(length, lx));
    const cy = Math.max(-halfW, Math.min(halfW, ly));
    const ex = lx - cx;
    const ey = ly - cy;
    return ex * ex + ey * ey <= r * r;
}

function pointInTriangle(px, py, verts) {
    const [a, b, c] = verts;
    const sign = (p1, p2, p3) =>
        (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const p = { x: px, y: py };
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

export function circleHitsTriangle(px, py, r, verts) {
    if (pointInTriangle(px, py, verts)) return true;
    for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        if (circleHitsSegment(px, py, r, verts[i].x, verts[i].y, verts[j].x, verts[j].y)) {
            return true;
        }
    }
    return false;
}

/** Rectangle centred on (cx, cy), half extents hw/hh, turned by `rotation`. */
export function circleHitsRect(px, py, r, cx, cy, rotation, hw, hh) {
    const dx = px - cx;
    const dy = py - cy;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const ex = lx - Math.max(-hw, Math.min(hw, lx));
    const ey = ly - Math.max(-hh, Math.min(hh, ly));
    return ex * ex + ey * ey <= r * r;
}

/** Same rectangle as circleHitsRect, drawn as one closed subpath. */
export function traceRect(ctx, cx, cy, rotation, hw, hh) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    corners.forEach(([lx, ly], i) => {
        const x = cx + lx * cos - ly * sin;
        const y = cy + lx * sin + ly * cos;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
}

export class PlaytestBody {
    constructor(game, x, y, size, logbookId) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = size;
        this.logbookId = logbookId;
        this.age = 0;
    }

    tick() {
        const dt = dtOf(this.game);
        this.age += dt;
        return dt;
    }

    onScreen(extent) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        if (relativeY + extent < 0 || relativeY - extent > this.game.height) return null;
        return relativeY;
    }

    /** Remember where a probe touched, so a shield smash bursts there. */
    markHit(x, y) {
        this.hitX = x;
        this.hitY = y;
        return true;
    }

    /** Passed obstacles are never culled, so finished movers drop themselves. */
    retire() {
        this.retired = true;
        this.y = -Infinity;
    }

    createDestructionParticles() {
        return inkBurst(this.game, this.hitX ?? this.x, this.hitY ?? this.y, this.size);
    }
}
