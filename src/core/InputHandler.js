export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.touchStartX = null;
        this.touchStartY = null;
        this.lastTouchX = null;
        this.swipeThreshold = 10;
        this.touchVelocity = 0;
        
        // Keyboard controls
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup', e => this.handleKeyUp(e));
        
        // Touch controls - only add these if game is not over
        this.setupTouchControls();

        // Prevent default touch behaviors
        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }

    setupTouchControls() {
        this.game.canvas.addEventListener('touchstart', e => {
            if (this.game.isGameOver) return; // Don't handle gameplay touches if game is over
            this.handleTouchStart(e);
        });

        this.game.canvas.addEventListener('touchmove', e => {
            if (this.game.isGameOver) return;
            this.handleTouchMove(e);
        });

        this.game.canvas.addEventListener('touchend', e => {
            if (this.game.isGameOver) return;
            this.handleTouchEnd(e);
        });
    }

    handleKeyDown(e) {
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
        
        // Change spacebar to toggle pause
        if (e.code === 'Space') {
            e.preventDefault();
            this.game.togglePause();
        }
    }

    handleKeyUp(e) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            this.keys[e.code] = false;
            // Only call stopMovement if game is not over and spacecraft exists
            if (!this.game.gameOver && this.game.spacecraft) {
                this.game.spacecraft.stopMovement();
            }
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.touchVelocity = 0;

        // Remove double tap detection for shield
        // const now = Date.now();
        // if (this.lastTap && (now - this.lastTap) < 300) {
        //     this.game.spacecraft.activateShield();
        //     this.lastTap = null;
        // } else {
        //     this.lastTap = now;
        // }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.touchStartX) return;

        const touch = e.touches[0];
        const currentX = touch.clientX;
        
        // Calculate velocity based on movement since last frame
        if (this.lastTouchX !== null) {
            const deltaX = currentX - this.lastTouchX;
            this.touchVelocity = deltaX;

            // More responsive movement based on velocity
            if (Math.abs(this.touchVelocity) > this.swipeThreshold) {
                if (this.touchVelocity < 0) {
                    this.game.spacecraft.startMovement('left');
                } else {
                    this.game.spacecraft.startMovement('right');
                }
            }
        }

        this.lastTouchX = currentX;
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.game.gameOver && this.game.spacecraft) {
            this.game.spacecraft.stopMovement();
        }
        this.touchStartX = null;
        this.touchStartY = null;
        this.lastTouchX = null;
        this.touchVelocity = 0;
    }

    isPressed(keyCode) {
        return this.keys[keyCode] || false;
    }
} 