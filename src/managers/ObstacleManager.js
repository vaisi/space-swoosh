// Add these helper functions at the top of the file
function pointInPolygonOrNearEdge(px, py, vertices, radius) {
    // Check distance to each edge
    for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        const dist = distanceToLine(
            px, py,
            vertices[i].x, vertices[i].y,
            vertices[j].x, vertices[j].y
        );
        if (dist <= radius) return true;
    }

    // If not near any edge, check if point is inside polygon
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        
        const intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

class BaseObstacle {
    constructor(game, x, y, size) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = size;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05; // Adjusted speed
    }

    update() {
        this.rotation += this.rotationSpeed;
        if (this.rotation > Math.PI * 2) this.rotation -= Math.PI * 2;
        if (this.rotation < 0) this.rotation += Math.PI * 2;
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

    update() {
        super.update();
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
        const width = game.canvas.width * 0.5; // Reduced from 0.7 to 0.5 (50% of screen width)
        const height = game.baseUnit * 2;      // Reduced from 3 to 2
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

    update() {
        super.update();
    }
}

class ComplexAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size * 0.8); // Reduce base size by 20%
        this.satellites = [];
        
        // Create 2-4 orbiting satellites
        const satelliteCount = 2 + Math.floor(Math.random() * 3);
        const orbitSpeed = 0.02 + Math.random() * 0.02;
        
        for (let i = 0; i < satelliteCount; i++) {
            this.satellites.push({
                angle: (Math.PI * 2 * i) / satelliteCount,
                distance: size * 1.5, // Reduced from 2 to 1.5
                size: size * 0.25,    // Reduced from 0.3 to 0.25
                speed: orbitSpeed
            });
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
        const dxMain = spacecraft.x - this.x;
        const dyMain = spacecraft.y - this.y;
        const distanceMain = Math.sqrt(dxMain * dxMain + dyMain * dyMain);
        
        // More precise collision for main body
        if (distanceMain < (this.size + spacecraft.radius) * 0.9) { // Slightly smaller hitbox
            return true;
        }

        // Check satellite collisions with proper positions
        return this.satellites.some(satellite => {
            const satX = this.x + Math.cos(satellite.angle) * satellite.distance;
            const satY = this.y + Math.sin(satellite.angle) * satellite.distance;
            
            const dx = satX - spacecraft.x;
            const dy = satY - spacecraft.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance < (satellite.size + spacecraft.radius) * 0.9; // Slightly smaller hitbox
        });
    }

    update() {
        super.update();
        // Update satellite positions
        this.satellites.forEach(satellite => {
            satellite.angle += satellite.speed;
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

    update() {
        super.update();
        this.currentSize += this.growthRate * (1/60);
        if (this.currentSize > this.maxSize) {
            this.currentSize = this.baseSize;
        }
    }
}

class MovingAsteroid extends BaseObstacle {
    constructor(game, x, y, size) {
        super(game, x, y, size * 0.8); // Reduce pentagon size by 20%
        this.speed = game.baseUnit * 2;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.originalX = x;
        this.amplitude = game.canvas.width * 0.3;
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
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Quick circle check first
        if (distance > this.size * 1.5) {
            return false;
        }
        
        // Generate pentagon vertices
        const vertices = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI/2 + this.rotation;
            vertices.push({
                x: this.x + this.size * Math.cos(angle),
                y: this.y + this.size * Math.sin(angle)
            });
        }
        
        return pointInPolygonOrNearEdge(
            spacecraft.x, 
            spacecraft.y, 
            vertices, 
            spacecraft.radius
        );
    }

    update() {
        super.update();
        this.x += this.speed * this.direction * (1/60);
        
        // Reverse direction at boundaries
        if (Math.abs(this.x - this.originalX) > this.amplitude) {
            this.direction *= -1;
        }
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

class BlackHoleObstacle extends BaseObstacle {
    constructor(game, x, y, size, isAdvanced = false) {
        super(game, x, y, size * (isAdvanced ? 2 : 1.5));
        this.pulsePhase = 0;
        this.pulseSpeed = 0.03;
        this.isAdvanced = isAdvanced;
        this.gravitationalForce = game.baseUnit * (isAdvanced ? 0.15 : 0.08);
        this.influenceRadius = this.size * (isAdvanced ? 5 : 4);
        // Add more rings but make them closer together
        this.rings = Array(4).fill(0).map((_, i) => ({
            phase: (i * Math.PI * 2) / 4, // Evenly space ring phases
            radius: this.size * (1.2 + i * 0.3) // Rings closer together
        }));
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.influenceRadius < 0 || 
            relativeY - this.influenceRadius > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);

        // Draw pulsing rings
        this.rings.forEach((ring, i) => {
            const ringPhase = this.pulsePhase + ring.phase;
            const pulseScale = 1 + Math.sin(ringPhase) * 0.2;
            const opacity = 0.4 - (i * 0.06); // Darker rings that fade out more gradually

            ctx.beginPath();
            ctx.arc(0, 0, ring.radius * pulseScale, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.lineWidth = this.size * 0.05; // Thinner lines
            ctx.stroke();
        });

        // Draw core
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.isAdvanced ? '#1a0033' : '#000000';
        ctx.fill();

        ctx.restore();
    }

    update() {
        super.update();
        this.pulsePhase += this.pulseSpeed;
        
        // Apply gentler gravitational pull with smoother falloff
        const dx = this.game.spacecraft.x - this.x;
        const dy = this.game.spacecraft.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.influenceRadius) {
            // Add smooth falloff curve
            const falloff = Math.pow(1 - distance / this.influenceRadius, 2);
            const force = this.gravitationalForce * falloff;
            const angle = Math.atan2(dy, dx);
            
            this.game.spacecraft.x -= Math.cos(angle) * force;
            this.game.spacecraft.y -= Math.sin(angle) * force;
        }
    }
}

// Add new Wormhole class
class WormholeGate extends BaseObstacle {
    constructor(game, x, y, size, isExit = false) {
        super(game, x, y, size);
        this.isExit = isExit;
        this.pulsePhase = 0;
        this.pulseSpeed = 0.02;
        this.dashOffset = 0;
        this.active = true;
        this.paired = false;
        this.partner = null;
        // Add safe zone radius
        this.safeZoneRadius = size * 1.2;
    }

    // Override collision check to always return false
    checkCollision() {
        return false;
    }

    // Separate method to check if a point is in the safe zone
    isInSafeZone(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.safeZoneRadius;
    }

    update() {
        super.update();
        this.pulsePhase += this.pulseSpeed;
        this.dashOffset += 1;
    }

    checkTeleport(spacecraft) {
        if (this.isExit || !this.active || this.paired) return;

        const dx = spacecraft.x - this.x;
        const dy = spacecraft.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.size * 0.8) {
            this.transportSpacecraft(spacecraft);
        }
    }

    transportSpacecraft(spacecraft) {
        if (!this.partner) {
            this.partner = this.game.obstacleManager.obstacles.find(
                obs => obs instanceof WormholeGate && 
                      obs.isExit && 
                      obs.y < this.y && 
                      !obs.paired
            );
        }

        if (this.partner) {
            console.log('Transporting through wormhole');
            this.paired = true;
            this.partner.paired = true;
            
            spacecraft.isVisible = false;
            this.active = false;
            
            setTimeout(() => {
                spacecraft.x = this.partner.x;
                spacecraft.y = this.partner.y;
                spacecraft.isVisible = true;
                this.partner.pulsePhase = 0;

                // Debug log
                console.log('Attempting to activate shield on spacecraft:', spacecraft);
                
                // Try to activate shield directly on the game's spacecraft instance
                this.game.spacecraft.activateShield();
                this.game.soundManager?.playShield?.();
                
                // Debug log
                console.log('Shield activation attempted');
            }, 300);
        }
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        ctx.save();
        ctx.translate(this.x, relativeY);

        // Simple pulsing effect
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
        
        // Draw rotating dashed circle
        ctx.beginPath();
        ctx.arc(0, 0, this.size * pulseScale, 0, Math.PI * 2);
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = this.dashOffset;
        
        // Color based on state
        if (this.paired) {
            ctx.strokeStyle = '#666666'; // Gray out used gates
        } else {
            ctx.strokeStyle = this.isExit ? '#00ff00' : '#0000ff';
        }
        
        ctx.lineWidth = this.size * 0.1;
        ctx.stroke();

        ctx.restore();
    }
}

export class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = [];
        this.nextSpawnY = 0;
        
        // Define progression with clear unlock points
        this.obstacleTypes = {
            'simple': {
                weight: 0.6,
                unlockScore: 0, // Available from start
                message: 'Watch out for asteroids!'
            },
            'complex': {
                weight: 0.1,
                unlockScore: 2000, // When complex asteroids start appearing
                message: 'Warning: Asteroids with orbiting debris detected!'
            },
            'belt': {
                weight: 0.1,
                unlockScore: 7000, // Earlier unlock (was 10000)
                message: 'Dense asteroid field ahead!'
            },
            'moving': {
                weight: 0.1,
                unlockScore: 4000, // Earlier unlock (was 15000)
                message: 'Caution: Moving asteroids detected!'
            },
            'pulsating': {
                weight: 0.05,
                unlockScore: 10000, // Earlier unlock (was 20000)
                message: 'Warning: Unstable asteroids ahead!'
            },
            'wormhole': {
                weight: 0.05,
                unlockScore: 15000, // Earlier unlock (was 25000)
                message: 'Spatial anomalies detected!'
            }
        };
        
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
        this.pauseSpawning = false;

        this.minVerticalGap = game.canvas.height * 0.25;  // Reduced from 0.35
        this.maxVerticalGap = game.canvas.height * 0.4;   // Reduced from 0.5
    }

    hasPlayerMoved() {
        return this.movementHistory.left || this.movementHistory.right;
    }

    trackMovement(direction) {
        this.movementHistory[direction] = true;
    }

    update(remainingDistance) {
        // Faster difficulty increase
        const progress = 1 - (remainingDistance / this.game.TOTAL_DISTANCE);
        const difficultyMultiplier = 1 + (progress * 2.5); // Increased from 2
        
        const currentDistance = Math.abs(this.game.camera.totalDistance);
        
        // Debug log (simplified)
        console.log('Update cycle:', {
            distance: currentDistance,
            obstacles: this.obstacles.length,
            tutorialPhase: this.tutorialPhase,
            inCutscene: this.inCutscene
        });

        // Tutorial phase handling
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
            const spacing = this.minVerticalGap + Math.random() * (this.maxVerticalGap - this.minVerticalGap);
            this.nextSpawnY -= spacing;
            this.spawnObstacleRow();
        }

        // First check for wormhole teleports
        const wormholes = this.obstacles.filter(obs => obs instanceof WormholeGate);
        wormholes.forEach(wormhole => {
            if (!wormhole.isExit && !wormhole.paired) {
                const dx = this.game.spacecraft.x - wormhole.x;
                const dy = this.game.spacecraft.y - wormhole.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < wormhole.size * 0.8) {
                    wormhole.transportSpacecraft(this.game.spacecraft);
                }
            }
        });

        // Then check collisions with other obstacles, respecting wormhole safe zones
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle instanceof WormholeGate) return true;

            // Check if spacecraft is in any wormhole's safe zone
            const inSafeZone = wormholes.some(wormhole => 
                wormhole.isInSafeZone(this.game.spacecraft.x, this.game.spacecraft.y)
            );

            // If in safe zone, ignore collisions
            if (inSafeZone) return true;

            if (obstacle.checkCollision(this.game.spacecraft)) {
                if (this.game.spacecraft.shieldActive) {
                    // Play shield crash sound
                    this.game.soundManager.playShieldCrash();
                    
                    // Create destruction particles
                    this.destructionParticles.push(
                        ...obstacle.createDestructionParticles()
                    );
                    // Add score popup
                    this.showScorePopup(obstacle.x, obstacle.y, 10);
                    // Add score
                    this.game.score += 10;
                    this.game.obstaclesDestroyed++; // Increment counter
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

        // Spawn new obstacles
        if (!this.inCutscene && this.obstacles.length < 7) { // Increased from 6
            const minSpawnInterval = this.game.canvas.height * 0.35; // Reduced from 0.4
            
            if (!this.lastSpawnY || 
                this.nextSpawnY - this.lastSpawnY >= minSpawnInterval) {
                this.lastSpawnY = this.nextSpawnY;
                this.spawnObstacleRow();
            }
        }
        
        // Update and filter obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.update) {
                obstacle.update();
            }
            return obstacle.y > this.game.camera.y - this.game.canvas.height * 1.5;
        });

        // Update available types based on score
        this.updateAvailableTypes(this.game.score);
    }

    showTutorialMessage(message) {
        // Add tutorial message to milestone manager
        this.game.milestoneManager.showMessage(message);
    }

    getDifficultyMultiplier() {
        const config = this.game.config.obstacles.scaling;
        // Moderate difficulty increase
        const progress = Math.min(this.game.score / (config.rampUpDistance * 1.2), 1);
        return config.startDensity + (config.maxDensity - config.startDensity) * Math.pow(progress, 1.2); // Less gradual curve
    }

    updateAvailableTypes(distance) {
        Object.entries(this.obstacleTypes).forEach(([type, data]) => {
            // Add debug logging
            console.log(`Checking ${type}: distance=${distance}, unlockScore=${data.unlockScore}, has=${this.availableTypes.has(type)}`);
            
            if (distance >= data.unlockScore && !this.availableTypes.has(type)) {
                console.log(`Unlocking new type: ${type} at distance ${distance}`);
                this.availableTypes.add(type);
                this.game.milestoneManager.showMessage(data.message);
                this.normalizeWeights();
            }
        });
    }

    normalizeWeights() {
        const availableCount = this.availableTypes.size;
        
        Object.keys(this.obstacleTypes).forEach(type => {
            if (this.availableTypes.has(type)) {
                if (type === 'simple') {
                    this.obstacleTypes[type].weight = 0.6; // Simple obstacles are most common
                } else if (type === 'wormhole') {
                    this.obstacleTypes[type].weight = 0.1; // Rare wormholes
                } else {
                    // Distribute remaining 30% among other types
                    this.obstacleTypes[type].weight = 0.3 / (availableCount - 2);
                }
            }
        });
    }

    spawnObstacleRow() {
        const availableTypesArray = Array.from(this.availableTypes);
        const difficultyMultiplier = this.getDifficultyMultiplier();
        
        // More balanced distribution of obstacle counts
        const spawnCount = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
        
        if (spawnCount === 1) {
            // Single obstacle - can be any type
            const type = this.selectObstacleType(availableTypesArray);
            if (type === 'simple') {
                // For simple asteroids, spawn a cluster
                this.spawnSimpleAsteroids(difficultyMultiplier);
            } else {
                // For other types, position randomly but avoid edges
                const margin = 0.2; // 20% margin from edges
                const xPos = margin + Math.random() * (1 - margin * 2);
                this.spawnObstacleByType(type, xPos, xPos + 0.2);
            }
        } else {
            // Multiple obstacles - mix types and ensure good spacing
            const positions = this.generateSpawnPositions(spawnCount);
            let lastType = null;
            
            positions.forEach(pos => {
                const type = this.selectObstacleType(availableTypesArray);
                // Prevent same complex type spawning next to each other
                if (type !== 'simple' && type === lastType) {
                    this.spawnSimpleAsteroids(difficultyMultiplier / 2, pos.start, pos.end);
                } else {
                    if (type === 'simple') {
                        this.spawnSimpleAsteroids(difficultyMultiplier / 2, pos.start, pos.end);
                    } else {
                        this.spawnObstacleByType(type, pos.start, pos.end);
                    }
                    lastType = type;
                }
            });
        }
    }

    generateSpawnPositions(count) {
        const positions = [];
        const totalSpace = 0.8; // Leave 10% margin on each side
        const segmentSize = totalSpace / count;
        const jitter = segmentSize * 0.2; // Reduced from 0.3 for more consistent spacing
        
        for (let i = 0; i < count; i++) {
            const baseStart = 0.1 + (i * segmentSize);
            const start = baseStart + (Math.random() * jitter * 2 - jitter);
            const end = start + (segmentSize * 0.5); // Reduced from 0.6 for better spacing
            positions.push({ start, end });
        }
        
        return positions;
    }

    spawnObstacleByType(type, startX = 0, endX = 1) {
        const x = startX * this.game.canvas.width;
        const width = (endX - startX) * this.game.canvas.width;
        
        switch(type) {
            case 'wormhole':
                this.spawnWormhole(x, width);
                break;
            case 'simple':
                this.spawnSimpleAsteroids(this.getDifficultyMultiplier(), startX, endX);
                break;
            case 'complex':
                this.spawnComplexAsteroid(x, width);
                break;
            case 'belt':
                this.spawnAsteroidBelt(x, width);
                break;
            case 'moving':
                this.spawnMovingAsteroid(x, width);
                break;
            case 'pulsating':
                this.spawnPulsatingAsteroid(x, width);
                break;
        }
    }

    spawnAsteroidBelt(x, width) {
        this.obstacles.push(new AsteroidBelt(
            this.game,
            this.nextSpawnY
        ));
    }

    spawnComplexAsteroid(x, width) {
        // Reduce size by 20%
        const baseSize = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        const size = baseSize * 0.8; // 20% smaller
        
        const margin = size * 3;
        const position = this.findValidPosition(
            size * 2.5, // Increased collision check radius for satellites
            margin,
            this.game.canvas.width - margin,
            this.nextSpawnY,
            15 // Increased max attempts to find valid position
        );
        
        if (position) {
            this.obstacles.push(new ComplexAsteroid(
                this.game,
                position.x,
                position.y,
                size
            ));
        }
    }

    spawnSimpleAsteroids(difficultyMultiplier, startX = 0, endX = 1) {
        // Start with more asteroids
        const baseCount = 2 + Math.floor(this.game.score / 8000); // Start with 2, increase faster
        const count = Math.min(
            baseCount + Math.floor(Math.random() * difficultyMultiplier),
            4
        );
        
        // Slightly tighter spacing for more challenge
        const sections = count + 1.2; // Reduced from 1.5
        const sectionWidth = this.game.canvas.width / sections;
        
        for (let i = 0; i < count; i++) {
            const size = this.game.baseUnit * (0.9 + Math.random() * 0.5);
            const minX = sectionWidth * (i + 0.6); // Adjusted spacing
            const maxX = sectionWidth * (i + 1.6);
            
            const position = this.findValidPosition(size, minX, maxX, this.nextSpawnY);
            if (position) {
                this.obstacles.push(new SimpleAsteroid(
                    this.game,
                    position.x,
                    position.y,
                    size
                ));
            }
        }
    }

    spawnPulsatingAsteroid(x, width) {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        this.obstacles.push(new PulsatingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnMovingAsteroid(x, width) {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        this.obstacles.push(new MovingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnShootingAsteroid(x, width) {
        const size = this.game.config.obstacles.minSize * this.game.baseUnit +
            Math.random() * (this.game.config.obstacles.maxSize - this.game.config.obstacles.minSize) * this.game.baseUnit;
        
        this.obstacles.push(new ShootingAsteroid(
            this.game,
            x,
            this.nextSpawnY,
            size
        ));
    }

    spawnComet(x, width) {
        // Spawn comet at random height near the player
        const y = this.game.camera.y - (Math.random() * this.game.canvas.height * 0.5);
        this.obstacles.push(new CometObstacle(this.game, y));
    }

    spawnBlackHole(x, width) {
        const size = this.game.baseUnit * 3;
        const margin = size * 4;
        // Use the passed x parameter or calculate a position if score is low
        const finalX = this.game.score < 100 ? 
            this.game.canvas.width / 2 : 
            x;
        
        const blackHole = new BlackHoleObstacle(
            this.game,
            finalX,
            this.nextSpawnY,
            size,
            this.game.score > 1000 // isAdvanced
        );
        
        this.obstacles.push(blackHole);
    }

    spawnWormhole(x, width) {
        console.log('Spawning wormhole pair');
        const size = this.game.baseUnit * 2;
        const margin = size * 4;
        
        // Entry gate in bottom half of screen with obstacles around it
        const entryX = margin + Math.random() * (this.game.canvas.width - margin * 2);
        const entry = new WormholeGate(this.game, entryX, this.nextSpawnY, size, false);
        
        // Spawn obstacles around the entry gate, but respect safe zone
        const obstacleCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < obstacleCount; i++) {
            const angle = (Math.PI * 2 * i) / obstacleCount;
            const distance = this.game.baseUnit * (8 + Math.random() * 2); // Increased minimum distance
            const obstacleX = entryX + Math.cos(angle) * distance;
            const obstacleY = this.nextSpawnY + Math.sin(angle) * distance;
            
            // Only spawn if within screen bounds and outside safe zone
            if (obstacleX > margin && 
                obstacleX < this.game.canvas.width - margin) {
                const obstacle = new SimpleAsteroid(
                    this.game,
                    obstacleX,
                    obstacleY,
                    this.game.baseUnit * (1 + Math.random())
                );
                this.obstacles.push(obstacle);
            }
        }
        
        // Exit gate higher up
        const exitY = this.nextSpawnY - this.game.canvas.height * 0.8;
        const exitX = margin + Math.random() * (this.game.canvas.width - margin * 2);
        const exit = new WormholeGate(this.game, exitX, exitY, size, true);
        
        // Link the gates
        entry.partner = exit;
        exit.partner = entry;
        
        this.obstacles.push(entry, exit);
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

    checkOverlap(x, y, size, existingObstacles) {
        // More forgiving overlap detection
        const minDistance = size * 2; // Reduced from 3
        
        return existingObstacles.some(obstacle => {
            const dx = x - obstacle.x;
            const dy = y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minAllowedDistance = size + obstacle.size * 1.5; // Reduced from 2
            
            return distance < minAllowedDistance;
        });
    }

    findValidPosition(size, minX, maxX, baseY, maxAttempts = 5) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = minX + Math.random() * (maxX - minX);
            const verticalOffset = (Math.random() - 0.5) * this.game.canvas.height * 0.15;
            const y = baseY + verticalOffset;
            
            if (!this.checkOverlap(x, y, size, this.obstacles)) {
                return { x, y };
            }
        }
        // If we can't find a non-overlapping position, just return the last attempted position
        const x = minX + Math.random() * (maxX - minX);
        const verticalOffset = (Math.random() - 0.5) * this.game.canvas.height * 0.15;
        const y = baseY + verticalOffset;
        return { x, y };
    }

    selectObstacleType(types) {
        // Slightly higher chance for variety
        if (Math.random() < 0.65 && types.includes('simple')) { // Reduced from 0.7
            return 'simple';
        }
        
        // Filter out 'simple' type for other selections
        const otherTypes = types.filter(type => type !== 'simple');
        if (otherTypes.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherTypes.length);
            return otherTypes[randomIndex];
        }
        
        return 'simple';
    }
} 