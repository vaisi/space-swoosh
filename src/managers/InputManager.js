export class InputManager {
    constructor(game) {
        this.game = game;
        this.isTouching = false;
        
        const canvas = this.game.canvas;
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const centerX = rect.width / 2;
            
            // Move based on which half of the screen was touched
            if (touchX < centerX) {
                this.game.spacecraft.move('left');
            } else {
                this.game.spacecraft.move('right');
            }
            
            this.isTouching = true;
            console.log('Touch start:', touchX < centerX ? 'left' : 'right');
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.game.spacecraft.stopMoving();
            console.log('Touch end');
        }, { passive: false });

        canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.game.spacecraft.stopMoving();
        }, { passive: false });
        
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