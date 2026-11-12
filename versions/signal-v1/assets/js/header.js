/* Header: scroll state, dropdowns / mega menu, search, mobile menu.
   The search index and mobile menu are built from the desktop nav markup,
   so the nav only needs to be edited in one place. */
(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  if (!header) return;
  const scrim = document.querySelector('[data-nav-scrim]');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const html = document.documentElement;

  /* ---------------- Scroll state ---------------- */
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- Dropdowns ---------------- */
  const items = [...header.querySelectorAll('[data-dropdown]')];
  let closeTimer;

  const setScrim = () => {
    const anyOpen = items.some(i => i.classList.contains('is-open'));
    header.classList.toggle('has-open', anyOpen);
    scrim.classList.toggle('is-visible', anyOpen);
  };
  const open = (item) => {
    items.forEach(i => i !== item && close(i, false));
    item.classList.add('is-open');
    item.querySelector('.nav-trigger').setAttribute('aria-expanded', 'true');
    setScrim();
  };
  const close = (item, update = true) => {
    item.classList.remove('is-open');
    item.querySelector('.nav-trigger').setAttribute('aria-expanded', 'false');
    if (update) setScrim();
  };
  const closeAll = () => { items.forEach(i => close(i, false)); setScrim(); };

  items.forEach(item => {
    const trigger = item.querySelector('.nav-trigger');
    const panel = item.querySelector('.nav-panel');
    const links = () => [...panel.querySelectorAll('a')];

    trigger.addEventListener('click', () => {
      item.classList.contains('is-open') ? close(item) : open(item);
    });
    item.addEventListener('mouseenter', () => {
      if (!finePointer.matches) return;
      clearTimeout(closeTimer);
      open(item);
    });
    item.addEventListener('mouseleave', () => {
      if (!finePointer.matches) return;
      closeTimer = setTimeout(() => close(item), 160);
    });
    item.addEventListener('keydown', (e) => {
      const list = links();
      const idx = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(item); trigger.focus(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!item.classList.contains('is-open')) open(item);
        (list[idx + 1] || list[0]).focus();
      } else if (e.key === 'ArrowUp' && idx > -1) {
        e.preventDefault();
        idx === 0 ? trigger.focus() : list[idx - 1].focus();
      }
    });
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) close(item);
    });
  });

  document.addEventListener('click', (e) => { if (!header.contains(e.target)) closeAll(); });
  scrim.addEventListener('click', closeAll);

  /* ---------------- Nav index (shared by search + mobile menu) ---------------- */
  // Every [data-nav-link] in the header, grouped by its nearest [data-group], in page order
  const groups = [];
  header.querySelectorAll('[data-nav-link]').forEach(a => {
    const name = a.closest('[data-group]').dataset.group;
    let g = groups.find(x => x.name === name);
    if (!g) groups.push(g = { name, links: [] });
    g.links.push({
      // text nodes only, so decorative bits like the "01" index are skipped
      label: [...a.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(),
      desc: a.dataset.desc || '',
      href: a.getAttribute('href'),
      vertical: a.dataset.vertical || '',
      style: a.getAttribute('style') || ''
    });
  });

  const lockScroll = (on) => { html.style.overflow = on ? 'hidden' : ''; };

  /* ---------------- Search ---------------- */
  const sDialog = document.querySelector('[data-search-dialog]');
  const sInput = document.querySelector('[data-search-input]');
  const sResults = document.querySelector('[data-search-results]');
  const kbdHint = document.querySelector('[data-kbd-hint]');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (kbdHint && !isMac) kbdHint.textContent = 'Ctrl K';

  const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const renderResults = (q = '') => {
    const query = q.trim().toLowerCase();
    let html = '';
    let count = 0;
    groups.forEach(g => {
      const hits = g.links.filter(l => !query || (l.label + ' ' + l.desc + ' ' + g.name).toLowerCase().includes(query));
      if (!hits.length) return;
      count += hits.length;
      html += `<p class="search-group-label label-mono">${esc(g.name)}</p>`;
      html += hits.map(l => `
        <a class="search-result" role="listitem" href="${esc(l.href)}" style="${esc(l.style)}">
          <span class="dot" aria-hidden="true"></span>
          <span class="r-label"${l.vertical ? ' style="color:var(--v-ink)"' : ''}>${esc(l.label)}</span>
          ${l.desc ? `<span class="r-desc">${esc(l.desc)}</span>` : ''}
        </a>`).join('');
    });
    sResults.innerHTML = count ? html : `<p class="search-empty">No matches for “${esc(q)}”. Try “codec”, “speech” or “careers”.</p>`;
  };

  const openSearch = () => {
    closeAll();
    renderResults('');
    sInput.value = '';
    sDialog.showModal();
    lockScroll(true);
    requestAnimationFrame(() => sInput.focus());
  };
  sDialog.addEventListener('close', () => lockScroll(false));
  sInput.addEventListener('input', () => renderResults(sInput.value));
  document.querySelectorAll('[data-search-open]').forEach(b => b.addEventListener('click', openSearch));
  document.querySelector('[data-search-close]').addEventListener('click', () => sDialog.close());
  sDialog.addEventListener('click', (e) => {
    if (e.target === sDialog) sDialog.close();                       // backdrop click
    if (e.target.closest('.search-result')) sDialog.close();
  });
  sDialog.addEventListener('keydown', (e) => {
    const list = [...sResults.querySelectorAll('.search-result')];
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0]).focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? sInput.focus() : list[i - 1].focus(); }
    if (e.key === 'Enter' && document.activeElement === sInput) { e.preventDefault(); list[0].click(); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      if (sDialog.open) return;
      e.preventDefault();
      openSearch();
    }
  });

  /* ---------------- Mobile menu ---------------- */
  const mDialog = document.querySelector('[data-mobile-menu]');
  const mBody = document.querySelector('[data-mm-body]');
  const mOpen = document.querySelector('[data-menu-open]');

  const glyph = (v) => v ? `<span class="vcard-glyph" aria-hidden="true"><svg><use href="#g-${v}"/></svg></span>` : '';
  mBody.innerHTML = `
    <button class="mm-search" type="button" data-mm-search>
      <svg class="icon" aria-hidden="true"><use href="#i-search"/></svg> Search Ittiam
    </button>
    ${groups.map((g, gi) => `
      <div class="mm-group${gi === 0 ? ' is-open' : ''}">
        <button class="mm-trigger" type="button" aria-expanded="${gi === 0}" aria-controls="mm-p-${gi}">
          ${esc(g.name)} <svg class="chev" aria-hidden="true"><use href="#i-chevron"/></svg>
        </button>
        <div class="mm-panel" id="mm-p-${gi}"><div><ul class="mm-links">
          ${g.links.map(l => `<li><a class="mm-link" href="${esc(l.href)}" style="${esc(l.style)}">
            ${glyph(l.vertical)}
            ${l.vertical
              ? `<span class="mm-v"><span class="vcard-name">${esc(l.label)}</span><span class="mm-desc">${esc(l.desc)}</span></span>`
              : esc(l.label)}
          </a></li>`).join('')}
        </ul></div></div>
      </div>`).join('')}`;

  mBody.querySelectorAll('.mm-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const grp = btn.closest('.mm-group');
      const isOpen = grp.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
  // Keep collapsed panels out of the tab order
  const syncInert = () => mBody.querySelectorAll('.mm-group').forEach(g => {
    g.querySelector('.mm-panel').inert = !g.classList.contains('is-open');
  });
  syncInert();
  mBody.addEventListener('click', (e) => {
    if (e.target.closest('.mm-trigger')) syncInert();
    if (e.target.closest('.mm-link')) mDialog.close();
  });

  mOpen.addEventListener('click', () => { mDialog.showModal(); lockScroll(true); });
  mDialog.addEventListener('close', () => { lockScroll(false); mOpen.focus(); });
  mDialog.querySelectorAll('[data-menu-close], [data-menu-close-link]').forEach(b => b.addEventListener('click', () => mDialog.close()));
  mBody.querySelector('[data-mm-search]').addEventListener('click', () => { mDialog.close(); openSearch(); });

  // Close the mobile menu if the viewport grows past the breakpoint
  window.matchMedia('(min-width: 1240px)').addEventListener('change', (e) => { if (e.matches && mDialog.open) mDialog.close(); });
})();
