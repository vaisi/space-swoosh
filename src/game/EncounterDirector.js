// EncounterDirector.js
// Schedules 1–2 authored gauntlets on Journey 20+ and plays them beat-by-beat
// when the spawn cursor reaches those points in the level. Speed is untouched.
// Changes:
// - Picker in EncounterCatalog enforces different families for 2nd spikes.
// - Created file: progress-based encounter windows, quiet-zone breathing room.

import { clamp01 } from '../utils/math.js';
import { pickEncounterRecipes } from '../config/EncounterCatalog.js';

function jitterFor(level, index) {
    const seed = ((level || 1) * 997 + (index + 3) * 7919) % 1000;
    return (seed / 1000 - 0.5) * 0.08;
}

export class EncounterDirector {
    constructor(game) {
        this.game = game;
        this.schedule = [];
        this.live = null;
        this.quietUntilY = null;

        const profile = game.profile;
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

    get isLive() {
        return this.live != null;
    }

    wouldStart(manager) {
        if (this.live || this.schedule.length === 0 || this.quietUntilY != null) return false;
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
            const progress = this.spawnProgress(manager);
            if (progress > 0.9) return false;
            const next = this.schedule.find((slot) => !slot.fired && progress >= slot.at);
            if (!next) return false;
            next.fired = true;
            this.live = { recipe: next.recipe, beat: 0 };
        }

        const live = this.live;
        const beat = live.recipe.beats[live.beat];
        live.beat += 1;
        const last = live.beat >= live.recipe.beats.length;

        if (beat.kind === 'gap') {
            this.beginQuiet(manager, beat.frac);
            if (last) this.live = null;
            return true;
        }

        if (beat.kind === 'spawn' && beat.slots) {
            manager.spawnPlannedRow({ slots: beat.slots });
        }

        if (last) {
            this.beginQuiet(manager, 0.5);
            this.live = null;
        }
        return true;
    }
}
