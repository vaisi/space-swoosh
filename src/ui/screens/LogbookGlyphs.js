// LogbookGlyphs.js
// Space Log picture-well specimens: in-game silhouettes at playfield scale.
// Changes:
// - Meteor shower specimen leads with dashed streaks, then solid drops.
// - Spinner specimen is a radar: hand plus fading sweep arcs.
// - Playtest branch specimens: spinner, hollowOrbit, blinkRow,
//   ricochet, tunnelField, shoal, satDebris, lightning (with forks),
//   meteorShower. Bumper, comet, and snap removed. Hazard Lab only.
// - Space BOOP: zigzag bounce (52° from vertical) with even Signal-Blue dots
//   kissing the left wall then reflecting — matches the in-run wake, not a
//   droop off the hull.
// - Created file: the well is a cropped corridor (20 baseUnits across). Full-span
//   contacts (finish gate, drift, barriers, wall boost, sweep) go edge to edge;
//   compact contacts use ObstacleManager / Collectible / PowerUp sizes so a
//   sparkle stays smaller than an asteroid and the finish stream crosses the well.

import { color, font } from '../../brand/tokens.js';
import { drawSparkle, setLabelType, resetType } from '../../utils/BrandDraw.js';
import { drawSweepTrail } from '../../managers/playtestShared.js';

/** Well width maps to this many in-game baseUnits (zoomed corridor crop). */
export const LOGBOOK_CORRIDOR_U = 20;

const TAU = Math.PI * 2;

/** Representative in-game radii / spans (baseUnits). */
const U = {
    asteroid: 3.6,
    sparkle: 1.15,
    shield: 2,
    wormhole: 2,
    blackhole: 3,
    wallW: 0.9,
    wallH: 10,
    barrierW: 2,
    barrierH: 14,
    sweep: 1.22,
    repulsor: 1.25,
    phase: 1.65,
    driftH: 5.0,
};

function inkOf(dimmed) {
    return dimmed ? color.ink30 : color.ink;
}

function signalOf(dimmed) {
    return dimmed ? `rgba(${color.signalRgb}, 0.35)` : color.signal;
}

function fillCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
}

function strokeCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
}

