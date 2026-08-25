// EncounterDirector.js
// Schedules authored catalog recipes: 1–2 Journey spikes (progress of the
// goal) or Open Space storms (absolute KM). Speed is untouched.
// Changes:
// - Open Space storms: short quiet (0.18) after a patch; dual recipes at the
//   same KM chain (0.08) instead of two half-screen holes. Recipe gaps cap at 0.28.
// - Open Space: KM-anchored storms at unlock marks, then every 1500 KM after 5k;
//   dual-family patches after 12.5k.
// - Journey 6+ one spike; 25+ two different families.
// - Created file: progress-based encounter windows, quiet-zone breathing room.

import { clamp01 } from '../utils/math.js';
import { pickEncounterRecipes } from '../config/EncounterCatalog.js';
import {
    openSpaceStormMarks,
    stormCountAt,
    stormQuietFrac,
    typesAtKm,
    weatherAt,
    OPEN_SPACE_STORM_GAP_CAP,
} from '../config/OpenSpaceWeather.js';
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

        const live = this.live;
        const beat = live.recipe.beats[live.beat];
        live.beat += 1;
        const last = live.beat >= live.recipe.beats.length;

        if (beat.kind === 'gap') {
            this.beginQuiet(manager, this.gapFrac(beat.frac, last, live.atKm));
            if (last) this.live = null;
            return true;
        }

        if (beat.kind === 'spawn' && beat.slots) {
            manager.spawnPlannedRow({ slots: beat.slots });
        }

        if (last) {
            this.beginQuiet(manager, this.endQuietFrac(live.atKm));
            this.live = null;
        }
        return true;
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
        if (!this.kmMode) return 0.5;
        return stormQuietFrac(this.hasChainedStorm(atKm));
    }
}
