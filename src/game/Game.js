import { Spacecraft } from '../entities/Spacecraft.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { Camera } from '../core/Camera.js';
import { InputHandler } from '../core/InputHandler.js';
import { MilestoneManager } from '../managers/MilestoneManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import { ScoreService } from '../services/ScoreService.js';

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
        this.scoreSubmitted = false; // Track if score has been submitted
        this.highScoreTab = 'distance'; // Add tab state
        
        this.setupCanvas();
        this.initializeGame();
        
        window.addEventListener('resize', () => this.setupCanvas());
        this.setupEventListeners();
        this.powerUpManager = new PowerUpManager(this);
        this.soundManager = new SoundManager();
        
        // Initialize sound on any user interaction
        const initSound = () => {
            this.soundManager.initialize();
            this.soundManager.playBGM();
            // Remove the event listeners after first interaction
            window.removeEventListener('click', initSound);
            window.removeEventListener('touchstart', initSound);
            window.removeEventListener('keydown', initSound);
        };

        // Add multiple event listeners for different types of interaction
        window.addEventListener('click', initSound);
        window.addEventListener('touchstart', initSound);
        window.addEventListener('keydown', initSound);
        
        // Add pause button
        this.setupPauseButton();
        
        // Reset high scores (remove this line after testing)
        localStorage.removeItem('highScores');
        
        this.loadHighScores();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Adjust base unit based on screen size with better scaling
        const isMobile = window.innerWidth <= 768;
        this.baseUnit = isMobile ? 
            Math.min(containerWidth / 35, containerHeight / 60) : // Smaller base unit for mobile
            containerWidth / 50;

        // Update game components if they exist
        if (this.spacecraft) {
            this.spacecraft.radius = this.baseUnit;
        }
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
                `${ScoreService.formatScore(this.score)} KM`,
                this.baseUnit * 2,
                this.baseUnit * 3
            );
            
            // Obstacles destroyed
            this.ctx.fillText(
                `${this.obstaclesDestroyed}`,
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
        const isMobile = window.innerWidth <= 768;
        const spacing = isMobile ? this.baseUnit * 3 : this.baseUnit * 4;
        let currentY = isMobile ? this.canvas.height * 0.2 : this.canvas.height * 0.25;

        // Game Over Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${isMobile ? this.baseUnit * 3 : this.baseUnit * 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.hasWon ? 'MISSION COMPLETE!' : 'GAME OVER',
            centerX,
            currentY
        );
        
        currentY += spacing * 1.5;

        // Score display
        this.ctx.font = `${isMobile ? this.baseUnit * 1.5 : this.baseUnit * 2}px Arial`;
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

        // If showing name input modal, don't show other buttons
        if (this.pendingHighScore?.shouldPromptName) {
            this.renderNameInputModal();
            return;
        }

        // Button layout
        const buttonY = currentY + spacing * 2;
        const buttonWidth = isMobile ? 
            Math.min(this.baseUnit * 10, this.canvas.width / 2.5) : 
            Math.min(this.baseUnit * 12, this.canvas.width / 3);
        const buttonHeight = isMobile ? this.baseUnit * 4 : this.baseUnit * 3;
        const buttonSpacing = isMobile ? this.baseUnit : this.baseUnit * 2;

        // Calculate total width based on number of buttons
        const numButtons = this.scoreSubmitted ? 2 : 3;
        const totalWidth = (buttonWidth * numButtons) + (buttonSpacing * (numButtons - 1));
        const startX = (this.canvas.width - totalWidth) / 2;

        // Draw buttons
        this.gameOverButtons = {};

        // Play Again button
        this.drawButton(
            startX,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Play Again',
            '#4CAF50'
        );
        this.gameOverButtons.playAgain = {
            x: startX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };

        // High Scores button
        this.drawButton(
            startX + buttonWidth + buttonSpacing,
            buttonY,
            buttonWidth,
            buttonHeight,
            'High Scores',
            '#2196F3'
        );
        this.gameOverButtons.highScores = {
            x: startX + buttonWidth + buttonSpacing,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };

        // Submit Score button (only if not submitted)
        if (!this.scoreSubmitted) {
            this.drawButton(
                startX + (buttonWidth + buttonSpacing) * 2,
                buttonY,
                buttonWidth,
                buttonHeight,
                'Submit Score',
                '#FFA500'
            );
            this.gameOverButtons.submitScore = {
                x: startX + (buttonWidth + buttonSpacing) * 2,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            };
        }
    }

    renderHighScores() {
        const isMobile = window.innerWidth <= 768;
        const padding = this.baseUnit * 2;
        const buttonHeight = this.baseUnit * 3;
        
        // Back button at the top
        this.highScoresBackButton = {
            x: padding,
            y: padding,
            width: this.baseUnit * 8,
            height: buttonHeight
        };

        this.drawButton(
            this.highScoresBackButton.x,
            this.highScoresBackButton.y,
            this.highScoresBackButton.width,
            this.highScoresBackButton.height,
            'Back',
            '#4CAF50'
        );

        // High Scores header
        const headerY = padding + buttonHeight + this.baseUnit * 3;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `bold ${isMobile ? this.baseUnit * 2 : this.baseUnit * 2.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('High Scores', this.canvas.width / 2, headerY);

        // Tab text styling
        const tabY = headerY + this.baseUnit * 4;
        this.ctx.font = `${this.baseUnit * 1.8}px Arial`;
        
        // Calculate tab positions with increased spacing
        const distanceX = this.canvas.width * 0.2;
        const tabSpacing = this.baseUnit * 15; // Increased spacing between tabs
        const obstaclesX = distanceX + tabSpacing;

        // Pre-calculate text widths
        const tabTexts = ['DISTANCE', 'OBSTACLES'];
        const tabWidths = tabTexts.map(text => this.ctx.measureText(text).width);

        // Draw tabs as text
        tabTexts.forEach((tab, index) => {
            const x = index === 0 ? distanceX : obstaclesX;
            const isSelected = (index === 0 && this.highScoreTab === 'distance') || 
                              (index === 1 && this.highScoreTab === 'obstacles');
            
            // Tab text
            this.ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(tab, x, tabY);

            // Underline for selected tab
            if (isSelected) {
                const underlineY = tabY + this.baseUnit * 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(x, underlineY);
                this.ctx.lineTo(x + tabWidths[index], underlineY);
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Store tab hitboxes with padding
            const hitboxPadding = this.baseUnit * 2;
            if (index === 0) {
                this.distanceTab = {
                    x: x - hitboxPadding,
                    y: tabY - hitboxPadding,
                    width: tabWidths[index] + hitboxPadding * 2,
                    height: hitboxPadding * 2
                };
            } else {
                this.obstaclesTab = {
                    x: x - hitboxPadding,
                    y: tabY - hitboxPadding,
                    width: tabWidths[index] + hitboxPadding * 2,
                    height: hitboxPadding * 2
                };
            }
        });

        // Start scores list below tabs
        const scoreStartY = tabY + this.baseUnit * 4;
        const scoreSpacing = this.baseUnit * 2.5;
        
        // Draw scores
        this.ctx.font = `${isMobile ? this.baseUnit * 1.5 : this.baseUnit * 1.8}px Arial`;
        
        this.highScores.slice(0, 20).forEach((score, index) => {
            const y = scoreStartY + (index * scoreSpacing);
            
            this.ctx.fillStyle = '#FFFFFF';
            
            // Draw rank
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${index + 1}.`, this.canvas.width * 0.2, y);
            
            // Draw name
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                (score.player_name || 'Anonymous').slice(0, 15),
                this.canvas.width * 0.25,
                y
            );
            
            // Draw score based on current tab
            this.ctx.textAlign = 'right';
            if (this.highScoreTab === 'distance') {
                this.ctx.fillText(
                    `${ScoreService.formatScore(score.score)} KM`,
                    this.canvas.width * 0.8,
                    y
                );
            } else {
                this.ctx.fillText(
                    `${score.obstacles_destroyed}`,
                    this.canvas.width * 0.8,
                    y
                );
            }
        });
    }

    drawButton(x, y, width, height, text, color) {
        const isMobile = window.innerWidth <= 768;
        
        // Draw button background
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, height / 4);
        this.ctx.fill();
        
        // Draw button text - adjusted size for mobile
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `bold ${isMobile ? this.baseUnit * 1.2 : this.baseUnit * 1.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + width/2, y + height/2);
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
            this.soundManager.playCrash();
            this.soundManager.playExplosion();
            this.isGameOver = true;
            this.gameOverStartTime = performance.now();
            this.finalScore = this.score;
            
            // Hide pause button
            this.updatePauseButtonVisibility();
            
            try {
                // Check if score is in top 20 before showing input
                const topScores = await ScoreService.getTopScores();
                const isTop20 = topScores.length < 20 || this.score > topScores[19].score;
                
                this.pendingHighScore = isTop20 ? {
                    score: this.score,
                    obstaclesDestroyed: this.obstaclesDestroyed,
                    isWinner: this.hasWon,
                    shouldPromptName: true // Flag to show modal immediately
                } : null;
                
                await this.loadHighScores();
            } catch (error) {
                console.error('Error handling high score:', error);
            }
            
            this.explosionParticles = this.createExplosionParticles(
                this.spacecraft.x,
                this.spacecraft.y
            );
            
            this.spacecraft.isVisible = false;
        }
    }

    async loadHighScores() {
        try {
            this.highScores = await ScoreService.getTopScores(this.highScoreTab);
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
        const handleInteraction = async (clientX, clientY) => {
            if (!this.isGameOver) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            // Handle name input modal
            if (this.pendingHighScore?.shouldPromptName && this.submitButton) {
                if (this.isClickInButton(x, y, this.submitButton) && this.nameInput?.value.trim()) {
                    await this.submitHighScore(this.nameInput.value.trim());
                }
                return;
            }

            // Handle main game over buttons
            if (this.gameOverScreen === 'main' && this.gameOverButtons) {
                if (this.isClickInButton(x, y, this.gameOverButtons.playAgain)) {
                    this.restart();
                } else if (this.isClickInButton(x, y, this.gameOverButtons.highScores)) {
                    this.gameOverScreen = 'highscores';
                } else if (!this.scoreSubmitted && 
                          this.gameOverButtons.submitScore && 
                          this.isClickInButton(x, y, this.gameOverButtons.submitScore)) {
                    this.pendingHighScore = {
                        score: this.finalScore,
                        obstaclesDestroyed: this.obstaclesDestroyed,
                        isWinner: this.hasWon,
                        shouldPromptName: true
                    };
                }
            } else if (this.gameOverScreen === 'highscores') {
                if (this.isClickInButton(x, y, this.distanceTab) && this.highScoreTab !== 'distance') {
                    this.highScoreTab = 'distance';
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.obstaclesTab) && this.highScoreTab !== 'obstacles') {
                    this.highScoreTab = 'obstacles';
                    await this.loadHighScores();
                } else if (this.isClickInButton(x, y, this.highScoresBackButton)) {
                    this.gameOverScreen = 'main';
                }
            }
        };

        // Mouse events
        this.canvas.addEventListener('click', (e) => {
            handleInteraction(e.clientX, e.clientY);
        });

        // Touch events
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            handleInteraction(touch.clientX, touch.clientY);
        });
    }

    isClickInButton(x, y, button) {
        if (!button) return false;
        
        return x >= button.x && 
               x <= button.x + button.width && 
               y >= button.y && 
               y <= button.y + button.height;
    }

    restart() {
        // Reset all game state
        this.score = 0;
        this.isGameOver = false;
        this.gameOverAlpha = 0;
        this.gameOverScreen = 'main';
        this.hasWon = false;
        this.obstaclesDestroyed = 0;
        this.scoreSubmitted = false;
        this.pendingHighScore = null;
        
        if (this.nameInput) {
            document.body.removeChild(this.nameInput);
            this.nameInput = null;
        }
        
        // Reset game components
        this.camera = new Camera(this);
        this.spacecraft = new Spacecraft(this);
        this.obstacleManager = new ObstacleManager(this);
        this.milestoneManager = new MilestoneManager(this);
        
        // Reset explosion particles
        this.explosionParticles = [];
        
        // Show pause button
        this.updatePauseButtonVisibility();
        
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
            transition: opacity 0.3s, visibility 0.3s;
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

        // Add spacebar listener for pause
        window.addEventListener('keydown', (e) => {
            if (!this.isGameOver && e.code === 'Space') {
                e.preventDefault();
                this.togglePause();
            }
        });

        // Initial state
        this.updatePauseButtonVisibility();
    }

    // Add new method to control pause button visibility
    updatePauseButtonVisibility() {
        if (this.pauseButton) {
            if (this.isGameOver) {
                this.pauseButton.style.visibility = 'hidden';
                this.pauseButton.style.opacity = '0';
            } else {
                this.pauseButton.style.visibility = 'visible';
                this.pauseButton.style.opacity = '0.8';
            }
        }
    }

    togglePause() {
        if (this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        this.pauseButton.innerHTML = this.isPaused ? '&#9654;' : '&#9208;';
        
        if (this.isPaused) {
            // Store the pause time in spacecraft
            this.spacecraft.pausedTime = performance.now();
            this.soundManager.stopBGM();
        } else {
            // Reset game time and restart sound
            this.lastTime = performance.now();
            this.soundManager.initialize(); // Ensure sounds are initialized
            this.soundManager.playBGM();
        }
    }

    checkCollisions() {
        if (this.spacecraft.invulnerable) return;

        const collision = this.obstacleManager.checkCollisions(this.spacecraft);
        if (collision) {
            if (this.spacecraft.shieldActive) {
                this.soundManager.playShieldCrash();
                this.spacecraft.deactivateShield();
                this.camera.shake = {
                    x: (Math.random() - 0.5) * this.baseUnit,
                    y: (Math.random() - 0.5) * this.baseUnit
                };
            } else {
                this.soundManager.playCrash(); // Play crash sound
                this.gameOver();
            }
        }
    }

    renderNameInputModal() {
        // Clean dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Flat modal box with refined proportions
        const modalWidth = Math.min(this.canvas.width * 0.85, 450);
        const modalHeight = Math.min(this.canvas.height * 0.65, 450);
        const modalX = (this.canvas.width - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;

        // Clean white background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.roundRect(modalX, modalY, modalWidth, modalHeight, 12);
        this.ctx.fill();

        // Content positioning with improved spacing
        const contentX = modalX + modalWidth/2;
        let currentY = modalY + modalHeight * 0.12;

        // Trophy icon
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = `${this.baseUnit * 3.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆', contentX, currentY);

        currentY += this.baseUnit * 4.5;

        // Title
        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold ${this.baseUnit * 2.2}px Arial`;
        this.ctx.fillText('New High Score!', contentX, currentY);

        currentY += this.baseUnit * 3.5;

        // Score display
        this.ctx.font = `${this.baseUnit * 2}px Arial`;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillText(
            `${ScoreService.formatScore(this.finalScore)} KM`,
            contentX,
            currentY
        );

        currentY += this.baseUnit * 4.5;

        // Input field - narrower than modal width
        const inputWidth = modalWidth * 0.7; // Reduced from 0.8
        const inputHeight = this.baseUnit * 3.5;
        const inputX = contentX - inputWidth/2;

        // Create or update input element
        if (!this.nameInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 15;
            input.placeholder = 'Enter your name';
            
            const canvasRect = this.canvas.getBoundingClientRect();
            const scaledX = canvasRect.left + (inputX * canvasRect.width / this.canvas.width);
            const scaledY = canvasRect.top + (currentY * canvasRect.height / this.canvas.height);
            
            // Calculate scaled dimensions
            const scaledWidth = inputWidth * canvasRect.width / this.canvas.width;
            const scaledHeight = inputHeight * canvasRect.height / this.canvas.height;
            
            // Clean, flat input styling with fixed width
            input.style.cssText = `
                position: absolute;
                left: ${scaledX}px;
                top: ${scaledY}px;
                width: ${scaledWidth}px;
                height: ${scaledHeight}px;
                font-size: ${this.baseUnit * 1.4 * canvasRect.height / this.canvas.height}px;
                text-align: center;
                border: 2px solid #E0E0E0;
                border-radius: 6px;
                outline: none;
                padding: 0 15px;
                background: #FFFFFF;
                color: #333333;
                transition: border-color 0.2s;
                box-sizing: border-box;
            `;

            input.addEventListener('focus', () => {
                input.style.borderColor = '#4CAF50';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = '#E0E0E0';
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.submitHighScore(input.value.trim());
                }
            });

            this.nameInput = input;
            document.body.appendChild(input);
            input.focus();

            // Add resize handler
            window.addEventListener('resize', () => {
                if (this.nameInput) {
                    const newCanvasRect = this.canvas.getBoundingClientRect();
                    const newScaledX = newCanvasRect.left + (inputX * newCanvasRect.width / this.canvas.width);
                    const newScaledY = newCanvasRect.top + (currentY * newCanvasRect.height / this.canvas.height);
                    const newScaledWidth = inputWidth * newCanvasRect.width / this.canvas.width;
                    const newScaledHeight = inputHeight * newCanvasRect.height / this.canvas.height;
                    
                    this.nameInput.style.left = `${newScaledX}px`;
                    this.nameInput.style.top = `${newScaledY}px`;
                    this.nameInput.style.width = `${newScaledWidth}px`;
                    this.nameInput.style.height = `${newScaledHeight}px`;
                    this.nameInput.style.fontSize = `${this.baseUnit * 1.4 * newCanvasRect.height / this.canvas.height}px`;
                }
            });
        }

        currentY += this.baseUnit * 6;

        // Submit button
        const buttonWidth = modalWidth * 0.4; // Slightly narrower than input
        const buttonHeight = this.baseUnit * 4;
        const buttonX = contentX - buttonWidth/2;
        
        const hasInput = this.nameInput && this.nameInput.value.trim().length > 0;
        
        // Flat button
        this.ctx.fillStyle = hasInput ? '#4CAF50' : '#E0E0E0';
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, currentY, buttonWidth, buttonHeight, 6);
        this.ctx.fill();

        // Button text
        this.ctx.fillStyle = hasInput ? '#FFFFFF' : '#999999';
        this.ctx.font = `bold ${this.baseUnit * 1.4}px Arial`;
        this.ctx.fillText(
            'Submit',
            contentX,
            currentY + buttonHeight/2 + this.baseUnit * 0.4
        );

        this.submitButton = {
            x: buttonX,
            y: currentY,
            width: buttonWidth,
            height: buttonHeight,
            enabled: hasInput
        };
    }

    async submitHighScore(name) {
        if (!name.trim()) return;
        
        try {
            await ScoreService.saveScore(
                this.finalScore,
                name,
                this.obstaclesDestroyed
            );
            
            // Clean up
            if (this.nameInput) {
                document.body.removeChild(this.nameInput);
                this.nameInput = null;
            }
            
            this.pendingHighScore = null;
            this.scoreSubmitted = true;
            await this.loadHighScores();
            this.gameOverScreen = 'highscores';
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }

    // Clean up input when game restarts or component unmounts
    cleanup() {
        if (this.nameInput) {
            document.body.removeChild(this.nameInput);
            this.nameInput = null;
        }
    }
} 