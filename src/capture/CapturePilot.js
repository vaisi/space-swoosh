// Capture-only Zigzag pilot. It is never constructed during normal gameplay.

const DECISION_INTERVAL_MS = 75;
const FLIP_COMMIT_MS = 240;
const LOOKAHEAD_SECONDS = 2.6;
const SAMPLE_SECONDS = 1 / 30;
const COLLISION_COST = 1_000_000;
const WARNING_COST = 1_600;
const SPARKLE_REWARD = 7_000;
const LOW_FUEL_SPARKLE_REWARD = 15_000;
const SHIELD_REWARD = 14_000;
const SHIELD_REFRESH_REWARD = 5_000;
const SHIELDED_SMASH_REWARD = 9_000;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function safeCollisionCheck(obstacle, probe) {
    try {
        return obstacle?.checkCollision?.(probe) === true;
    } catch (error) {
        console.warn('[capture-pilot] Obstacle probe failed', error);
        return false;
    }
}

function centerDistance(target, probe) {
    const dx = (target?.x ?? Infinity) - probe.x;
    const dy = (target?.y ?? Infinity) - probe.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function targetRadius(target, fallback = 0) {
    if (Number.isFinite(target?.size)) return target.size;
    if (Number.isFinite(target?.radius)) return target.radius;
    return fallback;
}

function guidanceStrength(target, probe, gameWidth, fallbackRadius = 0) {
    const hitRadius = probe.radius + targetRadius(target, fallbackRadius);
    const guideRadius = Math.max(hitRadius * 5, gameWidth * 0.28);
    const distance = centerDistance(target, probe);
    return clamp(1 - (distance - hitRadius) / (guideRadius - hitRadius), 0, 1);
}

export class CapturePilot {
    constructor(game) {
        this.game = game;
        this.enabled = true;
        this.wasPlaying = false;
        this.lastDecisionAt = -Infinity;
        this.lastFlipAt = -Infinity;
        this.runStartedAt = 0;
        this.decisions = 0;
        this.flips = 0;
        this.lastChoice = 'waiting';
        this.lastScores = null;
        this.lanePhase = Math.random() * Math.PI * 2;
        this.laneRate = 0.11 + Math.random() * 0.08;
    }

    status() {
        return {
            enabled: this.enabled,
            active: this.wasPlaying,
            decisions: this.decisions,
            flips: this.flips,
            lastChoice: this.lastChoice,
            lastScores: this.lastScores,
        };
    }

    resetRun(now) {
        this.runStartedAt = now;
        this.lastDecisionAt = -Infinity;
        this.lastFlipAt = -Infinity;
        this.decisions = 0;
        this.flips = 0;
        this.lastChoice = 'waiting';
        this.lastScores = null;
        this.lanePhase = Math.random() * Math.PI * 2;
        this.laneRate = 0.11 + Math.random() * 0.08;
    }

    update(now = performance.now()) {
        const game = this.game;
        const ship = game.spacecraft;
        const playing = game.appScreen === 'playing' && !game.isPaused && !game.isGameOver;

        if (!playing) {
            this.wasPlaying = false;
            this.lastChoice = 'waiting';
            return;
        }
        if (!this.wasPlaying) this.resetRun(now);
        this.wasPlaying = true;

        if (!ship?.isZigzag?.()
            || ship.wormholeTransit
            || game.levelIntro?.active
            || now - this.lastDecisionAt < DECISION_INTERVAL_MS) return;

        this.lastDecisionAt = now;
        this.decisions += 1;

        const current = this.scorePath(ship.zigzagSign, now);
        const alternate = this.scorePath(-ship.zigzagSign, now);
        this.lastScores = {
            continue: Math.round(current.cost),
            flip: Math.round(alternate.cost),
            continueHitMs: Number.isFinite(current.collisionAt)
                ? Math.round(current.collisionAt * 1000)
                : null,
            flipHitMs: Number.isFinite(alternate.collisionAt)
                ? Math.round(alternate.collisionAt * 1000)
                : null,
            continueTargets: current.targets,
            flipTargets: alternate.targets,
        };

        const committed = now - this.lastFlipAt < FLIP_COMMIT_MS;
        const avoidsHit = Number.isFinite(current.collisionAt)
            && (!Number.isFinite(alternate.collisionAt)
                || alternate.collisionAt > current.collisionAt + 0.35);
        const materiallySafer = current.cost - alternate.cost > 4_000
            && alternate.cost < current.cost * 0.72;

        if (!committed && (avoidsHit || materiallySafer)) {
            ship.flipZigzag();
            this.lastFlipAt = now;
            this.flips += 1;
            this.lastChoice = avoidsHit ? 'flip-to-avoid' : 'flip-for-clearance';
        } else {
            this.lastChoice = committed ? 'hold-commitment' : 'continue';
        }
    }

    scorePath(initialSign, now) {
        const game = this.game;
        const ship = game.spacecraft;
        const cfg = game.config.spacecraft;
        const radians = ((cfg.zigzagAngleDeg ?? 52) * Math.PI) / 180;
        const speed = ship.baseSpeed
            * ship.forwardSpeedScale()
            * (cfg.zigzagSpeedScale ?? 1.45);
        const vx = Math.sin(radians) * speed;
        const vy = Math.cos(radians) * speed;
        const radius = ship.radius * (ship.shieldActive ? 0.98 : 1.15);
        const warningRadius = radius * 2.25;
        const minX = radius;
        const maxX = game.width - radius;
        const elapsed = Math.max(0, (now - this.runStartedAt) / 1000);
        const preferredX = game.width * (0.5 + 0.2 * Math.sin(
            this.lanePhase + elapsed * this.laneRate,
        ));

        let x = ship.x;
        let y = ship.y;
        let sign = initialSign;
        let cost = 0;
        let collisionAt = Infinity;
        const collectedSparkles = new Set();
        const collectedPowerUps = new Set();
        const smashedObstacles = new Set();
        const sparkleGuidance = new Map();
        const powerUpGuidance = new Map();

        const fuelMax = game.config.fuel?.max ?? 1;
        const fuelFraction = clamp((game.fuel ?? fuelMax) / fuelMax, 0, 1);
        const sparkleReward = SPARKLE_REWARD
            + LOW_FUEL_SPARKLE_REWARD * (1 - fuelFraction);
        const shieldDuration = (cfg.shieldDurationMs
            ?? game.config.shieldDurationMs
            ?? 5_000) / 1000;
        let shieldUntil = ship.shieldActive
            ? Math.max(0, (ship.shieldTimer ?? 0) / 1000)
            : -Infinity;

        for (let t = SAMPLE_SECONDS; t <= LOOKAHEAD_SECONDS; t += SAMPLE_SECONDS) {
            x += vx * sign * SAMPLE_SECONDS;
            y -= vy * SAMPLE_SECONDS;

            if (x < minX) {
                x = minX + (minX - x);
                sign = 1;
            } else if (x > maxX) {
                x = maxX - (x - maxX);
                sign = -1;
            }

            const probe = { x, y, radius };
            const warningProbe = { x, y, radius: warningRadius };
            const urgency = 1 + (LOOKAHEAD_SECONDS - t) / LOOKAHEAD_SECONDS;
            const shielded = t <= shieldUntil;

            for (const obstacle of game.obstacleManager?.obstacles ?? []) {
                if (Number.isFinite(obstacle.y)
                    && Math.abs(obstacle.y - y) > game.height * 0.65) continue;

                if (safeCollisionCheck(obstacle, probe)) {
                    if (shielded) {
                        if (!smashedObstacles.has(obstacle)) {
                            smashedObstacles.add(obstacle);
                            cost -= SHIELDED_SMASH_REWARD * urgency;
                        }
                    } else {
                        if (!Number.isFinite(collisionAt)) collisionAt = t;
                        cost += COLLISION_COST * urgency;
                    }
                } else if (safeCollisionCheck(obstacle, warningProbe)) {
                    cost += shielded
                        ? -WARNING_COST * 0.35 * urgency
                        : WARNING_COST * urgency;
                }
            }

            for (const powerUp of game.powerUpManager?.powerUps ?? []) {
                if (powerUp?.done || powerUp?.pressing) continue;
                const strength = guidanceStrength(
                    powerUp,
                    probe,
                    game.width,
                    game.baseUnit * 2,
                );
                powerUpGuidance.set(
                    powerUp,
                    Math.max(powerUpGuidance.get(powerUp) ?? 0, strength),
                );
                if (!collectedPowerUps.has(powerUp)
                    && safeCollisionCheck(powerUp, probe)) {
                    collectedPowerUps.add(powerUp);
                    const alreadyShielded = t <= shieldUntil;
                    cost -= (alreadyShielded
                        ? SHIELD_REFRESH_REWARD
                        : SHIELD_REWARD) * urgency;
                    shieldUntil = t + shieldDuration;
                }
            }

            for (const sparkle of game.collectibleManager?.collectibles ?? []) {
                const strength = guidanceStrength(
                    sparkle,
                    probe,
                    game.width,
                    game.baseUnit * 1.15,
                );
                sparkleGuidance.set(
                    sparkle,
                    Math.max(sparkleGuidance.get(sparkle) ?? 0, strength),
                );
                if (!collectedSparkles.has(sparkle)
                    && safeCollisionCheck(sparkle, probe)) {
                    collectedSparkles.add(sparkle);
                    cost -= sparkleReward * urgency;
                }
            }

            const edgeClearance = Math.min(x - minX, maxX - x);
            const softEdge = radius * 2.5;
            if (edgeClearance < softEdge) {
                const edgeRisk = (softEdge - edgeClearance) / softEdge;
                cost += edgeRisk * edgeRisk * 260;
            }
        }

        for (const [sparkle, strength] of sparkleGuidance) {
            if (!collectedSparkles.has(sparkle)) {
                cost -= sparkleReward * strength * strength * 0.55;
            }
        }
        for (const [powerUp, strength] of powerUpGuidance) {
            if (!collectedPowerUps.has(powerUp)) {
                const reward = ship.shieldActive
                    ? SHIELD_REFRESH_REWARD
                    : SHIELD_REWARD;
                cost -= reward * strength * strength * 0.55;
            }
        }

        // A quiet, slowly changing lane preference creates run-to-run variety
        // without overruling obstacle avoidance.
        cost += Math.abs(x - clamp(preferredX, minX, maxX)) * 1.5;
        return {
            cost,
            collisionAt,
            targets: {
                sparkles: collectedSparkles.size,
                shields: collectedPowerUps.size,
                smashes: smashedObstacles.size,
            },
        };
    }
}
