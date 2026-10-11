// hangarFlight.js
// Hangar preview. A slice of a real run, kept inside the demo stage.
// Changes:
// - The flight lane is inset from the stage edges so a banked hull and its
//   wake stay on the stage. Merlin and Rook were flying out the corner.
// - The preview ship is a Spacecraft. Each frame calls Spacecraft.update(),
//   the same step the run uses (zigzag or arc, heading, and updateTrail).
//   The camera only seats the hull. Trail samples stay in world space.
// - Locked and unlisted hulls draw in full color. No grayscale preview.

import { Spacecraft } from '../entities/Spacecraft.js';
import { drawSkinSpecimen } from './skinPreview.js';
import { getTheme } from '../brand/theme.js';

const neighborCache = new Map();

function previewHost(game, skinId, worldWidth) {
    return {
        width: worldWidth,
        height: game.height,
        baseUnit: game.baseUnit,
        config: game.config,
        profile: game.profile || { speedMultiplier: 1.1 },
        flightStyle: game.flightStyle,
        shipSkinId: skinId,
        tickScale: game.tickScale || 1,
        snappyHz: game.snappyHz || 120,
        isPaused: false,
        iosDrawLod: false,
        fuelDying: false,
        useHullCache: game.useHullCache,
        wallBoopManager: null,
        obstacleManager: null,
        soundManager: game.soundManager,
        camera: { getRelativeY: (worldY) => worldY },
    };
}

function warm(ship) {
    const host = ship.game;
    const tick = (1 / 60) * (host.snappyHz || 120);
    host.tickScale = tick;
    for (let i = 0; i < 120; i++) ship.update();
}

/** Inset lane so the hull and the wake behind it stay inside the stage. */
export function hangarStageLane(stageWidth, unit) {
    const safe = Math.max(8, unit || 8);
    const margin = Math.max(stageWidth * 0.2, safe * 5.5);
    const lane = Math.max(safe * 8, stageWidth - margin * 2);
    return { margin: (stageWidth - lane) / 2, lane };
}

export function createHangarFlight(game, skinId, stageWidth) {
    const { margin, lane } = hangarStageLane(stageWidth, game.baseUnit);
    const host = previewHost(game, skinId, lane);
    const ship = new Spacecraft(host);
    ship.x = host.width * 0.5;
    ship.y = host.height * 0.8;
    ship.prevX = ship.x;
    ship.prevY = ship.y;
    warm(ship);
    return { host, ship, skinId, margin, stageWidth };
}

export function flipHangarFlight(flight) {
    const ship = flight?.ship;
    if (!ship) return;
    if (ship.isZigzag()) ship.flipZigzag();
    else ship.startMovement(ship.x < ship.game.width * 0.5 ? 'right' : 'left');
}

export function stepHangarFlight(flight, game) {
    if (!flight || !game) return;
    const host = flight.host;
    host.tickScale = game.tickScale || 1;
    host.flightStyle = game.flightStyle;
    host.snappyHz = game.snappyHz || host.snappyHz;
    host.isPaused = false;
    host.baseUnit = game.baseUnit;
    flight.ship.radius = game.baseUnit;
    flight.ship.update();
}

export function drawHangarFlight(ctx, flight, seatY, clip) {
    const ship = flight?.ship;
    if (!ship) return;
    flight.host.camera = {
        getRelativeY(worldY) {
            return seatY + (worldY - ship.y);
        },
    };
    ctx.save();
    if (clip) {
        ctx.beginPath();
        ctx.rect(clip.x, clip.y, clip.w, clip.h);
        ctx.clip();
    }
    ship.render(ctx);
    ctx.restore();
}

export function neighborStill(skin, radius) {
    const key = `${skin.id}:${radius.toFixed(1)}:${getTheme()}`;
    const hit = neighborCache.get(key);
    if (hit) return hit;
    const w = Math.ceil(radius * 7);
    const h = Math.ceil(radius * 8);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawSkinSpecimen(ctx, skin, w / 2, h * 0.38, radius, 0, { longWake: true });
    neighborCache.set(key, canvas);
    return canvas;
}

export function drawNeighborStill(ctx, skin, cx, cy, radius, { alpha = 0.28, scale = 0.72, reveal = 1 } = {}) {
    const still = neighborStill(skin, radius);
    const w = still.width * scale;
    const h = still.height * scale;
    const x = cx - w / 2;
    const y = cy - h * 0.38;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (reveal < 0.999) {
        ctx.beginPath();
        const shown = Math.max(0, Math.min(1, reveal));
        ctx.rect(x, y + h * (1 - shown), w, h * shown + 1);
        ctx.clip();
    }
    ctx.drawImage(still, x, y, w, h);
    ctx.restore();
}
