export class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = null;
        this.touchStartY = null;
        this.minSwipeDistance = 10;
        this.currentDirection = null;
        this.isTouching = false;
        
        // Get canvas and its container
        const canvas = this.game.canvas;
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            this.touchStartX = touch.clientX - rect.left;
            this.isTouching = true;
            console.log('Touch start at:', this.touchStartX);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isTouching) return;

            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const currentX = touch.clientX - rect.left;
            const deltaX = currentX - this.touchStartX;
            
            console.log('Touch move delta:', deltaX);

            // More responsive movement
            if (Math.abs(deltaX) > this.minSwipeDistance) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.game.spacecraft.move(direction);
                // Update reference point for continuous movement
                this.touchStartX = currentX;
            }
        }, { passive: false });

        const endTouch = (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.touchStartX = null;
            this.game.spacecraft.stopMoving();
            console.log('Touch end');
        };

        canvas.addEventListener('touchend', endTouch, { passive: false });
        canvas.addEventListener('touchcancel', endTouch, { passive: false });
        
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
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