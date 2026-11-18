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
  const layersEl = $('[data-tv-layers]');
  const chEl = $('[data-tv-ch]');
  const knobEl = $('[data-tv-knob]');
  const tabsEl = $('[data-stage-tabs]');
  const idxEl = $('[data-stage-index]');
  const nameEl = $('[data-stage-name]');
  const tagEl = $('[data-stage-tag]');
  const sigEl = $('[data-hud-sig]');
  const tilt = $('[data-stage-tilt]');

  /* ---------------- TV screen: one layer per vertical ---------------- */
  // Illustrations live in assets/illos/<key>.svg (animated SVG). They're inlined so
  // only the channel on screen animates; if fetching fails they fall back to <img>.
  const layers = {};
  VERTICALS.forEach(v => {
    const el = document.createElement('div');
    el.className = 'tv-layer';
    el.dataset.v = v.key;
    layersEl.appendChild(el);
    layers[v.key] = el;
  });
  let offscreen = false;
  const svgOf = (key) => layers[key].querySelector('svg');
  function syncPlayback() {
    VERTICALS.forEach((v, k) => {
      const s = svgOf(v.key);
      if (!s || !s.pauseAnimations) return;
      if (reduceMotion) { s.setCurrentTime(2); s.pauseAnimations(); return; }
      (k === current && !offscreen) ? s.unpauseAnimations() : s.pauseAnimations();
    });
  }
  const loadIllo = (v) => fetch(`assets/illos/${v.key}.svg`)
    .then(r => (r.ok ? r.text() : Promise.reject(r.status)))
    .then(text => {
      layers[v.key].innerHTML = text;
      const s = svgOf(v.key);
      ['width', 'height', 'role', 'aria-label'].forEach(a => s.removeAttribute(a));
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('focusable', 'false');
      s.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      s.querySelector('title')?.remove();
      syncPlayback();
    })
    .catch(() => { layers[v.key].innerHTML = `<img src="assets/illos/${v.key}.svg" alt="">`; });
  // The first channel loads first, the rest right after
  loadIllo(VERTICALS[0]).then(() => VERTICALS.slice(1).forEach(loadIllo));

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
  let knobAngle = 0;
  function go(i, { spin = true } = {}) {
    if (i === current) return;
    const prevV = VERTICALS[current];
    const v = VERTICALS[i];
    // Channel knob always turns forward, one notch per channel
    if (current > -1) knobAngle += ((i - current + VERTICALS.length) % VERTICALS.length) * 60;
    current = i;
    knobEl?.style.setProperty('--rot', knobAngle + 'deg');
    if (chEl) chEl.textContent = String(i + 1).padStart(2, '0');

    hero.style.setProperty('--accent', v.color);
    hero.style.setProperty('--accent-ink', v.ink);
    setWord(v.name.toUpperCase(), spin);

    tabs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
    idxEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(VERTICALS.length).padStart(2, '0')}`;
    nameEl.textContent = v.name;
    tagEl.textContent = v.tag;
    sigEl.textContent = '0x' + String(i + 1).padStart(2, '0');

    const inL = layers[v.key];
    const outL = prevV ? layers[prevV.key] : null;
    if (switchTl) switchTl.progress(1).kill();

    if (!animate || !outL) {
      Object.values(layers).forEach(l => l.classList.toggle('is-active', l === inL));
      syncPlayback();
      return;
    }
    // CRT channel change: the old picture collapses to a bright line, static, then the new one opens
    stageEl.classList.remove('is-switching');
    void stageEl.offsetWidth;
    stageEl.classList.add('is-switching');
    switchTl = gsap.timeline()
      .to(outL, { scaleY: 0.015, filter: 'brightness(2.4)', duration: 0.2, ease: 'power2.in' })
      .to(outL, { scaleX: 0, duration: 0.08, ease: 'power1.in' })
      .add(() => {
        outL.classList.remove('is-active');
        gsap.set(outL, { clearProps: 'transform,filter' });
        inL.classList.add('is-active');
        syncPlayback();
      })
      .fromTo(inL, { scaleY: 0.015, filter: 'brightness(2.4)' }, { scaleY: 1, filter: 'brightness(1)', duration: 0.55, ease: 'expo.out', clearProps: 'transform,filter' });
  }

  /* ---------------- Autoplay ---------------- */
  let timer = null;
  let userPaused = reduceMotion;   // reduced motion: don't auto-rotate
  let hoverPaused = false;

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
    syncPlayback();
  }, { threshold: 0.05 }).observe(hero);

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

  /* ---------------- Desktop: size the TV to the copy ----------------
     The stage spans the eyebrow to the CTAs: its SIG.IN label lines up with the
     eyebrow and its tabs with the buttons. Height is linear in width, so two
     trial widths give the exact fit. Layout values only (no transforms). */
  const desktop = window.matchMedia('(min-width: 1080px)');
  const eyebrowEl = $('.hero-eyebrow');
  const ctasEl = $('.hero-ctas');
  const hudEl = $('.stage-hud');
  const hudLabel = $('.hud-t');
  const stageExtent = () => {
    const overhang = Math.max(0, -(hudEl.offsetTop + hudLabel.offsetTop - 1.4 * hudLabel.offsetHeight));
    return stageEl.offsetHeight + overhang;
  };
  // Horizon sits at 79% of the hero by default; lower it only as far as needed
  // to leave a clear gap under the buttons (and the TV tabs, which share that line).
  const HORIZON_GAP = 40;
  function placeFloor() {
    if (!desktop.matches) { hero.style.removeProperty('--floor-shift'); return; }
    const h = hero.offsetHeight;
    const copyBottom = ctasEl.offsetTop + ctasEl.offsetHeight;
    const shift = copyBottom + HORIZON_GAP - h * 0.79;
    hero.style.setProperty('--floor-shift', Math.round(Math.min(Math.max(shift, 0), h * 0.13)) + 'px');
  }
  function fitStage() {
    if (!desktop.matches) { stageEl.style.width = ''; placeFloor(); return; }
    const setW = (w) => { stageEl.style.width = Math.round(Math.min(Math.max(w, 260), 560)) + 'px'; };
    setW(200);  // small, so the stage can't stretch the copy's rows while we measure
    const target = (ctasEl.offsetTop + ctasEl.offsetHeight) - eyebrowEl.offsetTop;
    setW(380); const e1 = stageExtent();
    setW(440); const e2 = stageExtent();
    const slope = (e2 - e1) / 60;
    let w = 380 + (target - e1) / slope;
    setW(w);
    // One correction pass (the caption can rewrap at a new width)
    w += (target - stageExtent()) / slope;
    setW(w);
    placeFloor();
  }
  let fitRaf;
  const queueFit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitStage); };
  window.addEventListener('resize', queueFit);

  /* ---------------- Start ---------------- */
  const start = () => {
    fitStage();
    go(0, { spin: false });

    if (animate) {
      gsap.registerPlugin(ScrollTrigger);
      const reveal = hero.querySelectorAll('[data-reveal]');
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.site-header', { yPercent: -100, opacity: 0, duration: 0.9 }, 0)
        .from(title.querySelectorAll('.w-in'), { yPercent: 110, duration: 1.1, stagger: 0.06 }, 0.15)
        .from(reveal, { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.35)
        .from('.tv', { y: 30, opacity: 0, duration: 1, ease: 'expo.out' }, 0.3)
        .from('.tv-layers', { scaleY: 0.01, filter: 'brightness(3)', duration: 0.9, ease: 'expo.out', clearProps: 'transform,filter' }, 0.75)
        .from('.stage-hud, .stage-caption, .stage-tabs', { opacity: 0, y: 10, duration: 0.8, stagger: 0.08 }, 0.8)
        .from('.hero-floor, .hero-horizon', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0.2)
        .add(() => { setWord(VERTICALS[0].name.toUpperCase(), true); schedule(); }, 0.6);

      // Scroll: copy and stage drift apart, floor recedes
      const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      // (yPercent, not y/opacity, so it never fights the intro tweens on the same elements)
      gsap.to('.hero-eyebrow, .hero-title, .hero-sub, .hero-ctas', { yPercent: -18, ease: 'none', scrollTrigger: st });
      gsap.to('.stage', { y: -60, ease: 'none', scrollTrigger: st });  // rises with the copy, never into the floor
      gsap.to('.hero-floor-grid', { opacity: 0.15, ease: 'none', scrollTrigger: st });
    } else {
      schedule();
    }
  };

  // Wait for fonts so reel widths are measured against the real typeface
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
