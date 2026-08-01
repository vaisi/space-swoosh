// InputHandler.js
// Keyboard / touch steering. Only active during an in-progress run.
// Changes:
// - Gate all gameplay input on game.isPlaying() so menu / options / high
//   scores don't steer the ship or toggle pause.

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        
        // Keyboard controls
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup', e => this.handleKeyUp(e));
        
        // Touch controls
        this.setupTouchControls();

        // Prevent default touch behaviors
        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }

    setupTouchControls() {
        this.game.canvas.addEventListener('touchstart', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchStart(e);
        });

        this.game.canvas.addEventListener('touchend', e => {
            if (!this.game.isPlaying()) return;
            this.handleTouchEnd(e);
        });
    }

    handleKeyDown(e) {
        if (!this.game.isPlaying()) return;

        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault(); // Prevent page scrolling
            this.keys[e.code] = true;
            
            // Update spacecraft movement state
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
            if (this.game.isPlaying() && this.game.spacecraft) {
                this.game.spacecraft.stopMovement?.();
            }
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.game.canvas.getBoundingClientRect();
        
        // Calculate touch position relative to canvas
        const touchX = touch.clientX - rect.left;
        const canvasWidth = rect.width;
        
        // Determine which half of the screen was touched
        if (touchX < canvasWidth / 2) {
            // Left side touched
            this.game.spacecraft.startMovement('left');
        } else {
            // Right side touched
            this.game.spacecraft.startMovement('right');
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.game.isPlaying() && this.game.spacecraft) {
            this.game.spacecraft.stopMovement?.();
        }
    }

    isPressed(keyCode) {
        return this.keys[keyCode] || false;
    }
}
