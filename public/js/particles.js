/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — Interactive Particle Canvas
   GPU-friendly, mouse-reactive, connecting lines
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Config
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth < 1024;
  const PARTICLE_COUNT = isMobile ? 35 : isTablet ? 60 : 110;
  const CONNECTION_DISTANCE = isMobile ? 80 : 120;
  const MOUSE_RADIUS = 150;
  const MOUSE_FORCE = 0.015;

  let width, height;
  let mouseX = -9999, mouseY = -9999;
  let particles = [];
  let animId;

  // Determine theme from canvas attribute
  const theme = (canvas.dataset.theme || 'default').toLowerCase();

  let COLORS = [
    'rgba(163,230,53,',   // green
    'rgba(34,211,238,',   // cyan
    'rgba(129,140,248,',  // indigo
  ];
  let connectionBase = 'rgba(163,230,53,';

  if (theme.includes('source') || theme.includes('emerald')) {
    COLORS = [
      'rgba(132,204,22,',  // emerald
      'rgba(163,230,53,',  // mint
      'rgba(6,182,212,',   // cyan
      'rgba(110,231,183,', // light green
    ];
    connectionBase = 'rgba(163,230,53,';
  } else if (theme.includes('ind') || theme.includes('cobalt')) {
    COLORS = [
      'rgba(37,99,235,',   // cobalt
      'rgba(56,189,248,',  // sky
      'rgba(99,102,241,',  // indigo
      'rgba(14,165,233,',  // electric blue
    ];
    connectionBase = 'rgba(56,189,248,';
  } else if (theme.includes('admin')) {
    COLORS = [
      'rgba(163,230,53,',  // green
      'rgba(34,211,238,',  // cyan
      'rgba(251,191,36,',  // amber
      'rgba(129,140,248,', // violet
    ];
    connectionBase = 'rgba(34,211,238,';
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticle() {
    const colorBase = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.6,
      color: colorBase,
      alpha: Math.random() * 0.35 + 0.15,
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function drawParticle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color + p.alpha + ')';
    ctx.fill();
  }

  function drawConnections() {
    if (isMobile) return;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DISTANCE) {
          const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `${connectionBase}${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function update() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse interaction
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_FORCE;
        p.vx -= (dx / dist) * force;
        p.vy -= (dy / dist) * force;
      }

      // Apply velocity
      p.x += p.vx;
      p.y += p.vy;

      // Friction
      p.vx *= 0.995;
      p.vy *= 0.995;

      // Base drift
      p.vx += (Math.random() - 0.5) * 0.005;
      p.vy += (Math.random() - 0.5) * 0.005;

      // Bounds wrap
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    update();
    drawConnections();
    for (let i = 0; i < particles.length; i++) {
      drawParticle(particles[i]);
    }
    animId = requestAnimationFrame(animate);
  }

  // Events
  window.addEventListener('resize', () => {
    resize();
    // Re-distribute particles that went out of bounds
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].x > width) particles[i].x = Math.random() * width;
      if (particles[i].y > height) particles[i].y = Math.random() * height;
    }
  });

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  // Visibility API — pause when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });

  // Start
  init();
  animate();
})();
