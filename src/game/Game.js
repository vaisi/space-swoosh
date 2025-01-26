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
        this.soundInitialized = false;  // Add flag to track initialization
        
        // Initialize sound on first user interaction
        const initSound = () => {
            if (this.soundInitialized) {
                console.log('Sound already initialized, skipping...');
                return;
            }
            
            console.log('Initializing sound...');
            this.soundManager.initialize();
            console.log('Sound initialized, playing BGM...');
            this.soundManager.playBGM();
            this.soundInitialized = true;
            
            // Remove the event listeners
            window.removeEventListener('click', initSound);
            window.removeEventListener('touchstart', initSound);
            window.removeEventListener('keydown', initSound);
            console.log('Sound initialization complete');
        };

        // Add event listeners for different types of interaction
        window.addEventListener('click', initSound, { once: true });
        window.addEventListener('touchstart', initSound, { once: true });
        window.addEventListener('keydown', initSound, { once: true });
        
        // Add pause button
        this.setupPauseButton();
        
        // Reset high scores (remove this line after testing)
        localStorage.removeItem('highScores');
        
        this.loadHighScores();

        // Add visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause the game when tab becomes hidden
                if (!this.isGameOver && !this.isPaused) {
                    this.togglePause();
                    this.wasAutoPaused = true; // Flag to track auto-pause
                }
            } else if (this.wasAutoPaused) {
                // Only unpause if the game was auto-paused
                this.togglePause();
                this.wasAutoPaused = false;
            }
        });
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
            Math.min(containerWidth / 45, containerHeight / 75) : // More zoomed out for mobile (changed from 35,60)
            containerWidth / 50; // Desktop remains the same

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
        // Only run the game loop if the tab is visible
        if (!document.hidden) {
            const currentTime = performance.now();
            
            if (!this.isPaused) {
                // Cap deltaTime to prevent huge jumps
                const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
                this.update(deltaTime);
                this.lastTime = currentTime;
            }
            
            this.render();
        }
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
        const spacing = isMobile ? this.baseUnit * 3.5 : this.baseUnit * 4;
        let currentY = isMobile ? this.canvas.height * 0.2 : this.canvas.height * 0.25;

        // Game Over Title - clean and bold
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${isMobile ? Math.min(this.baseUnit * 4, 48) : this.baseUnit * 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            this.hasWon ? 'MISSION COMPLETE!' : 'GAME OVER',
            centerX,
            currentY
        );
        
        currentY += spacing * 1.5;

        // Score display - larger and clearer
        this.ctx.font = `${isMobile ? Math.min(this.baseUnit * 2.5, 32) : this.baseUnit * 2}px Arial`;
        this.ctx.fillText(
            `Distance traveled: ${ScoreService.formatScore(this.finalScore)} KM`,
            centerX,
            currentY
        );
        
        currentY += spacing;
        
        // Obstacles destroyed
        this.ctx.fillText(
            `Obstacles Destroyed: ${this.obstaclesDestroyed}`,
            centerX,
            currentY
        );

        if (this.pendingHighScore?.shouldPromptName) {
            this.renderNameInputModal();
            return;
        }

        // Simple, clean button layout
        const buttonY = currentY + spacing * 2;
        const buttonWidth = isMobile ? 
            Math.min(this.baseUnit * 12, this.canvas.width / 2.2) : 
            Math.min(this.baseUnit * 12, this.canvas.width / 3);
        const buttonHeight = isMobile ? this.baseUnit * 5 : this.baseUnit * 3.5;
        const buttonSpacing = isMobile ? this.baseUnit * 2 : this.baseUnit * 2;

        const numButtons = this.scoreSubmitted ? 2 : 3;
        const totalWidth = (buttonWidth * numButtons) + (buttonSpacing * (numButtons - 1));
        const startX = (this.canvas.width - totalWidth) / 2;

        this.gameOverButtons = {};

        // Helper function for minimal button rendering
        const renderButton = (x, y, width, height, text, color) => {
            // Simple rectangular button
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);

            // Clean, centered text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `bold ${isMobile ? Math.min(this.baseUnit * 2, 24) : this.baseUnit * 1.8}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x + width/2, y + height/2);

            return { x, y, width, height };
        };

        // Render buttons with consistent spacing
        this.gameOverButtons.playAgain = renderButton(
            startX,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Play Again',
            '#000000'
        );

        this.gameOverButtons.highScores = renderButton(
            startX + buttonWidth + buttonSpacing,
            buttonY,
            buttonWidth,
            buttonHeight,
            'High Scores',
            '#000000'
        );

        if (!this.scoreSubmitted) {
            this.gameOverButtons.submitScore = renderButton(
                startX + (buttonWidth + buttonSpacing) * 2,
                buttonY,
                buttonWidth,
                buttonHeight,
                'Submit Score',
                '#000000'
            );
        }
    }

    renderHighScores() {
        const isMobile = window.innerWidth <= 768;
        const padding = this.baseUnit * 2;
        const buttonHeight = this.baseUnit * 3;
        
        // Back button - simple black rectangle
        this.highScoresBackButton = {
            x: padding,
            y: padding,
            width: this.baseUnit * 8,
            height: buttonHeight
        };
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(
            this.highScoresBackButton.x,
            this.highScoresBackButton.y,
            this.highScoresBackButton.width,
            this.highScoresBackButton.height
        );
        
        // Back button text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `bold ${this.baseUnit * 1.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            'Back',
            this.highScoresBackButton.x + this.highScoresBackButton.width / 2,
            this.highScoresBackButton.y + this.highScoresBackButton.height / 2
        );
        
        // Title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${isMobile ? Math.min(this.baseUnit * 3, 36) : this.baseUnit * 3}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'HIGH SCORES',
            this.canvas.width / 2,
            padding + buttonHeight / 2
        );
        
        // Tab buttons
        const tabWidth = this.canvas.width * (isMobile ? 0.4 : 0.3);
        const tabHeight = buttonHeight;
        const tabY = padding + buttonHeight + padding;
        const tabSpacing = this.baseUnit * 2;
        
        // Distance tab
        this.distanceTab = {
            x: this.canvas.width / 2 - tabWidth - tabSpacing / 2,
            y: tabY,
            width: tabWidth,
            height: tabHeight
        };
        
        // Obstacles tab
        this.obstaclesTab = {
            x: this.canvas.width / 2 + tabSpacing / 2,
            y: tabY,
            width: tabWidth,
            height: tabHeight
        };
        
        // Draw tabs
        [
            { tab: this.distanceTab, text: 'DISTANCE', active: this.highScoreTab === 'distance' },
            { tab: this.obstaclesTab, text: 'OBSTACLES', active: this.highScoreTab === 'obstacles' }
        ].forEach(({ tab, text, active }) => {
            // Tab text
            this.ctx.fillStyle = '#E1D9C1';
            this.ctx.font = `bold ${isMobile ? Math.min(this.baseUnit * 1.8, 20) : this.baseUnit * 1.5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                text,
                tab.x + tab.width / 2,
                tab.y + tab.height / 2
            );

            // Underline for active tab
            if (active) {
                this.ctx.beginPath();
                this.ctx.moveTo(tab.x, tab.y + tab.height);
                this.ctx.lineTo(tab.x + tab.width, tab.y + tab.height);
                this.ctx.strokeStyle = '#E1D9C1';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
        
        // Scores list
        const startY = tabY + tabHeight + padding;
        const scoreHeight = isMobile ? this.baseUnit * 3 : this.baseUnit * 2.5;
        const scoreSpacing = this.baseUnit * 0.5;
        
        this.highScores.forEach((score, index) => {
            const y = startY + (scoreHeight + scoreSpacing) * index;
            
            // Rank number
            this.ctx.fillStyle = '#E1D9C1';
            this.ctx.font = `bold ${isMobile ? Math.min(this.baseUnit * 2, 24) : this.baseUnit * 1.8}px Arial`;
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `${index + 1}.`,
                this.canvas.width * 0.2,
                y + scoreHeight / 2
            );
            
            // Player name
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                score.player_name,
                this.canvas.width * 0.25,
                y + scoreHeight / 2
            );
            
            // Score
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                this.highScoreTab === 'distance' ? 
                    `${score.formattedScore} KM` : 
                    score.formattedScore,
                this.canvas.width * 0.8,
                y + scoreHeight / 2
            );
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
            this.finalScore = Math.floor(this.score);
            
            // Send game over event to Google Analytics
            gtag('event', 'game_over', {
                'score': this.finalScore,
                'obstacles_destroyed': this.obstaclesDestroyed,
                'distance': Math.floor(this.score)
            });
            
            // Hide pause button
            this.updatePauseButtonVisibility();
            
            try {
                // Get actual rank by counting all higher scores
                const higherScoresCount = await ScoreService.getAllScoresCount(this.finalScore);
                const rank = higherScoresCount + 1;
                
                // Store rank separately so it persists even if modal is closed
                this.currentRank = rank;
                
                // Only show score submission immediately for top 20
                const isTop20 = rank <= 20;
                
                this.pendingHighScore = isTop20 ? {
                    score: this.finalScore,
                    obstaclesDestroyed: this.obstaclesDestroyed,
                    isWinner: this.hasWon,
                    shouldPromptName: true,
                    rank: this.currentRank
                } : null;
                
                await this.loadHighScores();
            } catch (error) {
                console.error('Error handling high score:', error);
                this.currentRank = '?';
                this.pendingHighScore = null;
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
            if (this.pendingHighScore?.shouldPromptName) {
                if (this.isClickInButton(x, y, this.closeButton)) {
                    // Clean up modal
                    if (this.nameInput) {
                        document.body.removeChild(this.nameInput);
                        this.nameInput = null;
                    }
                    this.pendingHighScore = null;
                    this.scoreSubmitted = false;
                    this.gameOverScreen = 'main';
                    return;
                }
                if (this.submitButton && this.isClickInButton(x, y, this.submitButton) && this.nameInput?.value.trim()) {
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
                        shouldPromptName: true,
                        rank: this.currentRank
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
            this.spacecraft.pausedTime = performance.now();
            if (this.soundInitialized) {
                this.soundManager.stopBGM();
            }
        } else {
            this.lastTime = performance.now();
            if (this.soundInitialized && !document.hidden) {
                this.soundManager.playBGM();
            }
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
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Modal dimensions
        const modalWidth = 320;  // Fixed width
        const modalHeight = 280;  // Fixed height
        const modalX = (this.canvas.width - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;
        const padding = 24;

        // White background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

        let currentY = modalY + padding;

        // Header row with title and rank
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Submit your score', modalX + padding, currentY + 8);

        // Rank tag
        const rankText = `#${this.pendingHighScore.rank}`;
        const rankWidth = 45;
        const rankHeight = 24;
        const rankX = modalX + modalWidth - padding - rankWidth;
        
        this.ctx.fillStyle = '#F5F5F5';
        this.ctx.fillRect(rankX, currentY, rankWidth, rankHeight);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(rankText, rankX + rankWidth/2, currentY + rankHeight/2);

        currentY += padding * 2;

        // Score row
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 32px Arial';
        const scoreText = ScoreService.formatScore(this.finalScore);
        const scoreWidth = this.ctx.measureText(scoreText).width;
        this.ctx.fillText(scoreText, modalX + padding, currentY);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#666666';
        this.ctx.fillText('KM', modalX + padding + scoreWidth + 8, currentY);

        currentY += padding;

        // Obstacles count
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#666666';
        this.ctx.fillText(
            `${this.obstaclesDestroyed} obstacles destroyed`,
            modalX + padding,
            currentY
        );

        currentY += padding * 1.5;

        // Input field
        const inputWidth = modalWidth - (padding * 2);
        const inputHeight = 40;
        const inputX = modalX + padding;

        if (!this.nameInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 15;
            input.placeholder = 'Enter your username';
            
            const canvasRect = this.canvas.getBoundingClientRect();
            const scaledX = canvasRect.left + (inputX * canvasRect.width / this.canvas.width);
            const scaledY = canvasRect.top + (currentY * canvasRect.height / this.canvas.height);
            
            const scaledWidth = inputWidth * canvasRect.width / this.canvas.width;
            const scaledHeight = inputHeight * canvasRect.height / this.canvas.height;
            
            input.style.cssText = `
                position: absolute;
                left: ${scaledX}px;
                top: ${scaledY}px;
                width: ${scaledWidth}px;
                height: ${scaledHeight}px;
                font-size: 16px;
                border: 1px solid #000000;
                border-radius: 0;
                outline: none;
                padding: 0 12px;
                background: #FFFFFF;
                color: #000000;
                font-family: Arial;
            `;

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.submitHighScore(input.value.trim());
                }
            });

            this.nameInput = input;
            document.body.appendChild(input);
            input.focus();
        }

        currentY += inputHeight + padding;

        // Submit button
        const buttonHeight = 40;
        
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(modalX + padding, currentY, inputWidth, buttonHeight);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            'Submit score',
            modalX + padding + inputWidth/2,
            currentY + buttonHeight/2
        );

        this.submitButton = {
            x: modalX + padding,
            y: currentY,
            width: inputWidth,
            height: buttonHeight,
            enabled: this.nameInput && this.nameInput.value.trim().length > 0
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
            
            // Send high score submission event to Google Analytics
            gtag('event', 'submit_highscore', {
                'score': this.finalScore,
                'player_name': name,
                'obstacles_destroyed': this.obstaclesDestroyed,
                'rank': this.currentRank
            });
            
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

    showScoreModal() {
        const modal = document.createElement('div');
        modal.className = 'score-modal';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 10px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: white;
            padding: 5px 10px;
        `;
        
        closeButton.addEventListener('click', () => {
            modal.remove();
            this.resetGame();  // Reset the game state when modal is closed
        });

        modal.appendChild(closeButton);
        
        // Rest of your existing modal content...
        // ...

        document.body.appendChild(modal);
    }
} 