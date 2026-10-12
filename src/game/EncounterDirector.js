// EncounterDirector.js
// Schedules authored catalog recipes: 1–2 Journey spikes (progress of the
// goal) or Open Space storms (absolute KM). Speed is untouched.
// Changes:
// - Journey L24+ post-spike quiet is 0.56 (12% more air than the 0.5 hold).
// - Open Space past 20k: storm quiet 0.21 / chain 0.10.
// - Open Space storms: short quiet (0.18) after a patch; dual recipes at the
//   same KM chain (0.08) instead of two half-screen holes. Recipe gaps cap at 0.28.
// - Open Space: KM-anchored storms at unlock marks, then every 1500 KM after 5k;
//   dual-family patches after 12.5k.
// - Journey 6+ one spike; 25+ two different families.
// - `accompany` holds a recipe open while its set piece is still in view and
//   lets ordinary rows spawn (the load budget keeps those to rocks + one light).
//   profile.setPieceEncounterIds schedules those recipes by id (Hazard Lab).
// - Created file: progress-based encounter windows, quiet-zone breathing room.

import { clamp01 } from '../utils/math.js';
import { ENCOUNTER_CATALOG, pickEncounterRecipes } from '../config/EncounterCatalog.js';
import { demandTypeOf, isSetPiece } from '../config/ObstacleDemand.js';
import {
    openSpaceStormMarks,
    stormCountAt,
    stormQuietFrac,
    typesAtKm,
    weatherAt,
    OPEN_SPACE_STORM_GAP_CAP,
} from '../config/OpenSpaceWeather.js';
import { DEEP_FROM_LEVEL } from '../config/HazardPairs.js';
import { OPEN_WORLD_UNLOCKS, PLAY_MODE } from '../modes/RunProfile.js';

function jitterFor(level, index) {
    const seed = ((level || 1) * 997 + (index + 3) * 7919) % 1000;
    return (seed / 1000 - 0.5) * 0.08;
}

function unlockingFocus(atKm) {
    const unlocking = OPEN_WORLD_UNLOCKS
        .filter((entry) => entry.score === atKm && entry.type && entry.type !== 'simple')
        .map((entry) => entry.type);
    return unlocking[unlocking.length - 1] || null;
}

function pickStormRecipes(atKm, stormIndex, lastFamily) {
    const types = typesAtKm(atKm, OPEN_WORLD_UNLOCKS);
    const sky = weatherAt(atKm);
    return pickEncounterRecipes({
        types,
        focusType: unlockingFocus(atKm) || sky.focus,
        pairTheme: sky.pair,
        count: stormCountAt(atKm),
        level: stormIndex + Math.round(atKm / 100),
        avoidFamily: lastFamily,
    });
}

export class EncounterDirector {
    constructor(game) {
        this.game = game;
        this.schedule = [];
        this.live = null;
        this.quietUntilY = null;
        this.kmMode = false;

        const profile = game.profile;
        if (profile?.mode === PLAY_MODE.openWorld) {
            this.armOpenSpaceStorms();
            return;
        }

        const named = profile?.setPieceEncounterIds;
        if (named?.length) {
            this.armNamed(named);
            return;
        }

        const count = profile?.encounterCount ?? 0;
        if (count <= 0) return;

        const recipes = pickEncounterRecipes({
            types: profile.descriptor?.types ?? [],
            focusType: profile.focusType,
            pairTheme: profile.pairTheme,
            count,
            level: profile.level,
        });
        const anchors = count === 1 ? [0.42] : [0.32, 0.68];
        recipes.forEach((recipe, i) => {
            const at = clamp01(anchors[i] + jitterFor(profile.level, i));
            this.schedule.push({ at: Math.min(0.88, Math.max(0.15, at)), recipe, fired: false });
        });
    }

    /** Place the named recipes evenly through the run, e.g. at 1/4, 1/2, 3/4. */
    armNamed(ids) {
        const recipes = ids
            .map((id) => ENCOUNTER_CATALOG.find((recipe) => recipe.id === id))
            .filter(Boolean);
        const step = 1 / (recipes.length + 1);
        recipes.forEach((recipe, i) => {
            this.schedule.push({ at: step * (i + 1), recipe, fired: false });
        });
    }

    armOpenSpaceStorms() {
        this.kmMode = true;
        const marks = openSpaceStormMarks(OPEN_WORLD_UNLOCKS);
        let lastFamily = null;
        marks.forEach((atKm, i) => {
            const recipes = pickStormRecipes(atKm, i, lastFamily);
            recipes.forEach((recipe) => {
                this.schedule.push({ atKm, recipe, fired: false });
                lastFamily = recipe.family;
            });
        });
    }

    get isLive() {
        return this.live != null;
    }

