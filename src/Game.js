constructor(config) {
    // ... other initialization code ...

    // Set up canvas and context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Initialize base unit size
    this.updateGameDimensions();
    
    // Listen for resize events
    window.addEventListener('resize', () => {
        this.updateGameDimensions();
    });
}

updateGameDimensions() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set different base units for mobile and desktop
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Smaller base unit for mobile
        this.baseUnit = Math.min(containerWidth, containerHeight) / 60; // Increased divisor for smaller elements
        
        // Use device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        
        // Scale canvas CSS size
        this.canvas.style.width = `${containerWidth}px`;
        this.canvas.style.height = `${containerHeight}px`;
        
        // Scale context to account for device pixel ratio
        this.ctx.scale(dpr, dpr);
    } else {
        // Original desktop sizing
        this.baseUnit = Math.min(containerWidth, containerHeight) / 40;
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
    }
    
    // Update game dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // Update config values that depend on baseUnit
    this.config.obstacles.minSize = this.baseUnit * 1.5;
    this.config.obstacles.maxSize = this.baseUnit * 2.5;
    this.config.spacecraft.size = this.baseUnit * 1.5;
    
    // Update camera settings
    if (this.camera) {
        this.camera.updateDimensions(this.width, this.height);
    }
} 