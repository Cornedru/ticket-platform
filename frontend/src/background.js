class PsychedelicBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    
    this.mouse = { x: this.width / 2, y: this.height / 2 };
    this.blobs = [];
    this.gridLines = [];
    
    this.initBlobs();
    this.initGrid();
    this.bindEvents();
    this.animate();
  }
  
  initBlobs() {
    const colors = [
      { r: 255, g: 0, b: 255 },    // Magenta
      { r: 0, g: 255, b: 255 },    // Cyan
      { r: 57, g: 255, b: 20 }     // Acid Green
    ];
    
    for (let i = 0; i < 3; i++) {
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 300 + Math.random() * 200,
        color: colors[i],
        opacity: 0.04 + Math.random() * 0.03,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0005 + Math.random() * 0.0005
      });
    }
  }
  
  initGrid() {
    const spacing = 60;
    for (let x = 0; x < this.width + spacing; x += spacing) {
      this.gridLines.push({ x, y: 0, isVertical: true, originalX: x });
    }
    for (let y = 0; y < this.height + spacing; y += spacing) {
      this.gridLines.push({ x: 0, y, isVertical: false, originalY: y });
    }
  }
  
  bindEvents() {
    window.addEventListener('resize', () => {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.initGrid();
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  
  animate() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    const time = Date.now() * 0.001;
    
    // Draw blobs
    this.blobs.forEach(blob => {
      blob.phase += blob.speed;
      
      // Sinusoidal movement
      const waveX = Math.sin(blob.phase) * 50;
      const waveY = Math.cos(blob.phase * 0.7) * 50;
      
      // Mouse attraction
      const dx = this.mouse.x - blob.x;
      const dy = this.mouse.y - blob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.min(0.02, 300 / dist);
      
      blob.x += blob.vx + waveX * 0.01 + dx * force * 0.5;
      blob.y += blob.vy + waveY * 0.01 + dy * force * 0.5;
      
      // Wrap around
      if (blob.x < -blob.radius) blob.x = this.width + blob.radius;
      if (blob.x > this.width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = this.height + blob.radius;
      if (blob.y > this.height + blob.radius) blob.y = -blob.radius;
      
      // Draw blob with blur
      this.ctx.save();
      this.ctx.filter = 'blur(120px)';
      
      const gradient = this.ctx.createRadialGradient(
        blob.x, blob.y, 0,
        blob.x, blob.y, blob.radius
      );
      
      // Chromatic aberration effect
      gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blob.opacity})`);
      gradient.addColorStop(0.5, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, ${blob.opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
    
    // Draw grid
    this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.04)';
    this.ctx.lineWidth = 1;
    
    this.gridLines.forEach(line => {
      const maxWarp = 3;
      const warpX = (this.mouse.x - this.width / 2) / this.width;
      const warpY = (this.mouse.y - this.height / 2) / this.height;
      
      let offsetX = 0, offsetY = 0;
      
      if (line.isVertical) {
        offsetX = warpX * maxWarp * Math.sin(line.originalX * 0.01 + time * 0.5);
      } else {
        offsetY = warpY * maxWarp * Math.sin(line.originalY * 0.01 + time * 0.5);
      }
      
      this.ctx.beginPath();
      
      if (line.isVertical) {
        this.ctx.moveTo(line.originalX + offsetX, 0);
        this.ctx.lineTo(line.originalX + offsetX, this.height);
      } else {
        this.ctx.moveTo(0, line.originalY + offsetY);
        this.ctx.lineTo(this.width, line.originalY + offsetY);
      }
      
      this.ctx.stroke();
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

// Cursor effects
class CursorEffect {
  constructor() {
    this.cursor = document.createElement('div');
    this.cursor.className = 'cursor';
    document.body.appendChild(this.cursor);
    
    this.cursorDot = document.createElement('div');
    this.cursorDot.className = 'cursor-dot';
    document.body.appendChild(this.cursorDot);
    
    this.trails = [];
    for (let i = 0; i < 4; i++) {
      const trail = document.createElement('div');
      trail.className = 'cursor-trail';
      trail.style.opacity = 0.3 - i * 0.05;
      document.body.appendChild(trail);
      this.trails.push({ el: trail, x: 0, y: 0 });
    }
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.cursorX = 0;
    this.cursorY = 0;
    
    this.bindEvents();
    this.animate();
  }
  
  bindEvents() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('.event-card, .poster-card, .btn')) {
        document.body.classList.add('hovering');
      }
      if (e.target.closest('.btn')) {
        document.body.classList.add('cta-hover');
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      if (!e.target.closest('.event-card, .poster-card, .btn')) {
        document.body.classList.remove('hovering');
      }
      if (!e.target.closest('.btn')) {
        document.body.classList.remove('cta-hover');
      }
    });
  }
  
  animate() {
    // Smooth follow with lag
    this.cursorX += (this.mouseX - this.cursorX) * 0.2;
    this.cursorY += (this.mouseY - this.cursorY) * 0.2;
    
    this.cursor.style.left = this.cursorX + 'px';
    this.cursor.style.top = this.cursorY + 'px';
    
    this.cursorDot.style.left = this.mouseX + 'px';
    this.cursorDot.style.top = this.mouseY + 'px';
    
    // Trails with delay
    this.trails.forEach((trail, i) => {
      const delay = (i + 1) * 0.15;
      trail.x += (this.mouseX - trail.x) * (0.3 - delay * 0.1);
      trail.y += (this.mouseY - trail.y) * (0.3 - delay * 0.1);
      trail.el.style.left = trail.x + 'px';
      trail.el.style.top = trail.y + 'px';
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

// Opening animation
function playOpeningAnimation() {
  if (sessionStorage.getItem('trip_opened')) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'opening-overlay';
  overlay.innerHTML = '<div class="opening-ticket">TRIP</div>';
  document.body.appendChild(overlay);
  
  sessionStorage.setItem('trip_opened', 'true');
  
  setTimeout(() => {
    overlay.remove();
  }, 2500);
}

// Export for use
window.PsychedelicBackground = PsychedelicBackground;
window.CursorEffect = CursorEffect;
window.playOpeningAnimation = playOpeningAnimation;
