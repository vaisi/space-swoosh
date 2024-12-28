export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30; // Minimum distance for a swipe
        
        // Add touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keep keyboard controls for desktop
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.touchStartX) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        
        // Update spacecraft movement based on swipe direction
        if (deltaX > this.minSwipeDistance) {
            this.game.spacecraft.move('right');
        } else if (deltaX < -this.minSwipeDistance) {
            this.game.spacecraft.move('left');
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.touchStartX = null;
        this.touchStartY = null;
        this.game.spacecraft.stopMoving();
    }

    // Keep existing keyboard handlers
    handleKeyDown(event) {
        // ... existing keyboard code ...
    }

    handleKeyUp(event) {
        // ... existing keyboard code ...
    }
} 