/* Renders version cards from hub/versions.js and scales each live preview to fit its card. */
(() => {
  'use strict';
  const versions = window.ITTIAM_VERSIONS || [];
  const draft = window.ITTIAM_DRAFT;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // A 1440×900 desktop render, shrunk to the card's width
  const preview = (path, title) => `
    <div class="preview" data-preview>
      <iframe src="${esc(path)}" title="${esc(title)} preview" loading="lazy" tabindex="-1" aria-hidden="true" scrolling="no"></iframe>
      <span class="scan" aria-hidden="true"></span>
    </div>`;

  const actions = (path, name) => `
    <div class="actions">
      <a class="btn btn-primary" href="${esc(path)}">Open ${esc(name)}</a>
      <a class="btn btn-ghost" href="${esc(path)}" target="_blank" rel="noopener">New tab <span aria-hidden="true">↗</span></a>
    </div>`;

  // Working draft
  const draftEl = document.querySelector('[data-draft]');
  if (draft && draftEl) {
    draftEl.innerHTML = `
      <article class="card card-draft">
        ${preview(draft.path, draft.name)}
        <div class="body">
          <div class="meta"><span class="badge badge-live"><span class="pulse" aria-hidden="true"></span>Live</span><span class="path">/${esc(draft.path)}</span></div>
          <h3 class="name">${esc(draft.name)}</h3>
          ${actions(draft.path, 'draft')}
        </div>
      </article>`;
  }

  // Saved directions, newest first; numbered in the order they were saved (oldest = 01)
  const dirs = document.querySelector('[data-directions]');
  dirs.innerHTML = versions.map((v, i) => {
    const n = String(versions.length - i).padStart(2, '0');
    return `
    <section aria-labelledby="dir-${n}">
      <h2 class="section-h" id="dir-${n}"><span>Direction ${n}</span></h2>
      <ul class="grid"><li>
      <article class="card">
        ${preview(v.path, `${v.name} ${v.number}`)}
        <div class="body">
          <div class="meta">
            <span class="badge">${esc(v.number)}</span>
            ${i === 0 ? '<span class="badge badge-latest">Latest</span>' : ''}
            <time datetime="${esc(v.date)}">${esc(fmtDate(v.date))}</time>
          </div>
          <h3 class="name">${esc(v.name)} <span class="num">${esc(v.number)}</span></h3>
          ${actions(v.path, `${v.name} ${v.number}`)}
        </div>
      </article>
      </li></ul>
    </section>`;
  }).join('');

  // Scale every preview iframe to its frame width
  const ro = new ResizeObserver(entries => entries.forEach(e => {
    e.target.style.setProperty('--s', e.contentRect.width / 1440);
  }));
  document.querySelectorAll('[data-preview]').forEach(p => ro.observe(p));
})();
