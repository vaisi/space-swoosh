export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        this.currentDirection = null;
        
        // Add touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        
        // Initialize spacecraft if needed (for sound on mobile)
        if (!this.game.soundManager.initialized) {
            this.game.soundManager.initialize();
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.touchStartX) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        
        // Update spacecraft movement based on swipe direction
        const newDirection = deltaX > this.minSwipeDistance ? 'right' : 
                           deltaX < -this.minSwipeDistance ? 'left' : null;
        
        if (newDirection !== this.currentDirection) {
            if (this.currentDirection) {
                this.game.spacecraft.stopMoving();
            }
            if (newDirection) {
                this.game.spacecraft.move(newDirection);
                this.currentDirection = newDirection;
            }
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.touchStartX = null;
        this.touchStartY = null;
        this.currentDirection = null;
        this.game.spacecraft.stopMoving();
    }

    handleKeyDown(event) {
        if (event.repeat) return;

        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
                this.game.spacecraft.move('left');
                break;
            case 'ArrowRight':
            case 'd':
                this.game.spacecraft.move('right');
                break;
            case ' ':
                this.game.spacecraft.activateShield();
                break;
        }

        // Initialize sound on first interaction
        if (!this.game.soundManager.initialized) {
            this.game.soundManager.initialize();
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