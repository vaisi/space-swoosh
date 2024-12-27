export class InputHandler {
    constructor(game) {
        this.game = game;
        this.setupKeyboardControls();
        this.setupTouchControls();
    }

    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            // Always allow space for pause toggle
            if (e.code === 'Space') {
                e.preventDefault();
                this.game.togglePause();
                return;
            }

            // Ignore other inputs while paused
            if (this.game.isPaused) return;

            switch(e.key) {
                case 'ArrowLeft':
                    this.game.spacecraft.startMovement('left');
                    break;
                case 'ArrowRight':
                    this.game.spacecraft.startMovement('right');
                    break;
            }
        });
    }

    setupTouchControls() {
        const canvas = this.game.canvas;
        
        // Handle touch start
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        });

        // Handle touch move
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchStartX) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            
            // Check if swipe is long enough
            if (Math.abs(deltaX) > this.minSwipeDistance) {
                if (deltaX > 0) {
                    this.game.spacecraft.startMovement('right');
                } else {
                    this.game.spacecraft.startMovement('left');
                }
                // Reset touch start to prevent multiple triggers
                this.touchStartX = null;
            }
        });

        // Handle touch end
        canvas.addEventListener('touchend', () => {
            this.touchStartX = null;
            this.touchStartY = null;
        });

        // Prevent default touch behaviors
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
} 