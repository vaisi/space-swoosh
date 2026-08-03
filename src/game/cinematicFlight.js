// cinematicFlight.js
// Shared angled cruise used by LevelIntroSequence and LevelClearSequence so
// cinematics match zigzag / arc gameplay instead of forcing a straight-up rail.
// Changes:
// - seedIntroLean starts further off-side (near/past the frame edge) for a
//   clearer side entry into the run-start intro.
// - Created: streamCinematicFlight, captureArcHeading, seedIntroLean.
//   Silent wall bounces by default (no boop spam during hyperspeed).

import { FLIGHT_STYLE } from '../config/flightStyle.js';

const REF_FPS = 60;
const MIN_ARC_HEADING = 0.12; // ~7° — below this, outro falls back to upright

/**
 * Capture a fixed arc exit/entry heading from the ship's current bank.
 * @returns {{ heading: number }}
 */
export function captureArcHeading(ship) {
    let heading = ship.bank || ship.tangent || 0;
    if (Math.abs(heading) < MIN_ARC_HEADING) heading = 0;
    return { heading };
}

/**
 * Seed lean + start X for the run-start intro (zigzag sign or arc heading).
 * @returns {{ arcState: { heading: number } | null }}
 */
export function seedIntroLean(game, ship) {
    const cfg = game.config.spacecraft;
    const deg = cfg.zigzagAngleDeg ?? 52;
    const rad = (deg * Math.PI) / 180;
    const sign = Math.random() < 0.5 ? -1 : 1;

    ship.zigzagSign = sign;
    ship.moveState = null;

    // Enter from well off-side so the diagonal reads as a side approach.
    // Lean right (+1) comes in from the left edge (and vice versa).
    ship.x = sign > 0
        ? -ship.radius * 1.6
        : game.width + ship.radius * 1.6;

    const heading = sign * rad;
    ship.bank = heading;
    ship.tangent = heading;

    const zigzag = typeof ship.isZigzag === 'function'
        ? ship.isZigzag()
        : game.flightStyle === FLIGHT_STYLE.zigzag;

    return { arcState: zigzag ? null : { heading } };
}

/**
 * One wall-clock step of angled cinematic flight.
 * Zigzag uses `ship.zigzagSign`; arc uses `arcState.heading` (mutated on bounce).
 *
 * @param {object} game
 * @param {object} ship
 * @param {number} dt seconds
 * @param {{ arcState?: { heading: number } | null, bounceSfx?: boolean }} [opts]
 */
export function streamCinematicFlight(game, ship, dt, opts = {}) {
    const bounceSfx = opts.bounceSfx === true;
    const arcState = opts.arcState ?? null;
    ship.moveState = null;

    const prevX = ship.x;
    const prevY = ship.y;
    const cfg = game.config.spacecraft;
    const zigzag = typeof ship.isZigzag === 'function'
        ? ship.isZigzag()
        : game.flightStyle === FLIGHT_STYLE.zigzag;

    if (zigzag) {
        const deg = cfg.zigzagAngleDeg ?? 52;
        const rad = (deg * Math.PI) / 180;
        const speed = ship.baseSpeed * ship.boost * (cfg.zigzagSpeedScale ?? 1.45);
        const dist = speed * dt;
        ship.x += Math.sin(rad) * ship.zigzagSign * dist;
        ship.y -= Math.cos(rad) * dist;
        ship.verticalVelocity = speed * Math.cos(rad);
    } else {
        const heading = arcState ? arcState.heading : 0;
        const speed = ship.baseSpeed * ship.boost;
        const dist = speed * dt;
        ship.x += Math.sin(heading) * dist;
        ship.y -= Math.cos(heading) * dist;
        ship.verticalVelocity = Math.max(speed * Math.cos(heading), speed * 0.35);
    }

    // Sidewall bounce — flip lean / reflect heading. Silent unless bounceSfx.
    if (ship.x < ship.radius) {
        ship.x = ship.radius;
        if (zigzag) {
            ship.zigzagSign = 1;
        } else if (arcState) {
            arcState.heading = Math.abs(arcState.heading)
                || ((cfg.zigzagAngleDeg ?? 52) * Math.PI) / 180;
        }
        if (bounceSfx) {
            ship.triggerWallJelly?.(-1);
            game.wallBoopManager?.triggerBoop?.(ship, -1);
        }
    } else if (ship.x > game.width - ship.radius) {
        ship.x = game.width - ship.radius;
        if (zigzag) {
            ship.zigzagSign = -1;
        } else if (arcState) {
            const mag = Math.abs(arcState.heading)
                || ((cfg.zigzagAngleDeg ?? 52) * Math.PI) / 180;
            arcState.heading = -mag;
        }
        if (bounceSfx) {
            ship.triggerWallJelly?.(1);
            game.wallBoopManager?.triggerBoop?.(ship, 1);
        }
    }

    ship.updateHeading(prevX, prevY);
    ship.updateTrail();
    ship.updateHitCircles();
}

export { REF_FPS };
