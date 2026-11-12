/* Version list for the hub. To add a version:
   1. copy the working site into versions/<slug>/
   2. add an entry at the TOP of this list (newest first). */
window.ITTIAM_VERSIONS = [
  {
    slug: 'signal-v1',
    name: 'Signal',
    number: 'V1',
    date: '2026-11-12',
    path: 'versions/signal-v1/',
    summary: 'Six product labels inline in the header with colour hover effects, plus the THINK [PRODUCT] hero with its six animated illustrations.',
    sections: ['Header', 'Hero', 'Search', 'Mobile menu']
  }
];

/* The live working copy, which keeps changing as we build */
window.ITTIAM_DRAFT = {
  name: 'Working draft',
  path: 'ittiam/',
  summary: 'The copy we keep building on. It changes as each new section lands.'
};
