export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 20;
        this.currentDirection = null;
        this.isTouching = false;
        
        // Add touch event listeners to the canvas specifically
        const canvas = this.game.canvas;
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Debug touch events
        this.debug = true; // Set to true to help debug mobile controls
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouching = true;
        
        if (this.debug) console.log('Touch start:', this.touchStartX, this.touchStartY);
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.isTouching) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        
        if (this.debug) console.log('Touch move delta:', deltaX);
        
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
        if (this.debug) console.log('Touch end');
        
        this.touchStartX = null;
        this.touchStartY = null;
        this.currentDirection = null;
        this.isTouching = false;
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
        }
    }
} 