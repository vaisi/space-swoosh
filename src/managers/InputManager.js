export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        this.isMoving = false;
        
        // Get both canvas and container
        this.canvas = document.getElementById('gameCanvas');
        this.container = document.getElementById('gameContainer');
        
        // Add touch events to both canvas and container
        [this.canvas, this.container].forEach(element => {
            element.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            element.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            element.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            element.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        });

        // Debug logging
        console.log('Input Manager initialized');
        
        // Keyboard controls for desktop
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleTouchStart(e) {
        // Prevent default only if it's a game interaction
        if (e.target === this.canvas || e.target === this.container) {
            e.preventDefault();
        }
        
        const touch = e.touches[0];
        this.touchStartX = touch.pageX; // Using pageX instead of clientX
        this.touchStartY = touch.pageY;
        this.isMoving = false;
        
        console.log('Touch Start detected:', { x: this.touchStartX, y: this.touchStartY });
    }

    handleTouchMove(e) {
        if (!this.touchStartX) return;
        
        // Prevent default only if it's a game interaction
        if (e.target === this.canvas || e.target === this.container) {
            e.preventDefault();
        }

        const touch = e.touches[0];
        const deltaX = touch.pageX - this.touchStartX;
        
        console.log('Touch Move:', { deltaX });

        if (Math.abs(deltaX) > this.minSwipeDistance) {
            const direction = deltaX > 0 ? 'right' : 'left';
            
            if (!this.isMoving) {
                this.isMoving = true;
                console.log('Starting movement:', direction);
                this.game.spacecraft.startMovement(direction);
            }
            
            this.touchStartX = touch.pageX;
        }
    }

    handleTouchEnd(e) {
        // Prevent default only if it's a game interaction
        if (e.target === this.canvas || e.target === this.container) {
            e.preventDefault();
        }
        
        if (this.isMoving) {
            console.log('Stopping movement');
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