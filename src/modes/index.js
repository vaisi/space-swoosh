// modes/index.js
// The one place a run profile is built, so Game never has to know which class
// belongs to which mode.
// Changes:
// - Hazard Lab → HazardLabProfile via PLAY_MODE.hazardLab.
// - Created file.

import { OpenWorldProfile, PLAY_MODE } from './RunProfile.js';
import { JourneyProfile } from './JourneyProfile.js';
import { HazardLabProfile } from './HazardLabProfile.js';

export { PLAY_MODE } from './RunProfile.js';

export function createRunProfile(game, mode, level = 1) {
    if (mode === PLAY_MODE.hazardLab) return new HazardLabProfile(game);
    if (mode === PLAY_MODE.journey) return new JourneyProfile(game, level);
    return new OpenWorldProfile(game);
}
