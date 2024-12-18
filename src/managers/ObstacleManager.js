class BaseObstacle {
    constructor(game, x, y, size) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = size;
        this.rotation = 0;
        this.rotationSpeed = Math.random() * 
            (game.config.obstacles.rotationRange[1] - game.config.obstacles.rotationRange[0]) + 
            game.config.obstacles.rotationRange[0];
    }

    update() {
        this.rotation += this.rotationSpeed;
    }

    checkCollision(spacecraft) {
        const dx = this.x - spacecraft.x;
        const dy = this.y - spacecraft.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + spacecraft.radius);
    }

    createDestructionParticles() {
        const particles = [];
        const particleCount = 10;
        const baseSpeed = this.game.baseUnit * 0.5;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = baseSpeed * (2 + Math.random() * 3);
            particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: this.size * (0.1 + Math.random() * 0.2),
                opacity: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
        return particles;
    }
}

class SimpleAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size);
        // Randomly choose a shape type
        this.shapeType = ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)];
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.size < 0 || relativeY - this.size > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        ctx.beginPath();

        switch(this.shapeType) {
            case 'circle':
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                break;
            case 'triangle':
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size * Math.cos(Math.PI/6), this.size * Math.sin(Math.PI/6));
                ctx.lineTo(-this.size * Math.cos(Math.PI/6), this.size * Math.sin(Math.PI/6));
                break;
            case 'square':
                const halfSize = this.size * 0.7; // Slightly smaller to match other shapes' area
                ctx.rect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
                break;
        }

        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.restore();
    }

    checkCollision(spacecraft) {
        // First do a quick circle-based check for performance
        const dx = spacecraft.x - this.x;
        const dy = spacecraft.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.size + spacecraft.radius) {
            return false; // Definitely no collision
        }

        // For circle, we're done
        if (this.shapeType === 'circle') {
            return true;
        }

        // For closer objects, do precise shape collision
        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        const rotX = dx * cosR - dy * sinR;
        const rotY = dx * sinR + dy * cosR;

        if (this.shapeType === 'square') {
            // Square collision
            const halfSize = this.size * 0.7;
            return Math.abs(rotX) <= halfSize + spacecraft.radius && 
                   Math.abs(rotY) <= halfSize + spacecraft.radius;
        } else {
            // Triangle collision (using existing logic)
            const vertices = [
                { x: 0, y: -this.size },
                { x: this.size * Math.cos(Math.PI/6), y: this.size * Math.sin(Math.PI/6) },
                { x: -this.size * Math.cos(Math.PI/6), y: this.size * Math.sin(Math.PI/6) }
            ];
            return pointInTriangleOrNearEdge(
                rotX, rotY, vertices[0], vertices[1], vertices[2], spacecraft.radius
            );
        }
    }
}

