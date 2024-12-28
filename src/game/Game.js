import { Spacecraft } from '../entities/Spacecraft.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { Camera } from '../core/Camera.js';
import { MilestoneManager } from '../managers/MilestoneManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import { ScoreService } from '../services/ScoreService.js';
import { InputManager } from '../managers/InputManager.js';

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
        this.isPaused = false;
        this.pauseBlur = 10; // Blur amount when paused
        this.TOTAL_DISTANCE = 50000; // Total distance to win
        this.hasWon = false; // Track if player has won
        this.lastTime = performance.now();
        this.accumulatedTime = 0; // Track time between pauses
        this.obstaclesDestroyed = 0;  // Add counter
        
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
        
        // Add pause button
        this.setupPauseButton();
        
        // Add spacebar listener
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                this.togglePause();
            }
        });
        
        // Reset high scores (remove this line after testing)
        localStorage.removeItem('highScores');
        
        this.loadHighScores();
        
        // Initialize input manager first
        this.inputManager = new InputManager(this);
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
        this.milestoneManager = new MilestoneManager(this);
    }

    start() {
        this.gameLoop();
    }

    gameLoop() {
        const currentTime = performance.now();
        
        if (!this.isPaused) {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.update(deltaTime);
            this.lastTime = currentTime;
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        const currentTime = performance.now();
        
        if (this.isGameOver) {
            const timeSinceGameOver = currentTime - this.gameOverStartTime;
            const deceleration = this.config.camera.deceleration;
            
            if (timeSinceGameOver < deceleration) {
                const slowdownFactor = 1 - (timeSinceGameOver / deceleration);
                this.camera.update(slowdownFactor);
            }
        } else if (!this.isPaused) {  // Only update if not paused
            // Update all game components
            this.camera.update(1);
            this.spacecraft.update();
            
            // Update score based on camera movement, multiplied by 100
            this.score += Math.abs(this.camera.velocity) * deltaTime * 100;
            
            // Calculate remaining distance for difficulty scaling
            const remainingDistance = Math.max(0, this.TOTAL_DISTANCE - (this.score / 100));
            
            // Update managers with remaining distance for proper difficulty scaling
            this.obstacleManager.update(remainingDistance);
            this.milestoneManager.update(remainingDistance);
            this.powerUpManager.update();
        }
        
        this.updateExplosion();
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
            this.powerUpManager.render(this.ctx);
            
            // Score display during gameplay
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${this.baseUnit * 2}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `Distance: ${ScoreService.formatScore(this.score)} KM`,
                this.baseUnit * 2,
                this.baseUnit * 3
            );
            
            // Obstacles destroyed
            this.ctx.fillText(
                `Obstacles Destroyed: ${this.obstaclesDestroyed}`,
                this.baseUnit * 2,
                this.baseUnit * 6
            );
        }

        // Pause overlay
        if (this.isPaused) {
            // Draw semi-transparent overlay
            this.ctx.fillStyle = 'rgba(225, 217, 193, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw pause message
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.font = `500 ${this.baseUnit * 3}px "Helvetica Neue", Arial, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Mission Paused', 
                this.canvas.width / 2, 
                this.canvas.height / 2
            );
            this.ctx.restore();
        }
    }

    renderMainGameOver() {
        const centerX = this.canvas.width / 2;
        const spacing = this.baseUnit * 4;
        let currentY = this.canvas.height * 0.25;

        // Game Over Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${this.baseUnit * 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.hasWon ? 'MISSION COMPLETE!' : 'GAME OVER',
            centerX,
            currentY
        );
        
        currentY += spacing * 1.5;

        // Score display
        this.ctx.font = `${this.baseUnit * 2}px Arial`;
        this.ctx.fillText(
            `Distance traveled: ${ScoreService.formatScore(this.finalScore)} KM`,
            centerX,
            currentY
        );
        
        currentY += spacing;
        
        // Obstacles destroyed display
        this.ctx.fillText(
            `Obstacles Destroyed: ${this.obstaclesDestroyed}`,
            centerX,
            currentY
        );

        // Debug log for high score status
        console.log('Pending high score:', this.pendingHighScore);

        // Name input if there's a pending high score
        if (this.pendingHighScore) {
            currentY += spacing;
            this.ctx.font = `${this.baseUnit * 1.5}px Arial`;
            this.ctx.fillText(
                'You made the top 100! Click here to enter your name:',
                centerX,
                currentY
            );
            
            // Draw input box
            const inputWidth = this.baseUnit * 20;
            const inputHeight = this.baseUnit * 3;
            const inputY = currentY + spacing/2;
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(
                centerX - inputWidth/2,
                inputY,
                inputWidth,
                inputHeight
            );
            
            // Draw current input text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${this.baseUnit * 1.5}px Arial`;
            this.ctx.fillText(
                this.playerNameInput || 'Click to enter name',
                centerX,
                inputY + inputHeight/2 + this.baseUnit/2
            );
            
            // Store input box position for click handling
            this.nameInputBox = {
                x: centerX - inputWidth/2,
                y: inputY,
                width: inputWidth,
                height: inputHeight
            };
            
            currentY += spacing * 2;
        } else {
            currentY += spacing;
        }

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
        let currentY = this.canvas.height * 0.15; // Start higher

        // High Scores Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${this.baseUnit * 3}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HIGH SCORES', centerX, currentY);
        
        currentY += this.baseUnit * 6; // More space after title

        // Scores List
        if (this.highScores && this.highScores.length > 0) {
            this.ctx.font = `${this.baseUnit * 1.8}px Arial`;
            
            this.highScores.slice(0, 5).forEach((score, index) => {
                // Just show the distance traveled directly
                const scoreValue = score.isWinner ? 'COMPLETED!' : 
                                 `${Math.floor(score.score)} units`;
                
                const prefix = score.isWinner ? '👑' : 
                             (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ');
                
                // Draw rank and name (left-aligned)
                this.ctx.textAlign = 'left';
                this.ctx.fillStyle = '#E1D9C1';
                this.ctx.fillText(
                    `${prefix} ${score.player_name}`,
                    centerX - this.baseUnit * 12,
                    currentY + (index * this.baseUnit * 4) // More vertical spacing
                );
                
                // Draw score (right-aligned)
                this.ctx.textAlign = 'right';
                this.ctx.fillStyle = score.isWinner ? '#4CAF50' : '#E1D9C1';
                this.ctx.fillText(
                    scoreValue,
                    centerX + this.baseUnit * 12,
                    currentY + (index * this.baseUnit * 4)
                );
            });
        } else {
            this.ctx.fillText('No scores yet!', centerX, currentY);
        }

        // Back Button - positioned lower
        const buttonWidth = this.baseUnit * 10;
        const buttonHeight = this.baseUnit * 3;
        const buttonY = this.canvas.height * 0.85; // Lower position

        this.drawButton(
            centerX - buttonWidth / 2,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Back',
            '#FF5722'
        );

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
        // Calculate remaining distance
        const distanceTraveled = Math.abs(this.camera.totalDistance);
        this.score = Math.max(0, this.TOTAL_DISTANCE - distanceTraveled);

        // Check for win condition
        if (this.score === 0 && !this.hasWon) {
            this.hasWon = true;
            this.victory();
        }
    }

    victory() {
        this.isGameOver = true;
        this.gameOverStartTime = performance.now();
        this.finalScore = this.score;
        this.soundManager.stopBGM();
        this.soundManager.playVictory();
        
        // Save victory score
        const playerName = localStorage.getItem('playerName') || 'Anonymous';
        const highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        
        // Store the actual distance traveled
        const distanceTraveled = 50000 - this.score;
        
        highScores.push({ 
            player_name: playerName, 
            score: distanceTraveled,  // Store actual distance traveled
            isWinner: true
        });
        
        // Higher scores (more distance) should be first
        highScores.sort((a, b) => b.score - a.score);
        localStorage.setItem('highScores', JSON.stringify(highScores.slice(0, 10)));
        this.highScores = highScores;
    }

    async gameOver() {
        if (!this.isGameOver) {
            this.soundManager.stopBGM();
            this.soundManager.playExplosion();
            this.isGameOver = true;
            this.gameOverStartTime = performance.now();
            this.finalScore = this.score; // Store actual distance traveled
            
            try {
                // Get current top scores
                const topScores = await ScoreService.getTopScores();
                console.log('Current top scores:', topScores);
                
                // Use actual distance traveled
                console.log('Distance traveled:', this.score);
                
                // Always set pending high score for testing
                this.pendingHighScore = {
                    score: this.score,
                    obstaclesDestroyed: this.obstaclesDestroyed,
                    isWinner: this.hasWon
                };
                console.log('Set pending high score:', this.pendingHighScore);
                
                await this.loadHighScores();
            } catch (error) {
                console.error('Error handling high score:', error);
            }
            
            // Create explosion particles
            this.explosionParticles = this.createExplosionParticles(
                this.spacecraft.x,
                this.spacecraft.y
            );
            
            // Hide the spacecraft
            this.spacecraft.isVisible = false;
        }
    }

    async loadHighScores() {
        try {
            this.highScores = await ScoreService.getTopScores(10);
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
        this.canvas.addEventListener('click', async (e) => {
            // Only allow interaction after explosion animation
            const timeSinceGameOver = performance.now() - this.gameOverStartTime;
            if (timeSinceGameOver < this.config.camera.deceleration) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Handle name input box click
            if (this.pendingHighScore && this.nameInputBox && 
                this.isClickInButton(x, y, this.nameInputBox)) {
                const name = prompt('Enter your name:', '');
                if (name) {
                    try {
                        await ScoreService.saveScore(
                            this.pendingHighScore.score, 
                            name,
                            this.obstaclesDestroyed
                        );
                        this.pendingHighScore = null;
                        await this.loadHighScores();
                    } catch (error) {
                        console.error('Error saving score:', error);
                    }
                }
                return;
            }

            // Handle other buttons
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
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.gameOverScreen = 'main';
        this.hasWon = false;
        this.obstaclesDestroyed = 0; // Reset obstacle counter
        
        // Reset game components
        this.camera = new Camera(this);
        this.spacecraft = new Spacecraft(this);
        this.obstacleManager = new ObstacleManager(this);
        this.milestoneManager = new MilestoneManager(this);
        
        // Reset explosion particles
        this.explosionParticles = [];
        
        // Start background music
        this.soundManager.playBGM();
    }

    setupPauseButton() {
        const button = document.createElement('button');
        button.innerHTML = '&#9208;'; // Fat pause symbol
        button.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            z-index: 1000;
            padding: 15px;
            color: black;
            opacity: 0.8;
            transition: opacity 0.3s;
            font-family: Arial, sans-serif;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        button.addEventListener('mouseover', () => button.style.opacity = '1');
        button.addEventListener('mouseout', () => button.style.opacity = '0.8');
        button.addEventListener('click', () => this.togglePause());
        
        this.canvas.parentElement.appendChild(button);
        this.pauseButton = button;
    }

    togglePause() {
        if (this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        this.pauseButton.innerHTML = this.isPaused ? '&#9654;' : '&#9208;';
        
        if (this.isPaused) {
            // Store the pause time in spacecraft
            this.spacecraft.pausedTime = performance.now();
        } else {
            // Reset game time
            this.lastTime = performance.now();
        }
    }
} 