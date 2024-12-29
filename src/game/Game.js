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
        const isMobile = window.innerWidth <= 768;
        const spacing = isMobile ? this.baseUnit * 3 : this.baseUnit * 4; // Reduced spacing for mobile
        let currentY = isMobile ? this.canvas.height * 0.2 : this.canvas.height * 0.25; // Higher start on mobile

        // Game Over Title - smaller on mobile
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${isMobile ? this.baseUnit * 3 : this.baseUnit * 4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.hasWon ? 'MISSION COMPLETE!' : 'GAME OVER',
            centerX,
            currentY
        );
        
        currentY += spacing * 1.5;

        // Score display - smaller on mobile
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

        // Debug log for high score status
        //console.log('Pending high score:', this.pendingHighScore);

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

        // Button positioning and sizing
        const buttonY = isMobile ? this.canvas.height * 0.7 : currentY + spacing * 2;
        const buttonWidth = isMobile ? 
            Math.min(this.baseUnit * 10, this.canvas.width / 2.5) : 
            Math.min(this.baseUnit * 12, this.canvas.width / 3);
        const buttonHeight = isMobile ? this.baseUnit * 4 : this.baseUnit * 3;
        const buttonSpacing = isMobile ? this.baseUnit : this.baseUnit * 2;
        
        // Center buttons horizontally with proper spacing
        const totalWidth = (buttonWidth * 2) + buttonSpacing;
        const startX = (this.canvas.width - totalWidth) / 2;

        // Draw buttons
        this.drawButton(
            startX,
            buttonY,
            buttonWidth,
            buttonHeight,
            'Play Again',
            '#4CAF50'
        );

        this.drawButton(
            startX + buttonWidth + buttonSpacing,
            buttonY,
            buttonWidth,
            buttonHeight,
            'High Scores',
            '#2196F3'
        );

        // Update button hitboxes
        this.gameOverButtons = {
            playAgain: {
                x: startX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            },
            highScores: {
                x: startX + buttonWidth + buttonSpacing,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            }
        };
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

        // High Scores title
        this.ctx.fillStyle = '#E1D9C1';
        this.ctx.font = `bold ${isMobile ? this.baseUnit * 2 : this.baseUnit * 2.5}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'High Scores',
            this.canvas.width / 2,
            padding + buttonHeight
        );

        // Scrollable area for scores
        const scoreAreaTop = padding + buttonHeight * 2;
        const scoreAreaBottom = this.canvas.height - padding;
        const scoreAreaHeight = scoreAreaBottom - scoreAreaTop;
        
        // Calculate visible scores
        const scoreHeight = this.baseUnit * 2;
        const visibleScores = Math.floor(scoreAreaHeight / scoreHeight);
        
        // Draw scores
        this.ctx.font = `${isMobile ? this.baseUnit * 1.2 : this.baseUnit * 1.5}px Arial`;
        this.ctx.textAlign = 'left';
        
        // Create clipping region for scrollable area
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(padding, scoreAreaTop, this.canvas.width - padding * 2, scoreAreaHeight);
        this.ctx.clip();

        // Draw all scores with scroll offset
        const scrollOffset = this.highScoreScrollOffset || 0;
        this.highScores.slice(0, 100).forEach((score, index) => {
            const y = scoreAreaTop + (index * scoreHeight) - scrollOffset;
            
            // Only draw if within visible area
            if (y >= scoreAreaTop - scoreHeight && y <= scoreAreaBottom) {
                const rank = `${index + 1}.`;
                const name = score.player_name || 'Anonymous';
                const scoreText = ScoreService.formatScore(score.score);
                
                // Rank
                this.ctx.textAlign = 'right';
                this.ctx.fillText(rank, padding + this.baseUnit * 3, y);
                
                // Name
                this.ctx.textAlign = 'left';
                this.ctx.fillText(name, padding + this.baseUnit * 4, y);
                
                // Score
                this.ctx.textAlign = 'right';
                this.ctx.fillText(scoreText, this.canvas.width - padding, y);
            }
        });
        
        this.ctx.restore();

        // Add scroll handling
        if (!this.scrollHandlerAdded) {
            this.canvas.addEventListener('wheel', (e) => {
                if (this.gameOverScreen === 'highscores') {
                    e.preventDefault();
                    const maxScroll = Math.max(0, (this.highScores.length * scoreHeight) - scoreAreaHeight);
                    this.highScoreScrollOffset = Math.min(Math.max(0, 
                        (this.highScoreScrollOffset || 0) + e.deltaY), maxScroll);
                }
            });
            
            // Add touch scroll handling for mobile
            let touchStartY = 0;
            this.canvas.addEventListener('touchstart', (e) => {
                if (this.gameOverScreen === 'highscores') {
                    touchStartY = e.touches[0].clientY;
                }
            });
            
            this.canvas.addEventListener('touchmove', (e) => {
                if (this.gameOverScreen === 'highscores') {
                    const deltaY = touchStartY - e.touches[0].clientY;
                    const maxScroll = Math.max(0, (this.highScores.length * scoreHeight) - scoreAreaHeight);
                    this.highScoreScrollOffset = Math.min(Math.max(0, 
                        (this.highScoreScrollOffset || 0) + deltaY), maxScroll);
                    touchStartY = e.touches[0].clientY;
                }
            });

            this.scrollHandlerAdded = true;
        }
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
            this.soundManager.playCrash();  // Play crash sound first
            this.soundManager.playExplosion();  // Then play explosion
            this.isGameOver = true;
            this.gameOverStartTime = performance.now();
            this.finalScore = this.score;
            
            try {
                const topScores = await ScoreService.getTopScores();
                this.pendingHighScore = {
                    score: this.score,
                    obstaclesDestroyed: this.obstaclesDestroyed,
                    isWinner: this.hasWon
                };
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
        const handleInteraction = async (clientX, clientY) => {
            if (!this.isGameOver) return; // Only handle if game is over

            // Only allow interaction after explosion animation
            const timeSinceGameOver = performance.now() - this.gameOverStartTime;
            if (timeSinceGameOver < this.config.camera.deceleration) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = (clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (clientY - rect.top) * (this.canvas.height / rect.height);

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
        };

        // Mouse click handler
        this.canvas.addEventListener('click', async (e) => {
            handleInteraction(e.clientX, e.clientY);
        });

        // Touch handler for game over screen
        this.canvas.addEventListener('touchend', async (e) => {
            if (!this.isGameOver) return; // Only handle if game is over
            e.preventDefault();
            const touch = e.changedTouches[0];
            handleInteraction(touch.clientX, touch.clientY);
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

        // Add spacebar listener for pause
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                this.togglePause();
            }
        });
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
} 