// Add this helper function at the file level
function pointInTriangleOrNearEdge(px, py, v1, v2, v3, radius) {
    // Check distance to each edge
    const distToEdge1 = distanceToLine(px, py, v1.x, v1.y, v2.x, v2.y);
    const distToEdge2 = distanceToLine(px, py, v2.x, v2.y, v3.x, v3.y);
    const distToEdge3 = distanceToLine(px, py, v3.x, v3.y, v1.x, v1.y);

    // If point is close to any edge, it's a collision
    if (distToEdge1 <= radius || distToEdge2 <= radius || distToEdge3 <= radius) {
        return true;
    }

    // Otherwise check if point is inside triangle
    let d1 = sign(px, py, v1.x, v1.y, v2.x, v2.y);
    let d2 = sign(px, py, v2.x, v2.y, v3.x, v3.y);
    let d3 = sign(px, py, v3.x, v3.y, v1.x, v1.y);

    let hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    let hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
    return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

class AsteroidBelt extends BaseObstacle {
    constructor(game, y) {
        const width = game.canvas.width * 0.7; // 70% of screen width
        const height = game.baseUnit * 3;
        super(game, game.canvas.width / 2, y, Math.max(width, height) / 2);
        
        this.width = width;
        this.height = height;
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.height < 0 || relativeY - this.height > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(spacecraft) {
        // Transform spacecraft position relative to rotated ellipse
        const dx = spacecraft.x - this.x;
        const dy = this.game.camera.getRelativeY(spacecraft.y) - this.game.camera.getRelativeY(this.y);
        
        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        
        const xRot = dx * cosR - dy * sinR;
        const yRot = dx * sinR + dy * cosR;
        
        // Check if point is inside ellipse
        return (Math.pow(xRot, 2) / Math.pow(this.width/2, 2) + 
                Math.pow(yRot, 2) / Math.pow(this.height/2, 2)) <= 1;
    }
}

class ComplexAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size);
        this.satellites = [];
        
        // Create 2-4 orbiting satellites
        const satelliteCount = 2 + Math.floor(Math.random() * 3);
        // Single random speed for all satellites
        const orbitSpeed = 0.02 + Math.random() * 0.02;
        
        for (let i = 0; i < satelliteCount; i++) {
            this.satellites.push({
                angle: (Math.PI * 2 * i) / satelliteCount,
                distance: size * 2,
                size: size * 0.3,
                speed: orbitSpeed  // Same speed for all satellites
            });
        }
    }

    update() {
        super.update();
        // Update satellite positions
        this.satellites.forEach(satellite => {
            satellite.angle += satellite.speed;
        });
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.size < 0 || relativeY - this.size > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        
        // Draw a diamond
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        // Draw satellites
        this.satellites.forEach(satellite => {
            const satX = Math.cos(satellite.angle) * satellite.distance;
            const satY = Math.sin(satellite.angle) * satellite.distance;
            
            ctx.beginPath();
            ctx.arc(satX, satY, satellite.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }

    checkCollision(spacecraft) {
        // Check main asteroid collision with proper radius
        const dxMain = this.x - spacecraft.x;
        const dyMain = this.y - spacecraft.y;
        const distanceMain = Math.sqrt(dxMain * dxMain + dyMain * dyMain);
        if (distanceMain < (this.size + spacecraft.radius)) {
            return true;
        }

        // Check satellite collisions with proper positions
        return this.satellites.some(satellite => {
            const satX = this.x + Math.cos(satellite.angle) * satellite.distance;
            const satY = this.y + Math.sin(satellite.angle) * satellite.distance;
            
            const dx = satX - spacecraft.x;
            const dy = satY - spacecraft.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only check collision with the satellite circle itself
            return distance < (satellite.size + spacecraft.radius);
        });
    }
}

class PulsatingAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size);
        this.baseSize = size;
        this.growthRate = 0.5; // Size increase per second
        this.maxSize = size * 2;
        this.currentSize = size;
    }

    update() {
        super.update();
        this.currentSize += this.growthRate * (1/60);
        if (this.currentSize > this.maxSize) {
            this.currentSize = this.baseSize;
        }
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.currentSize < 0 || relativeY - this.currentSize > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.currentSize, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(spacecraft) {
        const dx = this.x - spacecraft.x;
        const dy = this.y - spacecraft.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.currentSize + spacecraft.radius);
    }
}

class MovingAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size);
        this.speed = game.baseUnit * 2; // Horizontal movement speed
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.originalX = x;
        this.amplitude = game.canvas.width * 0.3; // Movement range
    }

    update() {
        super.update();
        this.x += this.speed * this.direction * (1/60);
        
        // Reverse direction at boundaries
        if (Math.abs(this.x - this.originalX) > this.amplitude) {
            this.direction *= -1;
        }
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.size < 0 || relativeY - this.size > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        
        // Draw a pentagon
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI/2;
            const x = this.size * Math.cos(angle);
            const y = this.size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.restore();
    }

    checkCollision(spacecraft) {
        const dx = spacecraft.x - this.x;
        const dy = spacecraft.y - this.y;
        
        // Rotate point to match pentagon orientation
        const cosR = Math.cos(-this.rotation);
        const sinR = Math.sin(-this.rotation);
        const rotX = dx * cosR - dy * sinR;
        const rotY = dx * sinR + dy * cosR;
        
        // Pentagon bounds (approximation using regular pentagon)
        const radius = this.size;
        const angle = Math.atan2(rotY, rotX);
        const angleStep = (2 * Math.PI) / 5;
        const currentSegment = Math.floor((angle + Math.PI) / angleStep);
        const nextSegment = (currentSegment + 1) % 5;
        
        const x1 = radius * Math.cos(currentSegment * angleStep);
        const y1 = radius * Math.sin(currentSegment * angleStep);
        const x2 = radius * Math.cos(nextSegment * angleStep);
        const y2 = radius * Math.sin(nextSegment * angleStep);
        
        // Distance from point to line segment
        const distance = pointToLineDistance(rotX, rotY, x1, y1, x2, y2);
        return distance < spacecraft.radius;
    }
}

