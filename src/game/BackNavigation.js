// BackNavigation.js
// One definition of "go back one step", shared by Android's hardware back
// button and the Escape key.
// Changes:
// - Journey map back uses goToModeSelect() so Play card blurbs re-roll.
// - Logbook screen retreats to the main menu.
// - Level-clear flyout swallows back (no skip) until the outcome screen is up.
// - Created file: the back target for each screen used to exist only inside the
//   click handlers in Game.js, spread across a dozen branches. Android's
//   hardware back needs the same map, and duplicating it there would guarantee
//   the two drift. Lives outside Game.js because that file is already long.

/**
 * Where each screen retreats to. Mirrors the on-screen Back control exactly, so
 * hardware back and the drawn control can never disagree.
 * @type {Record<string, string>}
 */
const PARENT_SCREEN = {
    modeSelect: 'menu',
    journeyMap: 'modeSelect',
    logbook: 'menu',
    options: 'menu',
    optionsShip: 'options',
    optionsControls: 'options',
    optionsSound: 'options',
};

/**
 * Retreat one step.
 *
 * @param {import('./Game.js').Game} game
 * @returns {boolean} `false` when there is nowhere left to go — the caller
 *   decides what that means (on Android, exiting the app).
 */
export function goBack(game) {
    // Flyout is not skippable — consume back so it cannot leave the run early.
    if (game.levelClear?.active) {
        return true;
    }

    // The submit-score modal is layered over the end screen, so it goes first.
    if (game.pendingHighScore?.shouldPromptName) {
        game.closeNameInputModal();
        return true;
    }

    if (game.appScreen === 'playing') {
        // Mid-run, back opens the pause menu; with it open, back resumes.
        // Exiting a run stays an explicit choice inside that menu — losing a
        // run to a stray back press would be infuriating.
        if (game.isPlaying()) {
            game.togglePause();
            return true;
        }
        return true;
    }

    if (game.appScreen === 'highscores') {
        if (game.highScoresReturnScreen === 'gameover') {
            game.appScreen = 'gameover';
            game.gameOverScreen = 'main';
            game.updatePauseButtonVisibility();
        } else {
            game.showMenu();
        }
        return true;
    }

    if (game.appScreen === 'gameover') {
        // The nested leaderboard inside the end screen is its own layer.
        if (game.gameOverScreen === 'highscores') {
            game.gameOverScreen = 'main';
            return true;
        }
        if (game.isJourney()) {
            game.goToJourneyMap();
        } else {
            game.goToMenu();
        }
        return true;
    }

    const parent = PARENT_SCREEN[game.appScreen];
    if (parent) {
        if (parent === 'modeSelect') {
            game.goToModeSelect();
            return true;
        }
        game.appScreen = parent;
        game.updatePauseButtonVisibility();
        return true;
    }

    // Already at the main menu.
    return false;
}
