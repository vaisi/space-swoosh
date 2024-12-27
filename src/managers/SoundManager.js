export class SoundManager {
    constructor() {
        this.sounds = {
            bgm: new Audio('sounds/bgm.mp3'),
            shield: new Audio('sounds/shield.mp3'),
            explosion: new Audio('sounds/explosion.mp3'),
            powerup: new Audio('sounds/powerup.mp3'),
            move: new Audio('sounds/move.mp3'),
            turn: new Audio('sounds/turn.mp3'),
            shieldCrash: new Audio('sounds/crash_with_shield.mp3')
        };

        // Set up background music
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.2;

        // Set up sound effects volumes
        this.sounds.shield.volume = 0.4;
        this.sounds.explosion.volume = 0.4;
        this.sounds.powerup.volume = 0.3;
        this.sounds.move.volume = 0.15;
        this.sounds.turn.volume = 0.3;

        // Set shield crash sound volume
        this.sounds.shieldCrash.volume = 0.4;

        // Flag to track if sounds are initialized
        this.initialized = false;

        // Add error handling for sound loading
        Object.values(this.sounds).forEach(sound => {
            sound.addEventListener('error', (e) => {
                console.error('Error loading sound:', e);
            });
        });
    }

    initialize() {
        if (this.initialized) return;
        
        // Create initial silent play for all sounds (needed for mobile)
        Object.values(this.sounds).forEach(sound => {
            sound.play().catch(() => {});
            sound.pause();
            sound.currentTime = 0;
        });

        this.initialized = true;
    }

    playBGM() {
        this.sounds.bgm.play().catch(() => {});
    }

    stopBGM() {
        this.sounds.bgm.pause();
        this.sounds.bgm.currentTime = 0;
    }

    playShield() {
        if (!this.initialized) return;
        
        try {
            const shieldSound = this.sounds.shield;
            shieldSound.currentTime = 0;
            const playPromise = shieldSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing shield sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playShield:", error);
        }
    }

    playExplosion() {
        this.sounds.explosion.currentTime = 0;
        this.sounds.explosion.play().catch(() => {});
    }

    playPowerup() {
        this.sounds.powerup.currentTime = 0;
        this.sounds.powerup.play().catch(() => {});
    }

    playMove() {
        if (!this.sounds.move.playing) {
            this.sounds.move.currentTime = 0;
            this.sounds.move.play().catch(() => {});
        }
    }

    playTurn() {
        if (!this.initialized) return;
        
        try {
            const turnSound = this.sounds.turn;
            turnSound.currentTime = 0;
            const playPromise = turnSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing turn sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playTurn:", error);
        }
    }

    playShieldCrash() {
        if (!this.initialized) return;
        
        try {
            const crashSound = this.sounds.shieldCrash;
            crashSound.currentTime = 0;
            const playPromise = crashSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing shield crash sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playShieldCrash:", error);
        }
    }
} 