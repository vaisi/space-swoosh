export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 30;
        this.isMoving = false;
        
        // Add touch events at document level
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        document.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        console.log('Input Manager initialized');
    }

    handleTouchStart(e) {
        e.preventDefault();  // Always prevent default
        const touch = e.touches[0];
        this.touchStartX = touch.pageX;
        this.touchStartY = touch.pageY;
        this.isMoving = false;
        
        console.log('Touch Start detected:', { x: this.touchStartX, y: this.touchStartY });
    }

    handleTouchMove(e) {
        if (!this.touchStartX) return;
        
        e.preventDefault();  // Always prevent default
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
        e.preventDefault();  // Always prevent default
        
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