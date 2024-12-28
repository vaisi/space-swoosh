export class InputManager {
    constructor(game) {
        this.game = game;
        this.isTouching = false;
        this.touchIdentifier = null;
        
        const canvas = this.game.canvas;
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isTouching) return; // Only handle first touch
            
            const touch = e.touches[0];
            this.touchIdentifier = touch.identifier;
            
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const centerX = rect.width / 2;
            
            this.isTouching = true;
            
            // Move based on which half of the screen was touched
            if (touchX < centerX) {
                this.game.spacecraft.move('left');
            } else {
                this.game.spacecraft.move('right');
            }
            
            console.log('Touch start:', touchX < centerX ? 'left' : 'right');
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isTouching) return;
            
            // Find our touch
            const touch = Array.from(e.touches).find(t => t.identifier === this.touchIdentifier);
            if (!touch) return;
            
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const centerX = rect.width / 2;
            
            // Update movement based on current position
            if (touchX < centerX) {
                this.game.spacecraft.move('left');
            } else {
                this.game.spacecraft.move('right');
            }
        }, { passive: false });

        const endTouch = (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.touchIdentifier = null;
            this.game.spacecraft.stopMoving();
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