function fillPolygon(ctx, cx, cy, r, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const a = rot + (i * TAU) / n;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function fillStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? r : r * 0.5;
        const a = (i * Math.PI) / 4;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawTriangle(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6));
    ctx.lineTo(cx - r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawFinishGate(ctx, x, y, w, h, u, ink, signal) {
    const cy = y + h / 2;
    const handleLen = Math.max(u * 1.35, w * 0.16);
    const handleH = Math.max(u * 0.72, h * 0.2);
    const tipW = Math.max(u * 0.38, w * 0.045);
    const inset = u * 0.18;
    const leftOuter = x + inset;
    const rightOuter = x + w - inset;
    const leftTip = leftOuter + handleLen;
    const rightTip = rightOuter - handleLen;

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.setLineDash([u * 0.42, u * 0.32]);
    ctx.strokeStyle = `rgba(${color.signalRgb}, 0.3)`;
    ctx.lineWidth = u * 0.22;
    ctx.beginPath();
    ctx.moveTo(leftTip, cy);
    ctx.lineTo(rightTip, cy);
    ctx.stroke();
    ctx.strokeStyle = signal;
    ctx.lineWidth = Math.max(1.5, u * 0.11);
    ctx.beginPath();
    ctx.moveTo(leftTip, cy);
    ctx.lineTo(rightTip, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    const emitter = (outerX, facingRight) => {
        const tipX = facingRight ? outerX + handleLen : outerX - handleLen;
        const bodyLeft = facingRight ? outerX : tipX + tipW;
        const bodyW = handleLen - tipW;
        const top = cy - handleH / 2;
        const r = handleH * 0.22;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(bodyLeft + r, top);
        ctx.arcTo(bodyLeft + bodyW, top, bodyLeft + bodyW, top + handleH, r);
        ctx.arcTo(bodyLeft + bodyW, top + handleH, bodyLeft, top + handleH, r);
        ctx.arcTo(bodyLeft, top + handleH, bodyLeft, top, r);
        ctx.arcTo(bodyLeft, top, bodyLeft + bodyW, top, r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = signal;
        const tipLeft = facingRight ? tipX - tipW : tipX;
        ctx.fillRect(tipLeft, cy - handleH * 0.42, tipW, handleH * 0.84);
        ctx.beginPath();
        ctx.arc(
            facingRight ? tipX - tipW * 0.15 : tipX + tipW * 0.15,
            cy,
            u * 0.14,
            0,
            TAU,
        );
        ctx.fill();
    };
    emitter(leftOuter, true);
    emitter(rightOuter, false);
    ctx.restore();
}

/**
 * Draw an in-game specimen clipped to the picture well.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} icon catalog icon id
 * @param {number} x well left
 * @param {number} y well top
 * @param {number} w well width
 * @param {number} h well height
 * @param {boolean} [dimmed]
 */
export function drawLogbookSpecimen(ctx, icon, x, y, w, h, dimmed = false) {
    const ink = inkOf(dimmed);
    const signal = signalOf(dimmed);
    const u = Math.min(w, h) / LOGBOOK_CORRIDOR_U;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';

    switch (icon) {
        case 'asteroidCircle':
            fillCircle(ctx, cx, cy, U.asteroid * u);
            break;
        case 'asteroidTriangle':
            drawTriangle(ctx, cx, cy, U.asteroid * u);
            break;
        case 'asteroidSquare': {
            const half = U.asteroid * 0.7 * u;
            ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
            break;
        }
        case 'sideBarrier': {
            const bw = U.barrierW * u;
            const bh = Math.min(h * 0.92, U.barrierH * u);
            ctx.fillRect(x, cy - bh / 2, bw, bh);
            ctx.fillRect(x + w - bw, cy - bh / 2, bw, bh);
            break;
        }
        case 'complex': {
            const core = U.asteroid * 0.8 * u;
            fillCircle(ctx, cx, cy, core);
            const dist = U.asteroid * 1.5 * u;
            const moon = U.asteroid * 0.25 * u;
            for (let i = 0; i < 3; i++) {
                const a = (TAU * i) / 3 - 0.4;
                fillCircle(ctx, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, moon);
            }
            break;
        }
        case 'moving':
            fillPolygon(ctx, cx, cy, U.asteroid * 0.8 * u, 5);
            break;
        case 'shooting': {
            fillStar(ctx, cx, cy, U.asteroid * u);
            const shot = U.asteroid * 0.2 * u;
            fillCircle(ctx, cx + U.asteroid * 1.55 * u, cy - U.asteroid * 0.15 * u, shot);
            fillCircle(ctx, cx + U.asteroid * 2.15 * u, cy - U.asteroid * 0.35 * u, shot);
            break;
        }
        case 'pulsating': {
            fillCircle(ctx, cx, cy, U.asteroid * 1.45 * u);
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = Math.max(1.2, u * 0.08);
            strokeCircle(ctx, cx, cy, U.asteroid * 2 * u);
            break;
        }
        case 'phase': {
            const size = U.phase * u;
            const piece = size * 0.36;
            const spread = size * 2.05;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU - Math.PI / 2;
                ctx.save();
                ctx.translate(cx + Math.cos(a) * spread, cy + Math.sin(a) * spread);
                ctx.rotate(a + 0.4);
                ctx.fillRect(-piece, -piece, piece * 2, piece * 2);
                ctx.restore();
            }
            break;
        }
        case 'sweepGate': {
            const size = U.sweep * u;
            const halfLen = size * 2.8;
            const halfW = Math.max(0.85, size * 0.045);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.42);
            ctx.fillRect(-halfLen, -halfW, halfLen * 2, halfW * 2);
            ctx.restore();
            break;
        }
        case 'repulsor': {
            const size = U.repulsor * u;
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = Math.max(1, u * 0.06);
            ctx.setLineDash([size * 0.35, size * 0.22]);
            strokeCircle(ctx, cx, cy, size * 2.4);
            ctx.setLineDash([]);
            ctx.lineWidth = Math.max(1.25, u * 0.07);
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * TAU;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * size * 1.35, cy + Math.sin(a) * size * 1.35);
                ctx.lineTo(cx + Math.cos(a) * size * 1.9, cy + Math.sin(a) * size * 1.9);
                ctx.stroke();
            }
            ctx.fillStyle = ink;
            fillCircle(ctx, cx, cy, size);
            break;
        }
        case 'driftCurrent': {
            const halfH = (U.driftH * u) / 2;
            const dash = u * 0.55;
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = Math.max(1.1, u * 0.06);
            ctx.lineCap = 'round';
            ctx.setLineDash([dash, dash * 0.85]);
            for (let i = 0; i < 7; i++) {
                const yy = cy - halfH * 0.72 + (i / 6) * halfH * 1.44;
                ctx.beginPath();
                ctx.moveTo(x, yy);
                ctx.lineTo(x + w, yy);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            break;
        }
        case 'wormhole': {
            const size = U.wormhole * u;
            ctx.strokeStyle = signal;
            ctx.lineWidth = size * 0.1;
            ctx.setLineDash([size * 0.28, size * 0.28]);
            strokeCircle(ctx, cx, cy, size);
            ctx.setLineDash([]);
            break;
        }
        case 'blackhole': {
            const size = U.blackhole * u;
            const g = ctx.createRadialGradient(cx, cy, size, cx, cy, size * 4);
            g.addColorStop(0, `rgba(${color.inkRgb}, 0.4)`);
            g.addColorStop(1, `rgba(${color.inkRgb}, 0)`);
            ctx.fillStyle = g;
            fillCircle(ctx, cx, cy, size * 4);
            ctx.fillStyle = ink;
            fillCircle(ctx, cx, cy, size);
            ctx.strokeStyle = ink;
            ctx.lineWidth = Math.max(1.5, u * 0.1);
            strokeCircle(ctx, cx, cy, size * 1.2);
            break;
        }
        case 'spinner': {
            const hub = u * 0.7;
            const len = u * 4.2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.6);
            drawSweepTrail(ctx, len, -1, color.ink30, Math.max(1.25, u * 0.14));
            ctx.fillStyle = ink;
            ctx.fillRect(0, -u * 0.16, len, u * 0.32);
            fillCircle(ctx, 0, 0, hub);
            ctx.restore();
            break;
        }
        case 'hollowOrbit': {
            const moon = u * 1.15;
            const orbit = u * 3.4;
            fillCircle(ctx, cx - orbit, cy, moon);
            fillCircle(ctx, cx + orbit, cy, moon);
            break;
        }
        case 'blinkRow': {
            const r = u * 1.55;
            const xs = [cx - r * 2.5, cx, cx + r * 2.5];
            xs.forEach((px, i) => {
                if (i === 1) {
                    ctx.strokeStyle = color.ink30;
                    ctx.lineWidth = Math.max(1.25, u * 0.08);
                    ctx.setLineDash([r * 0.38, r * 0.24]);
                    strokeCircle(ctx, px, cy, r);
                    ctx.setLineDash([]);
                } else {
                    ctx.fillStyle = ink;
                    fillCircle(ctx, px, cy, r);
                }
            });
            break;
        }
        case 'tunnelField': {
            const k = Math.tan((52 * Math.PI) / 180);
            const leg = h * 0.32;
            const pts = [
                { x: cx - leg * k * 0.5, y: cy + leg * 1.5 },
                { x: cx + leg * k * 0.5, y: cy + leg * 0.5 },
                { x: cx - leg * k * 0.5, y: cy - leg * 0.5 },
                { x: cx + leg * k * 0.5, y: cy - leg * 1.5 },
            ];
            const distTo = (px, py) => {
                let best = Infinity;
                for (let i = 0; i < pts.length - 1; i++) {
                    const a = pts[i];
                    const b = pts[i + 1];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
                    best = Math.min(best, Math.hypot(px - a.x - t * dx, py - a.y - t * dy));
                }
                return best;
            };
            const step = u * 1.6;
            const r = u * 0.6;
            ctx.fillStyle = ink;
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = Math.max(1, u * 0.07);
            for (let py = y + step * 0.5, row = 0; py < y + h; py += step * 0.87, row++) {
                for (let px = x + (row % 2 ? step * 0.5 : 0); px < x + w; px += step) {
                    const d = distTo(px, py);
                    if (d < u * 2.2) continue;
                    if (d < u * 3.4) {
                        ctx.setLineDash([r * 0.6, r * 0.4]);
                        strokeCircle(ctx, px, py, r);
                        ctx.setLineDash([]);
                    } else {
                        fillCircle(ctx, px, py, r);
                    }
                }
            }
            break;
        }
        case 'shoal': {
            const fish = [
                [-2.6, 0.4], [-1.2, -0.9], [0.2, 0.2], [1.5, -0.6], [2.8, 0.7],
                [-0.6, 1.3], [1.0, 1.4], [-2.0, -1.6], [2.2, -1.8],
            ];
            ctx.fillStyle = ink;
            fish.forEach(([fx, fy]) => fillCircle(ctx, cx + fx * u * 1.6, cy + fy * u * 1.6, u * 0.6));
            break;
        }
        case 'ricochet': {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(0.55);
            drawTriangle(ctx, 0, 0, U.asteroid * 0.75 * u);
            ctx.restore();
            break;
        }
        case 'satDebris': {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.35);
            ctx.fillStyle = ink;
            ctx.strokeStyle = ink;
            ctx.lineWidth = Math.max(1.2, u * 0.18);
            ctx.beginPath();
            ctx.moveTo(-u * 2.4, 0);
            ctx.lineTo(u * 2.4, 0);
            ctx.stroke();
            ctx.fillRect(-u, -u, u * 2, u * 2);
            ctx.fillRect(-u * 3.55, -u * 0.62, u * 2.3, u * 1.24);
            ctx.fillRect(u * 1.25, -u * 0.62, u * 2.3, u * 1.24);
            ctx.fillRect(-u * 0.14, -u * 2.3, u * 0.28, u * 1.3);
            ctx.restore();
            break;
        }
        case 'lightning': {
            const g = ctx.createRadialGradient(x, cy, 0, x, cy, u * 4);
            g.addColorStop(0, `rgba(${color.inkRgb}, ${dimmed ? 0.15 : 0.4})`);
            g.addColorStop(1, `rgba(${color.inkRgb}, 0)`);
            ctx.fillStyle = g;
            fillCircle(ctx, x, cy, u * 4);
            const jags = [0, -0.9, 0.7, -1.2, 0.4, 1.1, -0.6, 0.9, -1.0, 0.3];
            const reach = w * 0.7;
            const trace = () => {
                ctx.beginPath();
                jags.forEach((j, i) => {
                    const px = x + (reach * i) / (jags.length - 1);
                    const py = cy + j * u;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
            };
            const forks = [
                [[3, -1.2], [4.0, -2.4], [4.6, -3.3]],
                [[6, -0.6], [7.1, 0.8], [7.6, 2.0]],
            ].map(([[k, j], ...rest]) => [
                [x + (reach * k) / (jags.length - 1), cy + j * u],
                ...rest.map(([kk, jj]) => [x + (reach * kk) / (jags.length - 1), cy + jj * u]),
            ]);
            const traceFork = (pts) => {
                ctx.beginPath();
                pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
                ctx.stroke();
            };
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = u * 0.6;
            trace();
            ctx.stroke();
            ctx.strokeStyle = ink;
            ctx.lineWidth = u * 0.36;
            trace();
            ctx.stroke();
            ctx.lineWidth = u * 0.24;
            forks.forEach(traceFork);
            break;
        }
        case 'meteorShower': {
            const a = (28 * Math.PI) / 180;
            const sx = Math.sin(a) * u * 3.5;
            const sy = Math.cos(a) * u * 3.5;
            const ghosts = [[-7, -9], [-1, -11], [5, -8], [8, -12]];
            ctx.save();
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = Math.max(1, u * 0.28);
            ctx.lineCap = 'butt';
            ctx.setLineDash([u * 0.45, u * 0.5]);
            ctx.beginPath();
            ghosts.forEach(([dx, dy]) => {
                const mx = cx + dx * u;
                const my = cy + dy * u;
                ctx.moveTo(mx, my);
                ctx.lineTo(mx - sx * 1.15, my - sy * 1.15);
            });
            ctx.stroke();
            ctx.restore();
            const drops = [[-5, -4], [-1, -6], [3, -3], [6, -7], [-6, 2], [-2, 1], [2, 4], [5, 1], [-3, 6], [1, 8]];
            drops.forEach(([dx, dy]) => {
                const mx = cx + dx * u;
                const my = cy + dy * u;
                ctx.strokeStyle = color.ink30;
                ctx.lineWidth = u * 0.46;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(mx - sx, my - sy);
                ctx.stroke();
                ctx.fillStyle = ink;
                fillCircle(ctx, mx, my, u * 0.42);
            });
            break;
        }
        case 'spaceBoop': {
            // Zigzag wall bounce: 52° from vertical, equal in/out (GameConfig).
            const wall = u * 1.15;
            ctx.fillRect(x, y, wall, h);
            const k = Math.tan((52 * Math.PI) / 180);
            const step = u * 0.92;
            const dotR = u * 0.22;
            const contactX = x + wall + u * 0.12;
            const contactY = cy + u * 1.35;
            const legs = 5;
            ctx.fillStyle = dimmed ? `rgba(${color.signalRgb}, 0.35)` : signal;
            fillCircle(ctx, contactX, contactY, dotR);
            for (let i = 1; i <= legs; i++) {
                fillCircle(ctx, contactX + i * step * k, contactY + i * step, dotR);
                fillCircle(ctx, contactX + i * step * k, contactY - i * step, dotR);
            }
            ctx.fillStyle = ink;
            fillCircle(
                ctx,
                contactX + legs * step * k,
                contactY - legs * step,
                u * 1.05,
            );
            break;
        }
        case 'shield': {
            const size = U.shield * u;
            ctx.lineCap = 'round';
            for (let i = 0; i < 2; i++) {
                const tt = 0.22 + i * 0.38;
                const radius = size * (0.5 + tt * 0.8);
                const opacity = Math.pow(1 - tt, 1.8) * 0.9;
                ctx.strokeStyle = `rgba(${color.signalRgb}, ${dimmed ? opacity * 0.4 : opacity})`;
                ctx.lineWidth = u * 0.16;
                strokeCircle(ctx, cx, cy, radius);
            }
            const arm = size * 0.45;
            ctx.strokeStyle = ink;
            ctx.lineWidth = u * 0.28;
            ctx.beginPath();
            ctx.moveTo(cx - arm, cy);
            ctx.lineTo(cx + arm, cy);
            ctx.moveTo(cx, cy - arm);
            ctx.lineTo(cx, cy + arm);
            ctx.stroke();
            break;
        }
        case 'wallBoost': {
            const bw = U.wallW * u;
            const bh = Math.min(h * 0.86, U.wallH * u);
            ctx.fillStyle = signal;
            ctx.globalAlpha = 0.82;
            ctx.fillRect(x, cy - bh / 2, bw, bh);
            ctx.globalAlpha = 1;
            break;
        }
        case 'pointsSparkle': {
            const r = U.sparkle * u;
            ctx.fillStyle = color.signalSoft;
            fillCircle(ctx, cx, cy, r * 1.9);
            drawSparkle(ctx, cx, cy, r, { fill: signal });
            break;
        }
        case 'styleSwoosh': {
            const rock = u * 2.4;
            const gap = u * 1.55;
            fillCircle(ctx, cx - rock - gap / 2, cy, rock);
            fillCircle(ctx, cx + rock + gap / 2, cy, rock);
            ctx.strokeStyle = `rgba(${color.signalRgb}, ${dimmed ? 0.28 : 0.7})`;
            ctx.lineWidth = Math.max(1.5, u * 0.18);
            strokeCircle(ctx, cx, cy, u * 2.1);
            ctx.strokeStyle = signal;
            ctx.lineWidth = Math.max(1.2, u * 0.12);
            ctx.beginPath();
            ctx.moveTo(cx, cy + u * 2.4);
            ctx.lineTo(cx, cy - u * 2.4);
            ctx.stroke();
            break;
        }
        case 'deflectorSmash': {
            const rock = U.asteroid * 0.85 * u;
            fillCircle(ctx, cx, cy, rock);
            ctx.strokeStyle = signal;
            ctx.lineWidth = Math.max(1.5, u * 0.18);
            strokeCircle(ctx, cx, cy, rock * 1.55);
            ctx.globalAlpha = 0.45;
            strokeCircle(ctx, cx, cy, rock * 2.05);
            ctx.globalAlpha = 1;
            break;
        }
        case 'finishGate':
            drawFinishGate(ctx, x, y, w, h, u, ink, signal);
            break;
        case 'spaceTravelBoost': {
            ctx.beginPath();
            ctx.moveTo(cx, cy - u * 2.4);
            ctx.lineTo(cx + u * 1.7, cy + u * 2.05);
            ctx.lineTo(cx, cy + u * 0.8);
            ctx.lineTo(cx - u * 1.7, cy + u * 2.05);
            ctx.closePath();
            ctx.fill();
            break;
        }
        case 'level':
            setLabelType(ctx, u * 4.2, 700);
            ctx.fillStyle = ink;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 ${u * 4.2}px ${font.mono || font.ui}`;
            ctx.fillText('#', cx, cy);
            resetType(ctx);
            break;
        default:
            ctx.strokeStyle = color.ink30;
            ctx.lineWidth = 2;
            strokeCircle(ctx, cx, cy, u * 2.2);
    }
    ctx.restore();
}