    cursorKm(manager) {
        const game = manager.game;
        const dy = game.camera.y - manager.nextSpawnY;
        const ahead = game.config.kmDelta(Math.abs(dy), game.height);
        return game.score + ahead;
    }

    wouldStart(manager) {
        if (this.live || this.schedule.length === 0 || this.quietUntilY != null) return false;
        if (this.kmMode) {
            const km = this.cursorKm(manager);
            return this.schedule.some((slot) => !slot.fired && km >= slot.atKm);
        }
        const progress = this.spawnProgress(manager);
        if (progress > 0.9) return false;
        return this.schedule.some((slot) => !slot.fired && progress >= slot.at);
    }

    inQuietZone(y) {
        if (this.quietUntilY == null) return false;
        if (y <= this.quietUntilY) {
            this.quietUntilY = null;
            return false;
        }
        return true;
    }

    spawnProgress(manager) {
        const game = manager.game;
        const goal = game.profile?.goalScore;
        if (!Number.isFinite(goal) || goal <= 0) return 0;
        const dy = game.camera.y - manager.nextSpawnY;
        const ahead = game.config.kmDelta(Math.abs(dy), game.height);
        return clamp01((game.score + ahead) / goal);
    }

    beginQuiet(manager, frac) {
        const height = manager.game.height;
        this.quietUntilY = manager.nextSpawnY - height * (frac ?? 0.5);
    }

    /**
     * If a gauntlet should play on this row, spawn its next beat and return true
     * so the regular random row does not also fire.
     */
    playIfNeeded(manager) {
        if (this.schedule.length === 0) return false;
        if (this.quietUntilY != null) return false;

        if (!this.live) {
            if (this.kmMode) {
                const km = this.cursorKm(manager);
                const next = this.schedule.find((slot) => !slot.fired && km >= slot.atKm);
                if (!next) return false;
                next.fired = true;
                this.live = { recipe: next.recipe, beat: 0, atKm: next.atKm };
            } else {
                const progress = this.spawnProgress(manager);
                if (progress > 0.9) return false;
                const next = this.schedule.find((slot) => !slot.fired && progress >= slot.at);
                if (!next) return false;
                next.fired = true;
                this.live = { recipe: next.recipe, beat: 0, atKm: null };
            }
        }

        while (this.live) {
            const live = this.live;
            const beat = live.recipe.beats[live.beat];
            if (!beat) {
                this.finishRecipe(manager, live.atKm);
                return true;
            }
            // Ordinary rows may spawn until the piece this recipe spawned has left.
            if (beat.kind === 'accompany' && this.anchorsOccupy(manager)) return false;

            live.beat += 1;
            const last = live.beat >= live.recipe.beats.length;

            if (beat.kind === 'gap') {
                this.beginQuiet(manager, this.gapFrac(beat.frac, last, live.atKm));
                if (last) this.live = null;
                return true;
            }

            if (beat.kind === 'spawn' && beat.slots) {
                const before = manager.obstacles.length;
                manager.spawnPlannedRow({ slots: beat.slots });
                live.anchors = manager.obstacles.slice(before)
                    .filter((obstacle) => isSetPiece(demandTypeOf(obstacle)));
            }

            if (beat.kind === 'accompany' && !last) continue;

            if (last) this.finishRecipe(manager, live.atKm);
            return true;
        }
        return false;
    }

    finishRecipe(manager, atKm) {
        this.beginQuiet(manager, this.endQuietFrac(atKm));
        this.live = null;
    }

    /** True while a set piece this recipe spawned still overlaps the view. */
    anchorsOccupy(manager) {
        const { camera, height } = manager.game;
        const viewTop = camera.y - height * 0.6;
        const viewBottom = camera.y + height;
        return (this.live?.anchors || []).some((obstacle) => {
            if (obstacle.retired || !manager.obstacles.includes(obstacle)) return false;
            const top = obstacle.claim?.top ?? obstacle.y - (obstacle.size || 0);
            const bottom = obstacle.claim?.bottom ?? obstacle.y + (obstacle.size || 0);
            return bottom > viewTop && top < viewBottom;
        });
    }

    hasChainedStorm(atKm) {
        if (!this.kmMode || atKm == null) return false;
        return this.schedule.some((slot) => !slot.fired && slot.atKm === atKm);
    }

    gapFrac(frac, last, atKm) {
        let value = Number(frac) || 0;
        if (this.kmMode) value = Math.min(value, OPEN_SPACE_STORM_GAP_CAP);
        if (last && this.kmMode) {
            return Math.min(value, this.endQuietFrac(atKm));
        }
        return value;
    }

    endQuietFrac(atKm) {
        if (!this.kmMode) {
            const level = this.game.profile?.level ?? 0;
            return level >= DEEP_FROM_LEVEL ? 0.56 : 0.5;
        }
        return stormQuietFrac(this.hasChainedStorm(atKm), atKm);
    }
}
