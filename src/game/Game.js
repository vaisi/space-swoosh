import { Spacecraft } from '../entities/Spacecraft.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { Camera } from '../core/Camera.js';
import { InputHandler } from '../core/InputHandler.js';
import { MilestoneManager } from '../managers/MilestoneManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { SoundManager } from '../managers/SoundManager.js';

export class Game {
    constructor(config) {
        console.log('Game initializing...'); // Debug log
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.baseUnit = 0;
        this.score = 0;
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.explosionParticles = [];
        this.gameOverScreen = 'main'; // 'main' or 'highscores'
        
        this.setupCanvas();
        this.initializeGame();
        
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupEventListeners();
        this.powerUpManager = new PowerUpManager(this);
        this.soundManager = new SoundManager();
        
        // Initialize sound on first user interaction
        window.addEventListener('click', () => {
            this.soundManager.initialize();
            this.soundManager.playBGM();
        }, { once: true });
    }

    setupCanvas() {
        console.log('Setting up canvas...');
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Adjust base unit based on screen size
        const isMobile = window.innerWidth <= 768;
        this.baseUnit = isMobile ? 
            Math.min(containerWidth / 30, containerHeight / 50) : 
            containerWidth / 50;
        
        console.log('Base unit:', this.baseUnit);
    }

    initializeGame() {
        console.log('Initializing game components...'); // Debug log
        this.camera = new Camera(this);
        this.spacecraft = new Spacecraft(this);
        this.obstacleManager = new ObstacleManager(this);
        this.inputHandler = new InputHandler(this);
        this.milestoneManager = new MilestoneManager(this);
    }

    start() {
        this.gameLoop();
    }

    gameLoop() {
        // Clear with beige background
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update game state
        this.update();
        // Render game
        this.render();
        
        // Continue the game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        const currentTime = performance.now();
        
        if (this.isGameOver) {
            const timeSinceGameOver = currentTime - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;
            
            if (timeSinceGameOver < deceleration) {
                // Gradually slow down camera during deceleration period
                const slowdownFactor = 1 - (timeSinceGameOver / deceleration);
                this.camera.update(slowdownFactor);
            }
        } else {
            this.camera.update(1);
            this.spacecraft.update();
            this.obstacleManager.update();
            this.milestoneManager.update();
            this.updateScore();
        }
        
        this.updateExplosion();
        this.powerUpManager.update();
    }

