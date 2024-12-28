export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        this.isMoving = false;
        
        // Add touch event listeners to the canvas element specifically
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isMoving = false;
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.touchStartX) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        
        // Update movement based on touch position
        if (Math.abs(deltaX) > this.minSwipeDistance) {
            this.isMoving = true;
            if (deltaX > 0) {
                this.game.spacecraft.move('right');
            } else {
                this.game.spacecraft.move('left');
            }
            // Update start position for continuous movement
            this.touchStartX = touch.clientX;
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (this.isMoving) {
            this.game.spacecraft.stopMoving();
        }
        this.touchStartX = null;
        this.touchStartY = null;
        this.isMoving = false;
    }

    handleKeyDown(event) {
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