// Helper function for polygon collision detection
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

class ShootingAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size);
        this.projectiles = [];
        this.shootInterval = 2000; // Shoot every 2 seconds
        this.lastShootTime = performance.now();
        this.projectileSpeed = game.baseUnit * 3;
        this.projectileSize = size * 0.2;
    }

    update() {
        super.update();
        const currentTime = performance.now();
        
        // Shoot new projectile
        if (currentTime - this.lastShootTime > this.shootInterval) {
            const angle = Math.random() * Math.PI * 2;
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * this.projectileSpeed,
                vy: Math.sin(angle) * this.projectileSpeed
            });
            this.lastShootTime = currentTime;
        }

        // Update projectiles
        this.projectiles = this.projectiles.map(p => ({
            ...p,
            x: p.x + p.vx * (1/60),
            y: p.y + p.vy * (1/60)
        })).filter(p => {
            const relativeY = this.game.camera.getRelativeY(p.y);
            return relativeY > -this.size && relativeY < this.game.canvas.height + this.size;
        });
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.size < 0 || relativeY - this.size > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);
        
        // Draw a star shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const radius = i % 2 === 0 ? this.size : this.size * 0.5;
            const angle = (i * Math.PI / 4);
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        // Draw projectiles with explicit black color
        ctx.restore();
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, this.game.camera.getRelativeY(p.y), this.projectileSize, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';  // Always black projectiles
            ctx.fill();
        });
    }

    checkCollision(spacecraft) {
        // Check main asteroid collision
        if (super.checkCollision(spacecraft)) {
            return true;
        }

        // Check projectile collisions
        return this.projectiles.some(p => {
            const dx = p.x - spacecraft.x;
            const dy = p.y - spacecraft.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (this.projectileSize + spacecraft.radius);
        });
    }
}

class CometObstacle extends BaseObstacle {
    constructor(game, y) {
        const size = game.baseUnit * 1.2;
        // Start from outside the screen
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? -size : game.canvas.width + size;
        super(game, x, y, size);
        
        this.speed = game.baseUnit * 15; // Fast!
        this.direction = fromLeft ? 1 : -1;
        this.trailParticles = [];
    }

    update() {
        super.update();
        // Move comet
        this.x += this.speed * this.direction * (1/60);
        
        // Add trail particles
        this.trailParticles.push({
            x: this.x,
            y: this.y,
            size: this.size * 0.5,
            opacity: 1
        });
        
        // Update trail
        this.trailParticles = this.trailParticles
            .map(p => ({
                ...p,
                opacity: p.opacity - 0.05,
                size: p.size * 0.95
            }))
            .filter(p => p.opacity > 0);
        
        return this.isOffScreen();
    }

