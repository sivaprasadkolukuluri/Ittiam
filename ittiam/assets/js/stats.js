/* Stats: count the numbers up when they scroll into view, and only run the
   icon animations while the section is on screen (frozen for reduced motion). */
(() => {
  'use strict';
  const section = document.querySelector('.stats');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icons = [...section.querySelectorAll('svg.stat-icon')];
  const counters = [...section.querySelectorAll('[data-count]')];

  if (reduceMotion) {
    icons.forEach((s) => { s.setCurrentTime?.(1.5); s.pauseAnimations?.(); });
    return;
  }

  // Start from zero; the final value is already in the markup for no-JS readers
  counters.forEach((el) => { el.dataset.final = el.textContent; el.textContent = '0' + (el.dataset.suffix || ''); });

  const countUp = (el) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased) + suffix;
      if (p < 1) requestAnimationFrame(step); else el.textContent = el.dataset.final;
    };
    requestAnimationFrame(step);
  };

  let counted = false;
  new IntersectionObserver(([entry]) => {
    icons.forEach((s) => (entry.isIntersecting ? s.unpauseAnimations?.() : s.pauseAnimations?.()));
    if (entry.isIntersecting && !counted) { counted = true; counters.forEach(countUp); }
  }, { threshold: 0.35 }).observe(section);
})();
