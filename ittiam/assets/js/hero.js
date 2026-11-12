/* Hero: "THINK <vertical>" reel ticker, synced stage illustrations,
   domain tabs, autoplay (pausable), intro + scroll motion. */
(() => {
  'use strict';

  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  // Edit taglines here. Automotive's line is a placeholder: the brief repeated Security's.
  const VERTICALS = [
    { key: 'video',    name: 'Video',      color: '#00C2A8', ink: '#00C2A8', tag: 'Codecs, streaming, and video AI' },
    { key: 'audio',    name: 'Audio',      color: '#8B3FF7', ink: '#A974FF', tag: 'Speech, codecs, and spatial audio' },
    { key: 'edgeai',   name: 'Edge AI',    color: '#39D97B', ink: '#39D97B', tag: 'Making models run where they can’t' },
    { key: 'xr',       name: 'XR',         color: '#FF4FA3', ink: '#FF4FA3', tag: 'Immersive capture and rendering' },
    { key: 'security', name: 'Security',   color: '#2D9CDB', ink: '#2D9CDB', tag: 'Vision at the edge, privately' },
    { key: 'auto',     name: 'Automotive', color: '#FFD400', ink: '#FFD400', tag: 'Perception for the road ahead' }
  ];
  const INTERVAL = 3600;
  const GLYPHS = '0123456789';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const animate = hasGsap && !reduceMotion;

  const $ = (s) => hero.querySelector(s);
  const wordEl = $('[data-think-word]');
  const stageEl = $('[data-stage]');
  const svg = $('[data-stage-svg]');
  const tabsEl = $('[data-stage-tabs]');
  const idxEl = $('[data-stage-index]');
  const nameEl = $('[data-stage-name]');
  const tagEl = $('[data-stage-tag]');
  const sigEl = $('[data-hud-sig]');
  const tilt = $('[data-stage-tilt]');

  /* ---------------- Stage ---------------- */
  const stage = window.IttiamStage.build(svg);
  const groups = Object.fromEntries(VERTICALS.map(v => [v.key, svg.querySelector(`[data-v="${v.key}"]`)]));

  /* ---------------- Tabs ---------------- */
  tabsEl.innerHTML = VERTICALS.map((v, i) => `
    <button class="stage-tab" type="button" aria-pressed="${i === 0}" aria-label="Show ${v.name}" title="${v.name}" style="--v:${v.color}" data-i="${i}">
      <svg aria-hidden="true"><use href="#g-${v.key}"/></svg>
    </button>`).join('') + `
    <button class="stage-tab stage-pause" type="button" aria-label="Pause rotation" data-pause>
      <svg aria-hidden="true"><use href="#i-pause"/></svg>
    </button>`;
  const tabs = [...tabsEl.querySelectorAll('[data-i]')];
  const pauseBtn = tabsEl.querySelector('[data-pause]');
  tabsEl.style.setProperty('--dur', INTERVAL + 'ms');

  /* ---------------- Reel ticker ---------------- */
  const measurer = document.createElement('span');
  measurer.className = 'think-measure';
  measurer.setAttribute('aria-hidden', 'true');
  wordEl.parentNode.appendChild(measurer);
  const widthCache = {};
  const charWidth = (ch) => {
    if (!(ch in widthCache)) { measurer.textContent = ch; widthCache[ch] = measurer.getBoundingClientRect().width; }
    return widthCache[ch];
  };
  // Reels take the final letter's width; spinning digits may overhang (reels only clip vertically)
  const reelWidth = (ch) => charWidth(ch);

  let shown = '';
  function setWord(word, spin) {
    const prev = shown;
    shown = word;
    const oldW = wordEl.getBoundingClientRect().width;
    wordEl.textContent = '';
    const strips = [];
    [...word].forEach((ch, i) => {
      const reel = document.createElement('span');
      reel.className = 'reel';
      reel.style.width = reelWidth(ch) + 'px';
      const strip = document.createElement('span');
      strip.className = 'reel-strip';
      const seq = spin && ch !== ' '
        ? [prev[i] || ' ', ...Array.from({ length: 3 + i }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]), ch]
        : [ch];
      seq.forEach(c => { const s = document.createElement('span'); s.textContent = c === ' ' ? ' ' : c; strip.appendChild(s); });
      reel.appendChild(strip);
      wordEl.appendChild(reel);
      if (seq.length > 1) strips.push({ strip, steps: seq.length, i });
    });

    if (!spin || !animate) return;
    const newW = wordEl.getBoundingClientRect().width;
    gsap.fromTo(wordEl, { width: oldW }, { width: newW, duration: 0.45, ease: 'power3.out', clearProps: 'width' });
    strips.forEach(({ strip, steps, i }) => {
      gsap.fromTo(strip,
        { yPercent: 0, filter: 'blur(1.5px)' },
        { yPercent: -100 * (steps - 1) / steps, filter: 'blur(0px)', duration: 0.5 + i * 0.07, ease: 'power3.out', delay: i * 0.025 });
    });
  }

  /* ---------------- Switching ---------------- */
  let current = -1;
  let switchTl;
  function go(i, { spin = true } = {}) {
    if (i === current) return;
    const prevV = VERTICALS[current];
    const v = VERTICALS[i];
    current = i;

    hero.style.setProperty('--accent', v.color);
    hero.style.setProperty('--accent-ink', v.ink);
    setWord(v.name.toUpperCase(), spin);

    tabs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
    idxEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(VERTICALS.length).padStart(2, '0')}`;
    nameEl.textContent = v.name;
    tagEl.textContent = v.tag;
    sigEl.textContent = '0x' + String(i + 1).padStart(2, '0');

    const inG = groups[v.key];
    const outG = prevV ? groups[prevV.key] : null;
    if (switchTl) switchTl.progress(1).kill();

    if (!animate || !outG) {
      Object.values(groups).forEach(g => g.classList.toggle('is-active', g === inG));
      return;
    }
    // CRT-style switch: the old signal collapses to a line, the new one opens out of it
    stageEl.classList.remove('is-switching');
    void stageEl.offsetWidth;
    stageEl.classList.add('is-switching');
    switchTl = gsap.timeline()
      .to(outG, { scaleY: 0.02, opacity: 0, duration: 0.22, ease: 'power2.in', svgOrigin: '300 300' })
      .add(() => { outG.classList.remove('is-active'); gsap.set(outG, { clearProps: 'transform,opacity' }); inG.classList.add('is-active'); })
      .fromTo(inG, { scaleY: 0.02, opacity: 1 }, { scaleY: 1, duration: 0.55, ease: 'expo.out', svgOrigin: '300 300', clearProps: 'transform' });
  }

  /* ---------------- Autoplay ---------------- */
  let timer = null;
  let userPaused = reduceMotion;   // reduced motion: don't auto-rotate
  let hoverPaused = false;
  let offscreen = false;

  const running = () => !userPaused && !hoverPaused && !offscreen && !document.hidden;
  function restartProgress() {
    tabsEl.classList.remove('is-running');
    void tabsEl.offsetWidth;
    tabsEl.classList.toggle('is-running', running());
    tabsEl.classList.toggle('is-paused', !running());
  }
  function schedule() {
    clearTimeout(timer);
    restartProgress();
    if (running()) timer = setTimeout(() => { go((current + 1) % VERTICALS.length); schedule(); }, INTERVAL);
  }
  function setUserPaused(p) {
    userPaused = p;
    pauseBtn.setAttribute('aria-label', p ? 'Play rotation' : 'Pause rotation');
    pauseBtn.querySelector('use').setAttribute('href', p ? '#i-play' : '#i-pause');
    schedule();
  }

  tabs.forEach(t => t.addEventListener('click', () => { go(+t.dataset.i); schedule(); }));
  tabsEl.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const k = tabs.indexOf(document.activeElement);
    if (k < 0) return;
    const next = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    go(next); schedule();
  });
  pauseBtn.addEventListener('click', () => setUserPaused(!userPaused));
  stageEl.addEventListener('mouseenter', () => { hoverPaused = true; schedule(); });
  stageEl.addEventListener('mouseleave', () => { hoverPaused = false; schedule(); });
  stageEl.addEventListener('focusin', () => { hoverPaused = true; schedule(); });
  stageEl.addEventListener('focusout', (e) => { if (!stageEl.contains(e.relatedTarget)) { hoverPaused = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);

  // Pause everything when the hero leaves the viewport
  new IntersectionObserver(([entry]) => {
    offscreen = !entry.isIntersecting;
    schedule();
  }, { threshold: 0.05 }).observe(hero);

  /* ---------------- Per-frame scene updates ---------------- */
  if (animate) {
    gsap.ticker.add((time) => { if (!offscreen && current > -1) stage.tick(time, VERTICALS[current].key); });
  }

  /* ---------------- Pointer tilt ---------------- */
  if (animate && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const rx = gsap.quickTo(tilt.firstElementChild, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(tilt.firstElementChild, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      const r = tilt.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      ry(dx * 10); rx(-dy * 8);
    });
    hero.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  /* ---------------- Headline word split (for the reveal) ---------------- */
  const title = $('[data-split]');
  const wrap = (node) => { const w = document.createElement('span'); w.className = 'w'; const inner = document.createElement('span'); inner.className = 'w-in'; w.appendChild(inner); inner.appendChild(node); return w; };
  if (animate) {
    [...title.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          frag.appendChild(/\s/.test(part) ? document.createTextNode(part) : wrap(document.createTextNode(part)));
        });
        node.replaceWith(frag);
      } else {
        const placeholder = document.createComment('');
        node.replaceWith(placeholder);
        placeholder.replaceWith(wrap(node));
      }
    });
  }

  /* ---------------- Start ---------------- */
  const start = () => {
    go(0, { spin: false });

    if (animate) {
      gsap.registerPlugin(ScrollTrigger);
      const reveal = hero.querySelectorAll('[data-reveal]');
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.site-header', { yPercent: -100, opacity: 0, duration: 0.9 }, 0)
        .from(title.querySelectorAll('.w-in'), { yPercent: 110, duration: 1.1, stagger: 0.06 }, 0.15)
        .from(reveal, { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.35)
        .from('.stage-porthole', { scaleY: 0.01, scaleX: 0.6, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.3)
        .from('.stage-hud, .stage-caption, .stage-tabs', { opacity: 0, y: 10, duration: 0.8, stagger: 0.08 }, 0.8)
        .from('.hero-floor, .hero-horizon', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0.2)
        .add(() => { setWord(VERTICALS[0].name.toUpperCase(), true); schedule(); }, 0.6);

      // Scroll: copy and stage drift apart, floor recedes
      const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      // (yPercent, not y/opacity, so it never fights the intro tweens on the same elements)
      gsap.to('.hero-eyebrow, .hero-title, .hero-sub, .hero-ctas', { yPercent: -18, ease: 'none', scrollTrigger: st });
      gsap.to('.stage', { y: 80, ease: 'none', scrollTrigger: st });
      gsap.to('.hero-floor-grid', { opacity: 0.15, ease: 'none', scrollTrigger: st });
    } else {
      schedule();
    }
  };

  // Wait for fonts so reel widths are measured against the real typeface
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