    isOffScreen() {
        return (this.direction > 0 && this.x > this.game.canvas.width + this.size * 2) ||
               (this.direction < 0 && this.x < -this.size * 2);
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        // Draw trail
        this.trailParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, this.game.camera.getRelativeY(this.y), p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${p.opacity})`;
            ctx.fill();
        });
        
        // Draw comet
        ctx.save();
        ctx.translate(this.x, relativeY);
        
        // Comet head
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        ctx.restore();
    }
}

export class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = [];
        this.nextSpawnY = 0;
        
        // Define default weights and unlock scores if config is missing
        const defaultTypes = {
            simple: { weight: 1, unlockScore: 0 },      // Start with triangles
            belt: { weight: 1, unlockScore: 200 },      // Later than before
            complex: { weight: 1, unlockScore: 300 },    // Later than before
            pulsating: { weight: 1, unlockScore: 400 },  // Later than before
            moving: { weight: 1, unlockScore: 500 },     // Later than before
            shooting: { weight: 1, unlockScore: 600 },   // Later than before
            comet: { weight: 0.3, unlockScore: 700 }    // Later than before
        };

        // Use config types if available, otherwise use defaults
        this.obstacleTypes = this.game.config.obstacles?.types || defaultTypes;
        
        // Start with just simple obstacles
        this.availableTypes = new Set(['simple']);
        
        this.tutorialPhase = true;
        this.tutorialMessages = [
            {
                distance: 25,  // Half of previous distance
                message: "Use LEFT and RIGHT arrows to move in arcs",
                requirement: () => this.hasPlayerMoved(),
                completed: false
            },
            {
                distance: 75,  // Half of previous distance
                message: "Breaking the atmosphere!",
                requirement: () => true,
                completed: false,
                triggerCutscene: true  // New flag for cutscene
            }
        ];
        this.movementHistory = {
            left: false,
            right: false
        };
        this.destructionParticles = [];
        this.lastCometTime = 0;
        this.cometInterval = 9000 + Math.random() * 14000;

        // Add cutscene state
        this.inCutscene = false;
        this.cutsceneStartTime = 0;
        this.cutsceneDuration = 1500; // 1.5 seconds
        this.motionLines = []; // Add motion lines array
    }

    hasPlayerMoved() {
        return this.movementHistory.left || this.movementHistory.right;
    }

    trackMovement(direction) {
        this.movementHistory[direction] = true;
    }

    update() {
        const currentDistance = Math.abs(this.game.camera.totalDistance);
        
        // Tutorial phase (first 75 units instead of 250)
        if (currentDistance < 75) {
            // Track player movements for tutorial
            if (this.game.spacecraft.moveState) {
                this.trackMovement(this.game.spacecraft.moveState.direction);
            }

            // Show tutorial messages
            for (let i = 0; i < this.tutorialMessages.length; i++) {
                const msg = this.tutorialMessages[i];
                if (!msg.completed && 
                    currentDistance >= msg.distance && 
                    (i === 0 || this.tutorialMessages[i-1].completed)) {
                    
                    if (msg.requirement()) {
                        msg.completed = true;
                        if (msg.triggerCutscene) {
                            // Start cutscene
                            this.inCutscene = true;
                            this.cutsceneStartTime = performance.now();
                            this.game.camera.speed *= 3; // Temporarily triple the speed
                            // Create initial motion lines
                            this.createMotionLines();
                        } else if (i < this.tutorialMessages.length - 1) {
                            setTimeout(() => {
                                this.showTutorialMessage(this.tutorialMessages[i + 1].message);
                            }, 1500);
                        }
                    } else if (!this.currentMessage) {
                        this.showTutorialMessage(msg.message);
                    }
                }
            }

            // Handle cutscene effects
            if (this.inCutscene) {
                // Update screen shake
                const progress = (performance.now() - this.cutsceneStartTime) / this.cutsceneDuration;
                const intensity = Math.sin(progress * Math.PI) * 5; // Max 5 pixels shake
                this.game.camera.shake = {
                    x: (Math.random() - 0.5) * intensity,
                    y: (Math.random() - 0.5) * intensity
                };

                // Update motion lines
                this.updateMotionLines();
            }

            // Handle cutscene end
            if (this.inCutscene && performance.now() - this.cutsceneStartTime > this.cutsceneDuration) {
                this.inCutscene = false;
                this.game.camera.speed /= 3;
                this.game.camera.shake = { x: 0, y: 0 }; // Reset shake
                this.motionLines = []; // Clear motion lines
                this.tutorialPhase = false;
                this.nextSpawnY = this.game.camera.y - this.game.canvas.height * 1.5;
            }

            // Don't spawn obstacles during tutorial or cutscene
            if (this.tutorialPhase || this.inCutscene) return;
        }

        // Normal obstacle spawning after tutorial
        if (this.tutorialPhase) {
            this.tutorialPhase = false;
            // Start spawning obstacles just above the screen
            this.nextSpawnY = this.game.camera.y - this.game.canvas.height * 1.5;
        }

        // Regular obstacle spawning logic
        while (this.nextSpawnY > this.game.camera.y - this.game.canvas.height) {
            this.spawnObstacleRow();
            this.nextSpawnY -= this.game.canvas.height * this.game.config.obstacles.verticalSpacing;
        }

        // Update and check collisions for existing obstacles
        this.obstacles.forEach(obstacle => obstacle.update());
        
        // Check collisions with spacecraft
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.checkCollision(this.game.spacecraft)) {
                if (this.game.spacecraft.shieldActive) {
                    // If shield is active, destroy obstacle and add score
                    this.destructionParticles.push(
                        ...obstacle.createDestructionParticles()
                    );
                    // Add score popup
                    this.showScorePopup(obstacle.x, obstacle.y, 10);
                    // Add score
                    this.game.score += 10;
                    return false; // Remove the obstacle
                } else {
                    // If no shield, game over
                    this.game.gameOver();
                }
            }
            return true;
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obstacle => 
            obstacle.y > this.game.camera.y - this.game.canvas.height * 1.5
        );

        // Update destruction particles
        this.destructionParticles = this.destructionParticles
            .map(particle => ({
                ...particle,
                x: particle.x + particle.vx * (1/60),
                y: particle.y + particle.vy * (1/60),
                opacity: particle.opacity - 0.02,
                size: particle.size * 0.98
            }))
            .filter(particle => particle.opacity > 0);

        // Check if it's time to spawn a comet
        const currentTime = performance.now();
        if (currentTime - this.lastCometTime > this.cometInterval) {
            this.spawnComet();
            this.lastCometTime = currentTime;
            // Randomize next comet interval between 9-23 seconds
            this.cometInterval = 9000 + Math.random() * 14000;
        }
    }

    showTutorialMessage(message) {
        // Add tutorial message to milestone manager
        this.game.milestoneManager.showMessage(message);
    }

    getDifficultyMultiplier() {
        const config = this.game.config.obstacles.scaling;
        const progress = Math.min(this.game.score / config.rampUpDistance, 1);
        return config.startDensity + (config.maxDensity - config.startDensity) * progress;
    }

    updateAvailableTypes() {
        const score = this.game.score;
        
        Object.entries(this.obstacleTypes).forEach(([type, settings]) => {
            if (score >= settings.unlockScore) {
                this.availableTypes.add(type);
            }
        });
    }

    spawnObstacleRow() {
        this.updateAvailableTypes();
        
        const availableTypesArray = Array.from(this.availableTypes);
        const weights = availableTypesArray.map(type => this.obstacleTypes[type].weight);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        // Debug log to check distribution
        console.log('Available types:', availableTypesArray);
        console.log('Weights:', weights);
        
        // Simplified random selection
        const random = Math.random();
        let cumulativeProbability = 0;
        
        for (let i = 0; i < availableTypesArray.length; i++) {
            cumulativeProbability += weights[i] / totalWeight;
            if (random <= cumulativeProbability) {
                const selectedType = availableTypesArray[i];
                console.log('Selected type:', selectedType, 'Random:', random, 'Cumulative:', cumulativeProbability);
                
                switch(selectedType) {
                    case 'belt': return this.spawnAsteroidBelt();
                    case 'complex': return this.spawnComplexAsteroid();
                    case 'pulsating': return this.spawnPulsatingAsteroid();
                    case 'moving': return this.spawnMovingAsteroid();
                    case 'shooting': return this.spawnShootingAsteroid();
                    case 'comet': return this.spawnComet();
                    default: return this.spawnSimpleAsteroids(this.getDifficultyMultiplier());
                }
            }
        }
        
        // Fallback to simple asteroid if something goes wrong
        return this.spawnSimpleAsteroids(this.getDifficultyMultiplier());
    }

    spawnAsteroidBelt() {
        this.obstacles.push(new AsteroidBelt(
            this.game,
            this.nextSpawnY
        ));
    }

    spawnComplexAsteroid() {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        const x = size * 3 + Math.random() * (this.game.canvas.width - size * 6);
        
        this.obstacles.push(new ComplexAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnSimpleAsteroids(difficultyMultiplier) {
        // Reduce initial obstacle count and increase gradually
        const progress = Math.min(this.game.score / 500, 1); // Slower difficulty ramp
        const baseCount = 1 + Math.floor(progress); // Start with 1 obstacle
        const count = baseCount + Math.floor(Math.random() * difficultyMultiplier * progress);
        
        for (let i = 0; i < count; i++) {
            const size = this.game.config.obstacles.minSize * this.game.baseUnit +
                Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
            
            const sectionWidth = this.game.canvas.width / count;
            const minX = i * sectionWidth + size;
            const maxX = (i + 1) * sectionWidth - size;
            
            this.obstacles.push(new SimpleAsteroid(
                this.game,
                minX + Math.random() * (maxX - minX),
                this.nextSpawnY,
                size
            ));
        }
    }

    spawnPulsatingAsteroid() {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        const x = size * 2 + Math.random() * (this.game.canvas.width - size * 4);
        
        this.obstacles.push(new PulsatingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnMovingAsteroid() {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        const x = this.game.canvas.width / 2;
        
        this.obstacles.push(new MovingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnShootingAsteroid() {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        const x = size * 2 + Math.random() * (this.game.canvas.width - size * 4);
        
        this.obstacles.push(new ShootingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnComet() {
        // Spawn comet at random height near the player
        const y = this.game.camera.y - (Math.random() * this.game.canvas.height * 0.5);
        this.obstacles.push(new CometObstacle(this.game, y));
    }

    render(ctx) {
        // Apply camera shake if active
        if (this.game.camera.shake) {
            ctx.save();
            ctx.translate(this.game.camera.shake.x, this.game.camera.shake.y);
        }

        // Render obstacles
        this.obstacles.forEach(obstacle => obstacle.render(ctx));

        // Render motion lines during cutscene
        if (this.inCutscene) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            this.motionLines.forEach(line => {
                ctx.moveTo(line.x, line.y);
                ctx.lineTo(line.x, line.y + line.length);
            });
            ctx.stroke();
        }

        // Render destruction particles and score popups
        this.destructionParticles.forEach(particle => {
            if (particle.isScorePopup) {
                // Render score popup
                ctx.save();
                ctx.font = `${particle.size}px Arial`;
                ctx.fillStyle = `rgba(0, 0, 0, ${particle.opacity})`;
                ctx.textAlign = 'center';
                ctx.fillText(
                    particle.text,
                    particle.x,
                    this.game.camera.getRelativeY(particle.y)
                );
                ctx.restore();
            } else {
                // Render normal destruction particle
                ctx.beginPath();
                ctx.arc(
                    particle.x,
                    this.game.camera.getRelativeY(particle.y),
                    particle.size,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = `rgba(0, 0, 0, ${particle.opacity})`;
                ctx.fill();
            }
        });

        if (this.game.camera.shake) {
            ctx.restore();
        }
    }

    showScorePopup(x, y, amount) {
        this.destructionParticles.push({
            x,
            y,
            vy: -2, // Float upward
            vx: 0,
            size: this.game.baseUnit,
            opacity: 1,
            text: `+${amount}`,
            isScorePopup: true
        });
    }

    createMotionLines() {
        const lineCount = 20;
        for (let i = 0; i < lineCount; i++) {
            this.motionLines.push({
                x: Math.random() * this.game.canvas.width,
                y: Math.random() * this.game.canvas.height,
                length: 20 + Math.random() * 30,
                speed: 15 + Math.random() * 10
            });
        }
    }

    updateMotionLines() {
        // Update existing lines
        this.motionLines.forEach(line => {
            line.y += line.speed;
            if (line.y > this.game.canvas.height) {
                line.y = -line.length;
                line.x = Math.random() * this.game.canvas.width;
            }
        });
    }
} 