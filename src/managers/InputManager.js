export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        this.isMoving = false;
        
        // Get canvas element
        const canvas = document.getElementById('gameCanvas');
        
        // Add touch event listeners with proper binding and options
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // Add tap detection for shield
        this.lastTap = 0;
        this.doubleTapDelay = 300; // ms between taps
        
        // Keyboard controls for desktop
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Debug flag
        this.debug = true;
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isMoving = false;

        // Handle double tap for shield
        const currentTime = Date.now();
        const tapLength = currentTime - this.lastTap;
        if (tapLength < this.doubleTapDelay) {
            this.game.spacecraft.activateShield();
            event.preventDefault();
        }
        this.lastTap = currentTime;

        if (this.debug) console.log('Touch Start:', this.touchStartX, this.touchStartY);
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.touchStartX) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        
        // If we've moved far enough horizontally
        if (Math.abs(deltaX) > this.minSwipeDistance) {
            const direction = deltaX > 0 ? 'right' : 'left';
            
            // Only start a new movement if we're not already moving
            if (!this.isMoving) {
                this.isMoving = true;
                this.game.spacecraft.startMovement(direction);
                if (this.debug) console.log('Starting movement:', direction);
            }
            
            // Update touch start position for continuous movement
            this.touchStartX = touch.clientX;
        }

        if (this.debug) console.log('Touch Move:', deltaX);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (this.isMoving) {
            this.game.spacecraft.stopMoving();
            if (this.debug) console.log('Stopping movement');
        }
        this.touchStartX = null;
        this.touchStartY = null;
        this.isMoving = false;
    }

    handleKeyDown(event) {
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
                this.game.spacecraft.startMovement('left');
                break;
            case 'ArrowRight':
            case 'd':
                this.game.spacecraft.startMovement('right');
                break;
            case ' ':
                this.game.spacecraft.activateShield();
                break;
        }
    }

    handleKeyUp(event) {
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'ArrowRight':
            case 'd':
                this.game.spacecraft.stopMoving();
                break;
            case ' ':
                this.game.spacecraft.deactivateShield();
                break;
        }
    }
} 