    render() {
        if (this.isGameOver) {
            const timeSinceGameOver = performance.now() - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;
            
            // Draw beige background
            this.ctx.fillStyle = '#E1D9C1';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // During explosion animation
            if (timeSinceGameOver < deceleration) {
                // Render explosion particles
                for (const particle of this.explosionParticles) {
                    this.ctx.fillStyle = `rgba(0, 0, 0, ${particle.opacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        particle.x,
                        this.camera.getRelativeY(particle.y),
                        particle.size,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }

                // Start fading to black near the end
                if (timeSinceGameOver > deceleration * 0.7) {
                    const fadeProgress = (timeSinceGameOver - deceleration * 0.7) / (deceleration * 0.3);
                    this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }
            } else {
                // After explosion, show black background with new game over screen
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                if (this.gameOverScreen === 'main') {
                    this.renderMainGameOver();
                } else if (this.gameOverScreen === 'highscores') {
                    this.renderHighScores();
                }
            }
        } else {
            // Normal gameplay rendering
            this.ctx.fillStyle = '#E1D9C1';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.obstacleManager.render(this.ctx);
            
            if (this.spacecraft.isVisible) {
                this.spacecraft.render(this.ctx);
            }

            this.milestoneManager.render(this.ctx);

            // Score display during gameplay
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${this.baseUnit * 2}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `Score: ${Math.floor(this.score)}`,
                this.baseUnit * 2,
                this.baseUnit * 3
            );
        }

        this.powerUpManager.render(this.ctx);
    }

    renderMainGameOver() {
        const centerX = this.canvas.width / 2;
        const spacing = this.baseUnit * 4;
        let currentY = this.canvas.height * 0.3;

        // Game Over Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${this.baseUnit * 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', centerX, currentY);
        
        currentY += spacing * 1.5;

        // Final Score
        this.ctx.font = `${this.baseUnit * 2}px Arial`;
        this.ctx.fillText(
            `Distance: ${Math.floor(this.finalScore)} units`,
            centerX,
            currentY
        );
        
        currentY += spacing * 1.5;

        // Buttons
        const buttonWidth = this.baseUnit * 12;
        const buttonHeight = this.baseUnit * 3;
        const buttonY = currentY;

        // Play Again Button
        this.drawButton(
            centerX - buttonWidth - this.baseUnit,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Play Again',
            '#4CAF50'
        );

        // High Scores Button
        this.drawButton(
            centerX + this.baseUnit,
            buttonY,
            buttonWidth,
            buttonHeight,
            'High Scores',
            '#2196F3'
        );

        // Store button positions for click handling
        this.gameOverButtons = {
            playAgain: {
                x: centerX - buttonWidth - this.baseUnit,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            },
            highScores: {
                x: centerX + this.baseUnit,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            }
        };
    }

    renderHighScores() {
        const centerX = this.canvas.width / 2;
        let currentY = this.canvas.height * 0.2;

        // High Scores Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${this.baseUnit * 3}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HIGH SCORES', centerX, currentY);
        
        currentY += this.baseUnit * 4;

        // Scores List
        if (this.highScores && this.highScores.length > 0) {
            this.ctx.font = `${this.baseUnit * 2}px Arial`;
            
            this.highScores.slice(0, 5).forEach((score, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
                const text = `${medal} ${score.player_name}`;
                const scoreText = `${score.score}`;
                
                // Draw rank and name (left-aligned)
                this.ctx.textAlign = 'left';
                this.ctx.fillText(
                    text,
                    centerX - this.baseUnit * 10,
                    currentY + (index * this.baseUnit * 3)
                );
                
                // Draw score (right-aligned)
                this.ctx.textAlign = 'right';
                this.ctx.fillText(
                    scoreText,
                    centerX + this.baseUnit * 10,
                    currentY + (index * this.baseUnit * 3)
                );
            });
        } else {
            this.ctx.fillText('No scores yet!', centerX, currentY);
        }

        // Back Button
        const buttonWidth = this.baseUnit * 10;
        const buttonHeight = this.baseUnit * 3;
        const buttonY = this.canvas.height * 0.8;

        this.drawButton(
            centerX - buttonWidth / 2,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Back',
            '#FF5722'
        );

        // Store button position
        this.highScoresBackButton = {
            x: centerX - buttonWidth / 2,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    drawButton(x, y, width, height, text, color) {
        // Button background
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, height / 4);
        this.ctx.fill();

        // Button text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `bold ${this.baseUnit * 1.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + width / 2, y + height / 2);
    }

    updateScore() {
        // Calculate score based on camera's total distance instead of spacecraft position
        this.score = Math.floor(Math.abs(this.camera.totalDistance));
    }

    async gameOver() {
        if (!this.isGameOver) {
            this.soundManager.stopBGM();
            this.soundManager.playExplosion();
            this.isGameOver = true;
            this.gameOverStartTime = performance.now();
            this.finalScore = this.score;
            
            // Replace Supabase code with localStorage
            if (this.score > 100) {
                const playerName = localStorage.getItem('playerName') || 'Anonymous';
                const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
                highScores.push({ player_name: playerName, score: this.score });
                highScores.sort((a, b) => b.score - a.score);
                localStorage.setItem('highScores', JSON.stringify(highScores.slice(0, 10)));
                this.highScores = highScores;
            }
            
            // Create explosion particles
            this.explosionParticles = this.createExplosionParticles(
                this.spacecraft.x,
                this.spacecraft.y
            );
            
            // Hide the spacecraft
            this.spacecraft.isVisible = false;

            // Load and display high scores
            this.loadHighScores();
        }
    }

    async loadHighScores() {
        // Replace Supabase code with localStorage
        try {
            this.highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        } catch (error) {
            console.error('Failed to load high scores:', error);
            this.highScores = [];
        }
    }

    createExplosionParticles(x, y) {
        const particles = [];
        const baseSpeed = this.baseUnit * 0.5; // Scale speed with screen size
        
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = baseSpeed * (2 + Math.random() * 3);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: this.baseUnit * (0.3 + Math.random() * 0.4),
                opacity: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
        return particles;
    }

    updateExplosion() {
        const currentTime = performance.now();
        
        if (this.isGameOver) {
            const timeSinceGameOver = currentTime - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;
            
            // Update explosion particles during the first 2 seconds
            if (timeSinceGameOver < deceleration) {
                // Expand and update particles
                this.explosionParticles = this.explosionParticles
                    .map(particle => {
                        const progress = timeSinceGameOver / deceleration;
                        return {
                            ...particle,
                            x: particle.x + particle.vx * (1 - progress),
                            y: particle.y + particle.vy * (1 - progress),
                            size: particle.size * (1 + progress * 0.5),
                            opacity: 1 - (timeSinceGameOver / deceleration)
                        };
                    });
            } else if (timeSinceGameOver >= deceleration) {
                // Clear particles after deceleration
                this.explosionParticles = [];
                // Start fading in game over screen
                this.gameOverAlpha = Math.min(1, (timeSinceGameOver - deceleration) / 1000);
            }
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.isGameOver) return;

            // Only allow interaction after explosion animation
            const timeSinceGameOver = performance.now() - this.gameOverStartTime;
            if (timeSinceGameOver < this.config.camera.deceleration) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.gameOverScreen === 'main') {
                if (this.isClickInButton(x, y, this.gameOverButtons.playAgain)) {
                    this.restart();
                } else if (this.isClickInButton(x, y, this.gameOverButtons.highScores)) {
                    this.gameOverScreen = 'highscores';
                }
            } else if (this.gameOverScreen === 'highscores') {
                if (this.isClickInButton(x, y, this.highScoresBackButton)) {
                    this.gameOverScreen = 'main';
                }
            }
        });
    }

    isClickInButton(x, y, button) {
        return x >= button.x && 
               x <= button.x + button.width && 
               y >= button.y && 
               y <= button.y + button.height;
    }

    restart() {
        this.gameOverScreen = 'main';  // Reset to main game over screen
        this.soundManager.playBGM();
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.explosionParticles = [];
        this.score = 0;
        
        // Reset camera
        this.camera.y = 0;
        this.camera.targetY = 0;
        this.camera.totalDistance = 0;
        
        // Reset spacecraft
        if (this.spacecraft) {
            this.spacecraft.reset();
        } else {
            this.spacecraft = new Spacecraft(this);
        }
        
        // Reset managers
        this.obstacleManager = new ObstacleManager(this);
        this.milestoneManager = new MilestoneManager(this);
        this.powerUpManager.reset();
    }
} 