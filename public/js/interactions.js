/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — Shared Micro-Interactions
   3D tilt, magnetic buttons, scroll reveal, cursor glow
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 3D Card Tilt ──
     Add class "rh-tilt-card" to any element.
     Optional data-tilt-intensity="0.02" (default 0.02)
  */
  function initTilt() {
    if (prefersReducedMotion) return;
    const cards = document.querySelectorAll('.rh-tilt-card');
    cards.forEach(card => {
      const intensity = parseFloat(card.dataset.tiltIntensity) || 0.02;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        card.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity * 1.2}deg) translateZ(4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0)';
        card.style.transition = 'transform 0.6s cubic-bezier(.16,1,.3,1)';
        setTimeout(() => { card.style.transition = ''; }, 600);
      });
    });
  }

  /* ── Magnetic Button ──
     Add class "rh-magnetic" to buttons.
  */
  function initMagnetic() {
    if (prefersReducedMotion) return;
    const btns = document.querySelectorAll('.rh-magnetic');
    btns.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) translateY(-2px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(.16,1,.3,1)';
        setTimeout(() => { btn.style.transition = ''; }, 400);
      });
    });
  }

  /* ── Scroll Reveal ──
     Add class "rh-reveal" to elements.
     Optional data-reveal-delay="0.1" (seconds)
  */
  function initScrollReveal() {
    const els = document.querySelectorAll('.rh-reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseFloat(entry.target.dataset.revealDelay) || 0;
          setTimeout(() => {
            entry.target.classList.add('rh-revealed');
          }, delay * 1000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  /* ── Cursor Glow ──
     Creates a subtle glow that follows the cursor.
     Only on desktop.
  */
  function initCursorGlow() {
    if (prefersReducedMotion || window.innerWidth < 1024) return;

    const glow = document.createElement('div');
    glow.className = 'rh-cursor-glow';
    document.body.appendChild(glow);

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    function updateGlow() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      glow.style.left = currentX + 'px';
      glow.style.top = currentY + 'px';
      requestAnimationFrame(updateGlow);
    }
    updateGlow();
  }

  /* ── Orb Parallax (shared) ──
     Moves .rh-orb elements based on mouse position.
  */
  function initOrbParallax() {
    if (prefersReducedMotion) return;
    const orbs = document.querySelectorAll('.rh-orb');
    if (!orbs.length) return;

    window.addEventListener('mousemove', (e) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      orbs.forEach((orb, i) => {
        const speed = 40 + i * 20;
        const dur = 1.5 + i * 0.3;
        orb.style.transition = `transform ${dur}s cubic-bezier(.16,1,.3,1)`;
        orb.style.transform = `translate(${cx * speed}px, ${cy * speed}px)`;
      });
    });
  }

  /* ── Panel Glow Follow ──
     Add class "rh-glow-follow" to a container.
  */
  function initGlowFollow() {
    if (prefersReducedMotion) return;
    const panels = document.querySelectorAll('.rh-glow-follow');
    panels.forEach(panel => {
      panel.addEventListener('mousemove', (e) => {
        const r = panel.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        panel.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(163,230,53,.035) 0%, transparent 55%)`;
      });
      panel.addEventListener('mouseleave', () => {
        panel.style.background = '';
      });
    });
  }

  /* ── Init All ── */
  function init() {
    initTilt();
    initMagnetic();
    initScrollReveal();
    initCursorGlow();
    initOrbParallax();
    initGlowFollow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
