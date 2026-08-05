// perfFlags.js
// URL / query-string flags for Phase 0 frame diagnostics and Phase 1 cheap Canvas.
// Changes:
// - Created: ?perf=1 overlay; ?nodraw=1 / ?drawonly=1; ?kill=trails,glows,hud,
//   hulls,obstacles; ?fullvfx=1 disables iOS draw LOD; ?cheap=0|1; ?dpr=N.

/**
 * @typedef {object} PerfFlags
 * @property {boolean} perf
 * @property {boolean} noDraw
 * @property {boolean} drawOnly
 * @property {Set<string>} kill
 * @property {boolean} fullVfx
 * @property {boolean|null} cheap  force cheap Canvas on/off; null = auto (iOS)
 * @property {number|null} dprOverride
 */

/** @returns {PerfFlags} */
export function parsePerfFlags(search = typeof location !== 'undefined' ? location.search : '') {
    const params = new URLSearchParams(search);
    const killRaw = params.get('kill') || '';
    const kill = new Set(
        killRaw
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
    );

    let cheap = null;
    if (params.has('cheap')) {
        const v = params.get('cheap');
        cheap = v === '0' || v === 'false' ? false : true;
    }

    let dprOverride = null;
    if (params.has('dpr')) {
        const n = Number(params.get('dpr'));
        if (Number.isFinite(n) && n > 0 && n <= 3) dprOverride = n;
    }

    return {
        perf: params.has('perf'),
        noDraw: params.has('nodraw'),
        drawOnly: params.has('drawonly'),
        kill,
        fullVfx: params.has('fullvfx'),
        cheap,
        dprOverride,
    };
}

/** @param {PerfFlags} flags @param {string} name */
export function isKilled(flags, name) {
    return flags?.kill?.has(name) === true;
}
