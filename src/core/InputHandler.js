// InputHandler.js
// Keyboard / touch steering. Only active during an in-progress run.
// Changes:
// - Gate all gameplay input on game.isPlaying() so menu / options / high
//   scores don't steer the ship or toggle pause.
// - Mobile: swipe/drag left-right steers. A short tap with no drag still uses
//   the old half-screen rule, so both muscle memories work. touchstart only
//   arms the gesture — the arc fires on swipe (touchmove) or tap (touchend).
// - Lower swipe threshold so direction changes commit sooner.

const SWIPE_PX = 12;       // horizontal travel before a swipe commits
const TAP_SLOP_PX = 12;    // max movement still counted as a tap
const VERTICAL_BIAS = 1.15; // |dx| must beat |dy| * this to count as horizontal

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        /** @type {null | { id: number, startX: number, startY: number, originX: number, lastDir: null | 'left' | 'right' }} */
        this.touch = null;

        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup', e => this.handleKeyUp(e));

        this.setupTouchControls();

        // Kill browser pan/zoom over the game surface; journey-map scrolling
        // still works because that listener runs on the canvas too and the map
        // is never isPlaying().
        document.addEventListener('touchmove', e => {
            if (this.game.isPlaying()) e.preventDefault();
        }, { passive: false });
    }

    setupTouchControls() {
        const canvas = this.game.canvas;

        canvas.addEventListener('touchstart', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchStart(e);
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchMove(e);
        }, { passive: false });

        canvas.addEventListener('touchend', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchEnd(e);
        }, { passive: false });

        canvas.addEventListener('touchcancel', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchEnd(e);
        }, { passive: false });
    }

    handleKeyDown(e) {
        if (!this.game.isPlaying()) return;

        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault();
            this.keys[e.code] = true;

            if (e.code === 'ArrowLeft') {
                this.game.spacecraft.startMovement('left');
            } else if (e.code === 'ArrowRight') {
                this.game.spacecraft.startMovement('right');
            }
        }
        // Space / pause is handled once in Game.setupPauseButton.
    }

    handleKeyUp(e) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            this.keys[e.code] = false;
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const t = e.changedTouches[0] || e.touches[0];
        if (!t) return;

        // One finger owns the gesture; ignore extras.
        if (this.touch) return;

        this.touch = {
            id: t.identifier,
            startX: t.clientX,
            startY: t.clientY,
            originX: t.clientX,
            lastDir: null,
        };
    }

    handleTouchMove(e) {
        if (!this.touch) return;
        e.preventDefault();

        const t = this.findTouch(e.touches, this.touch.id);
        if (!t) return;

        const dx = t.clientX - this.touch.originX;
        const dy = t.clientY - this.touch.startY;

        if (Math.abs(dx) < SWIPE_PX) return;
        // Ignore mostly-vertical drags (thumb rest / accidental scroll).
        if (Math.abs(dx) < Math.abs(dy) * VERTICAL_BIAS) return;

        const dir = dx < 0 ? 'left' : 'right';

        if (this.touch.lastDir !== dir) {
            this.steer(dir);
            this.touch.lastDir = dir;
            // Re-anchor so dragging back the other way can reverse cleanly.
            this.touch.originX = t.clientX;
            return;
        }

        // Finger held past the end of an arc in the same direction — keep banking.
        if (!this.game.spacecraft?.moveState) {
            this.steer(dir);
        }
    }

    handleTouchEnd(e) {
        if (!this.touch) return;
        e.preventDefault();

        const t = this.findTouch(e.changedTouches, this.touch.id) || e.changedTouches[0];
        const gesture = this.touch;
        this.touch = null;

        if (!t || !this.game.isPlaying()) return;

        // No swipe committed → classic half-screen tap.
        if (gesture.lastDir) return;

        const dx = t.clientX - gesture.startX;
        const dy = t.clientY - gesture.startY;
        if (Math.hypot(dx, dy) > TAP_SLOP_PX) return;

        const rect = this.game.canvas.getBoundingClientRect();
        const touchX = t.clientX - rect.left;
        this.steer(touchX < rect.width / 2 ? 'left' : 'right');
    }

    steer(direction) {
        if (!this.game.isPlaying() || !this.game.spacecraft) return;
        this.game.spacecraft.startMovement(direction);
    }

    findTouch(list, id) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].identifier === id) return list[i];
        }
        return null;
    }

    isPressed(keyCode) {
        return this.keys[keyCode] || false;
    }
}
