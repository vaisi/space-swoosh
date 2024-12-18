export class SoundManager {
    constructor() {
        this.sounds = {
            bgm: new Audio('/sounds/bgm.mp3'),
            shield: new Audio('/sounds/shield.mp3'),
            explosion: new Audio('/sounds/explosion.mp3'),
            powerup: new Audio('/sounds/powerup.mp3'),
            move: new Audio('/sounds/move.mp3')
        };

        // Set up background music
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.2;

        // Set up sound effects volumes
        this.sounds.shield.volume = 0.3;
        this.sounds.explosion.volume = 0.4;
        this.sounds.powerup.volume = 0.3;
        this.sounds.move.volume = 0.15;

        // Flag to track if sounds are initialized
        this.initialized = false;
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
        this.sounds.shield.currentTime = 0;
        this.sounds.shield.play().catch(() => {});
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
} 