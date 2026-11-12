/* Hero stage: a retro "porthole" scene (sunrise, horizon, perspective floor,
   dial ring) plus one animated motif per vertical. Every motif is drawn in
   var(--accent), so it always matches the active vertical's colour.
   viewBox is 600 x 600; the horizon sits at y = 372. */
(function () {
  'use strict';

  const H = 372;            // horizon
  const C = 300;            // centre x
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const n = (v) => Math.round(v * 10) / 10;

  /* ------------------------------------------------------------------ */
  /* Shared scene                                                        */
  /* ------------------------------------------------------------------ */
  function defs() {
    // Sun stripes: gaps thicken toward the horizon (classic synthwave sun)
    const ys = [302, 314, 325, 335, 344, 352, 359, 365];
    const stripes = ys.map((y, i) => `<rect x="0" y="${y}" width="600" height="${n(1.6 + i * 0.75)}" fill="#000"/>`).join('');
    return `
    <defs>
      <clipPath id="cp-port"><circle cx="300" cy="300" r="264"/></clipPath>
      <clipPath id="cp-sky"><rect width="600" height="${H}"/></clipPath>
      <clipPath id="cp-frame"><rect x="150" y="130" width="300" height="180" rx="6"/></clipPath>
      <linearGradient id="lg-sun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="stop-accent"/><stop offset="1" class="stop-brand"/>
      </linearGradient>
      <radialGradient id="rg-halo">
        <stop offset="0" class="stop-accent" stop-opacity=".55"/>
        <stop offset="1" class="stop-accent" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="rg-sky" cx=".5" cy=".64" r=".72">
        <stop offset="0" stop-color="#17124A"/><stop offset=".55" stop-color="#0A0D31"/><stop offset="1" stop-color="#05071C"/>
      </radialGradient>
      <linearGradient id="lg-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0E0B32"/><stop offset="1" stop-color="#04051A"/>
      </linearGradient>
      <linearGradient id="lg-ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" class="stop-brand"/><stop offset=".5" class="stop-accent"/><stop offset="1" class="stop-brand"/>
      </linearGradient>
      <linearGradient id="lg-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" class="stop-accent" stop-opacity="0"/><stop offset="1" class="stop-accent" stop-opacity=".38"/>
      </linearGradient>
      <mask id="mk-sun" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600">
        <rect width="600" height="600" fill="#fff"/>${stripes}
      </mask>
    </defs>`;
  }

  function stars() {
    let s = '<g class="stars">';
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 250;
      const x = C + Math.cos(a) * r, y = 300 + Math.sin(a) * r;
      if (y > H - 20) continue;
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.5 + rnd() * 1.1)}" style="animation-delay:-${n(rnd() * 4)}s;animation-duration:${n(2.5 + rnd() * 3)}s"/>`;
    }
    return s + '</g>';
  }

  function floor() {
    let v = '<g class="floor-v">';
    for (let i = -10; i <= 10; i++) v += `<line x1="${C + i * 5}" y1="${H}" x2="${C + i * 62}" y2="600"/>`;
    v += '</g><g class="floor-h" data-floor-h>';
    for (let i = 0; i < 11; i++) v += `<line x1="0" x2="600" y1="${H}" y2="${H}"/>`;
    return `<rect y="${H}" width="600" height="${600 - H}" fill="url(#lg-floor)"/>${v}</g>`;
  }

  function ring() {
    let ticks = '<g class="dial">';
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2, long = i % 10 === 0;
      const r1 = 278, r2 = long ? 292 : 284;
      ticks += `<line x1="${n(C + Math.cos(a) * r1)}" y1="${n(300 + Math.sin(a) * r1)}" x2="${n(C + Math.cos(a) * r2)}" y2="${n(300 + Math.sin(a) * r2)}"${long ? ' class="long"' : ''}/>`;
    }
    ticks += '</g>';
    return `${ticks}
      <circle class="ring-glow" cx="300" cy="300" r="268" fill="none" stroke="url(#lg-ring)" stroke-width="14"/>
      <circle class="ring" cx="300" cy="300" r="268" fill="none" stroke="url(#lg-ring)" stroke-width="4"/>
      <circle cx="300" cy="300" r="259" fill="none" stroke="#fff" stroke-opacity=".07"/>`;
  }

  /* Corner brackets around a box (detection overlays) */
  function brackets(x, y, w, h, k = 9, cls = 'brk') {
    return `<path class="${cls}" d="M${x} ${y + k}V${y}H${x + k}M${x + w - k} ${y}H${x + w}V${y + k}M${x + w} ${y + h - k}V${y + h}H${x + w - k}M${x + k} ${y + h}H${x}V${y + h - k}"/>`;
  }

  /* ------------------------------------------------------------------ */
  /* VIDEO: codecs, streaming, video AI                                  */
  /* A frame split into macroblocks being encoded, an AI detection box,  */
  /* a playhead, and packets streaming out across the floor.            */
  /* ------------------------------------------------------------------ */
  function video() {
    const x0 = 150, y0 = 130, w = 300, h = 180, cols = 8, rows = 5, cw = w / cols, rh = h / rows;
    let s = '<g class="il il-video" data-v="video">';

    // packets streaming toward the viewer
    [-170, -105, -45, 45, 105, 170, -135, 135, 0].forEach((dx, i) => {
      s += `<g class="v-packet" style="--dx:${dx}px;animation-delay:-${n(i * 0.31)}s"><rect x="-10" y="-5" width="20" height="10" rx="2" class="f-acc"/></g>`;
    });

    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="#050818" fill-opacity=".92"/>`;
    s += '<g clip-path="url(#cp-frame)">';
    // the picture: a horizon scene inside the frame
    s += `<path d="M150 312 L205 262 L245 284 L305 222 L362 270 L398 246 L450 282 V312 Z" class="f-acc" fill-opacity=".14"/>`;
    s += `<path d="M150 312 L205 262 L245 284 L305 222 L362 270 L398 246 L450 282" class="s-acc" fill="none" stroke-opacity=".7" stroke-width="1.4"/>`;
    s += `<circle cx="396" cy="182" r="18" class="s-acc" fill="none" stroke-opacity=".55"/>`;
    // macroblock grid
    for (let c = 1; c < cols; c++) s += `<line class="grid-faint" x1="${n(x0 + c * cw)}" y1="${y0}" x2="${n(x0 + c * cw)}" y2="${y0 + h}"/>`;
    for (let r = 1; r < rows; r++) s += `<line class="grid-faint" x1="${x0}" y1="${n(y0 + r * rh)}" x2="${x0 + w}" y2="${n(y0 + r * rh)}"/>`;
    // blocks being encoded
    [[1, 1], [2, 3], [4, 0], [5, 2], [6, 3], [3, 4], [0, 2], [7, 1], [4, 3], [2, 0], [6, 4]].forEach(([c, r], i) => {
      s += `<rect class="v-block f-acc" x="${n(x0 + c * cw + 1.5)}" y="${n(y0 + r * rh + 1.5)}" width="${n(cw - 3)}" height="${n(rh - 3)}" style="animation-delay:-${n(i * 0.37)}s"/>`;
    });
    // motion vectors
    [[205, 200, 18, -8], [262, 240, 14, 10], [352, 220, -16, 6], [420, 260, -12, -10]].forEach(([x, y, dx, dy]) => {
      s += `<path class="s-acc" stroke-width="1.4" fill="none" stroke-opacity=".8" d="M${x} ${y}l${dx} ${dy}"/><circle cx="${x}" cy="${y}" r="1.8" class="f-acc"/>`;
    });
    // playhead
    s += `<g class="v-playhead"><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + h}" class="s-acc" stroke-width="2"/><rect x="${x0 - 30}" y="${y0}" width="30" height="${h}" class="f-acc" fill-opacity=".08"/></g>`;
    s += '</g>';
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="none" class="s-acc" stroke-width="1.6"/>`;

    // AI detection on the peak
    s += `<g class="v-detect">${brackets(282, 196, 60, 64)}<rect x="282" y="182" width="74" height="13" rx="2" class="f-acc"/><text x="286" y="192" class="t-ink">OBJ 0.98</text></g>`;

    // labels + timeline
    s += `<text x="${x0}" y="${y0 - 10}" class="t">H.266 / VVC</text>`;
    s += `<text x="${x0 + w}" y="${y0 - 10}" class="t" text-anchor="end">4K · 60 FPS</text>`;
    s += `<line x1="${x0}" y1="328" x2="${x0 + w}" y2="328" class="grid-faint" stroke-width="2"/>`;
    s += `<line class="v-progress s-acc" x1="${x0}" y1="328" x2="${x0 + w}" y2="328" stroke-width="2"/>`;
    s += `<text x="${x0}" y="346" class="t">00:04:12:08</text><text x="${x0 + w}" y="346" class="t" text-anchor="end">−38% BITRATE</text>`;
    return s + '</g>';
  }

  /* ------------------------------------------------------------------ */
  /* AUDIO: speech, codecs, spatial audio                                */
  /* Radial equaliser around a microphone, spatial rings, and a speech   */
  /* waveform running along the horizon like an oscilloscope.            */
  /* ------------------------------------------------------------------ */
  function speechPath() {
    let d = '';
    for (let x = 0; x <= 1200; x += 3) {
      const env = Math.pow(Math.abs(Math.sin(Math.PI * x / 150)), 1.6) * (0.5 + 0.5 * Math.abs(Math.sin(Math.PI * x / 300)));
      const y = H - 26 * env * (Math.sin(2 * Math.PI * x * 12 / 300) + 0.35 * Math.sin(2 * Math.PI * x * 31 / 300));
      d += (x ? 'L' : 'M') + x + ' ' + n(y);
    }
    return d;
  }
  function audio() {
    const cx = 300, cy = 232, R0 = 62, N = 60;
    let s = '<g class="il il-audio" data-v="audio">';
    // spatial rings expanding outward
    [0, 1.2, 2.4].forEach(d => { s += `<circle class="a-ring s-acc" cx="${cx}" cy="${cy}" r="62" fill="none" style="animation-delay:-${d}s"/>`; });
    // spatial arcs, left and right
    [150, 172, 194].forEach((r, i) => {
      const a = 0.38;
      const lx1 = n(cx - r * Math.cos(a)), ly1 = n(cy - r * Math.sin(a)), ly2 = n(cy + r * Math.sin(a));
      const rx1 = n(cx + r * Math.cos(a));
      s += `<path class="a-arc s-acc" fill="none" stroke-width="2" style="animation-delay:${i * 0.22}s" d="M${lx1} ${ly1}A${r} ${r} 0 0 0 ${lx1} ${ly2}"/>`;
      s += `<path class="a-arc s-acc" fill="none" stroke-width="2" style="animation-delay:${i * 0.22 + 0.11}s" d="M${rx1} ${ly1}A${r} ${r} 0 0 1 ${rx1} ${ly2}"/>`;
    });
    // radial equaliser
    for (let i = 0; i < N; i++) {
      const a = (i * 360) / N, len = n(26 + rnd() * 26);
      s += `<g transform="rotate(${n(a)} ${cx} ${cy})"><rect class="a-bar f-acc" x="${cx - 2}" y="${n(cy - R0 - len)}" width="4" height="${len}" rx="2" style="animation-duration:${n(0.7 + rnd() * 0.9)}s;animation-delay:-${n(rnd() * 1.6)}s"/></g>`;
    }
    // core + microphone
    s += `<circle cx="${cx}" cy="${cy}" r="50" fill="#050818" class="s-acc" stroke-width="1.6"/>`;
    s += `<circle class="a-core f-acc" cx="${cx}" cy="${cy}" r="40" fill-opacity=".12"/>`;
    s += `<g class="s-acc" fill="none" stroke-width="2.4" stroke-linecap="round"><rect x="${cx - 9}" y="${cy - 26}" width="18" height="30" rx="9"/><path d="M${cx - 17} ${cy - 4}a17 17 0 0 0 34 0M${cx} ${cy + 13}v9M${cx - 8} ${cy + 22}h16"/></g>`;
    // speech waveform on the horizon
    s += `<g class="a-wave"><path d="${speechPath()}" class="s-acc" fill="none" stroke-width="1.8"/></g>`;
    s += `<text x="96" y="${cy + 4}" class="t">48 kHz</text><text x="504" y="${cy + 4}" class="t" text-anchor="end">7.1.4</text>`;
    return s + '</g>';
  }

  /* ------------------------------------------------------------------ */
  /* EDGE AI: making models run where they can't                         */
  /* A wide network compresses layer by layer into a single small chip; */
  /* pulses of inference flow down into the die.                         */
  /* ------------------------------------------------------------------ */
  function edgeai() {
    const L = [
      { y: 96, n: 9, x0: 150, x1: 450, r: 4.2 },
      { y: 150, n: 7, x0: 190, x1: 410, r: 3.8 },
      { y: 200, n: 5, x0: 230, x1: 370, r: 3.4 }
    ];
    const pins = [268, 284, 300, 316, 332];
    const pts = L.map(l => Array.from({ length: l.n }, (_, i) => [n(l.x0 + (i * (l.x1 - l.x0)) / (l.n - 1)), l.y]));
    let s = '<g class="il il-edgeai" data-v="edgeai">';
    let edges = '<g class="e-edges">';
    for (let k = 0; k < 2; k++) pts[k].forEach(a => pts[k + 1].forEach(b => { edges += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }));
    pts[2].forEach((a, i) => { edges += `<line x1="${a[0]}" y1="${a[1]}" x2="${pins[i]}" y2="244"/>`; });
    s += edges + '</g>';
    // inference pulses: chains from the wide layer down into the chip
    for (let i = 0; i < 12; i++) {
      const a = pts[0][Math.floor(rnd() * 9)], b = pts[1][Math.floor(rnd() * 7)], ci = Math.floor(rnd() * 5), c = pts[2][ci];
      s += `<path class="e-pulse s-acc" pathLength="100" fill="none" stroke-width="2.4" stroke-linecap="round" d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}L${pins[ci]} 244" style="animation-delay:-${n(rnd() * 2.4)}s;animation-duration:${n(1.9 + rnd() * 1.1)}s"/>`;
    }
    // nodes
    pts.forEach((layer, li) => layer.forEach(p => {
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="${L[li].r}" fill="#050818" class="s-acc" stroke-width="1.5"/>`;
      if (rnd() > 0.55) s += `<circle class="e-node f-acc" cx="${p[0]}" cy="${p[1]}" r="${n(L[li].r - 1.6)}" style="animation-delay:-${n(rnd() * 2)}s"/>`;
    }));
    // chip
    const cx0 = 252, cy0 = 252, cs = 96;
    let chip = `<g class="e-chip">`;
    [0, 1, 2, 3, 4].forEach(i => {
      const p = cx0 + 16 + i * 16;
      chip += `<line x1="${p}" y1="${cy0 - 10}" x2="${p}" y2="${cy0}"/><line x1="${p}" y1="${cy0 + cs}" x2="${p}" y2="${cy0 + cs + 10}"/>`;
      chip += `<line x1="${cx0 - 10}" y1="${p}" x2="${cx0}" y2="${p}"/><line x1="${cx0 + cs}" y1="${p}" x2="${cx0 + cs + 10}" y2="${p}"/>`;
    });
    chip += '</g>';
    s += chip;
    s += `<rect class="e-glow f-acc" x="${cx0 - 6}" y="${cy0 - 6}" width="${cs + 12}" height="${cs + 12}" rx="14"/>`;
    s += `<rect x="${cx0}" y="${cy0}" width="${cs}" height="${cs}" rx="10" fill="#050818" class="s-acc" stroke-width="2"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      s += `<rect class="e-cell f-acc" x="${cx0 + 22 + c * 13}" y="${cy0 + 18 + r * 13}" width="10" height="10" rx="1.5" style="animation-delay:-${n(((r * 4 + c) * 0.19) % 2.4)}s"/>`;
    }
    s += `<text x="300" y="${cy0 + cs - 8}" class="t t-acc" text-anchor="middle">NPU</text>`;
    // readouts
    s += `<path d="M232 300H150" class="grid-faint"/><text x="150" y="292" class="t">FP32 → INT4</text>`;
    s += `<path d="M368 300H450" class="grid-faint"/><text x="450" y="292" class="t" text-anchor="end">&lt;1 W · 8 ms</text>`;
    s += `<text x="300" y="76" class="t" text-anchor="middle">CLOUD-SIZE MODEL</text>`;
    return s + '</g>';
  }

  /* ------------------------------------------------------------------ */
  /* XR: immersive capture and rendering                                 */
  /* A rotating wireframe world, captured by stereo lenses on the floor; */
  /* light rays travel from the lenses into the render.                  */
  /* ------------------------------------------------------------------ */
  function xr() {
    const cx = 300, cy = 218, R = 108;
    let s = '<g class="il il-xr" data-v="xr">';
    // capture frustum
    s += `<path d="M272 452 L${cx - R} ${cy} L${cx + R} ${cy} L328 452 Z" class="f-acc" fill-opacity=".05"/>`;
    [[272, 446, cx - R + 4, cy + 20], [328, 446, cx + R - 4, cy + 20], [272, 446, cx - 30, cy + R - 6], [328, 446, cx + 30, cy + R - 6]].forEach(([x1, y1, x2, y2], i) => {
      s += `<line class="x-ray s-acc" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="animation-delay:-${i * 0.3}s"/>`;
    });
    // globe
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#050818" fill-opacity=".86"/>`;
    s += `<circle class="x-core f-acc" cx="${cx}" cy="${cy}" r="${R}" fill-opacity=".07"/>`;
    [-60, -30, 0, 30, 60].forEach(deg => {
      const p = (deg * Math.PI) / 180, rx = R * Math.cos(p);
      s += `<ellipse cx="${cx}" cy="${n(cy - R * Math.sin(p))}" rx="${n(rx)}" ry="${n(rx * 0.24)}" fill="none" class="s-acc" stroke-opacity=".45"/>`;
    });
    s += '<g data-meridians>';
    for (let i = 0; i < 6; i++) s += `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R}" fill="none" class="s-acc" stroke-width="1.3" data-phase="${n((i * Math.PI) / 6)}"/>`;
    s += '</g>';
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="s-acc" stroke-width="2"/>`;
    // rendered points on the surface
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R - 12);
      s += `<circle class="x-dot f-acc" cx="${n(cx + Math.cos(a) * r)}" cy="${n(cy + Math.sin(a) * r)}" r="2" style="animation-delay:-${n(rnd() * 3)}s"/>`;
    }
    // floating wireframe shards
    s += `<g class="x-bob"><path d="M118 132 L150 116 L142 154 Z M118 132 L142 154" class="s-acc" fill="none" stroke-width="1.4"/></g>`;
    s += `<g class="x-bob x-bob-2"><path d="M462 108 L492 128 L466 150 Z M462 108 L466 150" class="s-acc" fill="none" stroke-width="1.4"/></g>`;
    // stereo capture rig
    s += `<rect x="236" y="430" width="128" height="44" rx="22" fill="#050818" class="s-acc" stroke-width="1.8"/>`;
    s += `<circle cx="272" cy="452" r="13" fill="none" class="s-acc" stroke-width="1.8"/><circle cx="328" cy="452" r="13" fill="none" class="s-acc" stroke-width="1.8"/>`;
    s += `<circle class="x-lens f-acc" cx="272" cy="452" r="5"/><circle class="x-lens f-acc" cx="328" cy="452" r="5"/>`;
    s += `<text x="100" y="${cy + 4}" class="t">6DoF</text><text x="500" y="${cy + 4}" class="t" text-anchor="end">2 × 4K</text>`;
    return s + '</g>';
  }

  /* ------------------------------------------------------------------ */
  /* SECURITY: vision at the edge, privately                             */
  /* An aperture "eye" with a radar sweep and a lock at its pupil; the   */
  /* people it sees are pixel-masked on-device.                           */
  /* ------------------------------------------------------------------ */
  function security() {
    const cx = 300, cy = 218, R = 104, Ri = 88, hexR = 50;
    let s = '<g class="il il-security" data-v="security">';
    // sight lines to subjects
    [[178, 404], [300, 432], [422, 404]].forEach(([x, y]) => { s += `<line class="s-sight s-acc" x1="${cx}" y1="${cy + R}" x2="${x}" y2="${y}"/>`; });
    // ticking dial
    s += `<g class="s-ticks">`;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, r1 = R + 8, r2 = R + (i % 6 === 0 ? 18 : 13);
      s += `<line x1="${n(cx + Math.cos(a) * r1)}" y1="${n(cy + Math.sin(a) * r1)}" x2="${n(cx + Math.cos(a) * r2)}" y2="${n(cy + Math.sin(a) * r2)}"/>`;
    }
    s += '</g>';
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#050818" fill-opacity=".9" class="s-acc" stroke-width="2"/>`;
    // radar sweep
    const a2 = -0.75;
    s += `<g class="s-sweep"><path d="M${cx} ${cy}L${cx + R} ${cy}A${R} ${R} 0 0 0 ${n(cx + R * Math.cos(a2))} ${n(cy + R * Math.sin(a2))}Z" fill="url(#lg-sweep)"/><line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="s-acc" stroke-width="1.6"/></g>`;
    // aperture blades
    s += `<circle cx="${cx}" cy="${cy}" r="${Ri}" fill="none" class="s-acc" stroke-opacity=".5"/>`;
    const hex = Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3 + Math.PI / 6; return [cx + Math.cos(a) * hexR, cy + Math.sin(a) * hexR]; });
    let blades = `M${hex.map(p => n(p[0]) + ' ' + n(p[1])).join('L')}Z`;
    hex.forEach((p, i) => {
      const q = hex[(i + 1) % 6], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len, fx = p[0] - cx, fy = p[1] - cy;
      const b = fx * ux + fy * uy, t = -b + Math.sqrt(b * b - (fx * fx + fy * fy - Ri * Ri));
      blades += `M${n(p[0])} ${n(p[1])}L${n(p[0] + ux * t)} ${n(p[1] + uy * t)}`;
    });
    s += `<path d="${blades}" fill="none" class="s-acc" stroke-width="1.5"/>`;
    // pupil + lock
    s += `<circle class="s-pupil f-acc" cx="${cx}" cy="${cy}" r="27"/>`;
    s += `<path d="M${cx - 7} ${cy - 2}v-6a7 7 0 0 1 14 0v6" fill="none" stroke="#050818" stroke-width="3"/><rect x="${cx - 11}" y="${cy - 3}" width="22" height="17" rx="3" fill="#050818"/>`;
    // masked subjects
    [[178, 404, 32], [300, 432, 42], [422, 404, 32]].forEach(([x, y, sz], k) => {
      const x0 = x - sz / 2, y0 = y - sz / 2, c = sz / 4;
      s += `<rect x="${x0}" y="${y0}" width="${sz}" height="${sz}" fill="#050818"/>`;
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
        s += `<rect class="s-px f-acc" x="${n(x0 + q * c)}" y="${n(y0 + r * c)}" width="${n(c - 1)}" height="${n(c - 1)}" style="--o:${n(0.15 + rnd() * 0.6)};animation-delay:-${n(rnd() * 2)}s"/>`;
      }
      s += brackets(x0 - 6, y0 - 6, sz + 12, sz + 12, 7);
      s += `<text x="${x}" y="${y0 + sz + 22}" class="t" text-anchor="middle">${k === 1 ? 'MASKED' : 'ANON'}</text>`;
    });
    s += `<text x="96" y="${cy + 4}" class="t">ON-DEVICE</text><text x="504" y="${cy + 4}" class="t" text-anchor="end">0 TO CLOUD</text>`;
    return s + '</g>';
  }

  /* ------------------------------------------------------------------ */
  /* AUTOMOTIVE: perception on the road                                  */
  /* A road running to the horizon, lane markings rushing past, objects  */
  /* tagged by the perception stack, radar arcs from the vehicle.        */
  /* ------------------------------------------------------------------ */
  function automotive() {
    let s = '<g class="il il-auto" data-v="auto">';
    // segmented speed gauge arching over the horizon
    for (let i = 0; i <= 32; i++) {
      const a = ((200 + (i * 140) / 32) * Math.PI) / 180, r1 = 168, r2 = i % 4 === 0 ? 186 : 180;
      const cls = i < 19 ? `m-seg s-acc${i > 15 ? ' m-seg-hot' : ''}` : 'grid-faint';
      s += `<line class="${cls}" x1="${n(C + Math.cos(a) * r1)}" y1="${n(H + Math.sin(a) * r1)}" x2="${n(C + Math.cos(a) * r2)}" y2="${n(H + Math.sin(a) * r2)}" stroke-width="3" stroke-linecap="round" style="animation-delay:${n(i * 0.03)}s"/>`;
    }
    s += `<path d="M${n(C + Math.cos(3.49) * 156)} ${n(H + Math.sin(3.49) * 156)}A156 156 0 0 1 ${n(C + Math.cos(5.93) * 156)} ${n(H + Math.sin(5.93) * 156)}" class="grid-faint" fill="none"/>`;
    s += `<path d="M294 ${H} L306 ${H} L548 600 L52 600 Z" fill="#04061A" fill-opacity=".88"/>`;
    s += `<path d="M294 ${H} L52 600 M306 ${H} L548 600" class="s-acc" stroke-width="2.2" fill="none"/>`;
    s += `<line class="m-lane s-acc" x1="298" y1="${H}" x2="218" y2="600"/><line class="m-lane s-acc" x1="302" y1="${H}" x2="382" y2="600"/>`;
    // radar arcs from the ego vehicle
    [0, 1, 2].forEach(i => { s += `<path class="m-arc s-acc" fill="none" stroke-width="2" d="M190 600 A110 110 0 0 1 410 600" style="animation-delay:-${i * 0.8}s"/>`; });
    // tagged objects
    s += `<g class="m-obj"><rect x="276" y="402" width="48" height="26" rx="4" class="f-acc" fill-opacity=".14"/><rect x="276" y="402" width="48" height="26" rx="4" fill="none" class="s-acc" stroke-width="1.4"/>`;
    s += `<rect x="281" y="418" width="9" height="4" rx="1" class="f-acc"/><rect x="310" y="418" width="9" height="4" rx="1" class="f-acc"/>`;
    s += brackets(268, 394, 64, 42, 8) + `<rect x="268" y="380" width="64" height="12" rx="2" class="f-acc"/><text x="272" y="389" class="t-ink">CAR 38 m</text></g>`;
    s += `<g class="m-obj m-obj-2"><circle cx="212" cy="384" r="3.4" class="f-acc"/><path d="M212 388v11M212 399l-4 9M212 399l4 9M206 392h12" class="s-acc" stroke-width="1.6" fill="none"/>${brackets(202, 377, 20, 36, 6)}<text x="212" y="371" class="t" text-anchor="middle">PED</text></g>`;
    s += `<g class="m-obj m-obj-3"><line x1="410" y1="${H}" x2="410" y2="346" class="s-acc" stroke-width="1.6"/><circle cx="410" cy="336" r="10" fill="#050818" class="s-acc" stroke-width="1.8"/><text x="410" y="339.5" class="t-acc t-tiny" text-anchor="middle">60</text>${brackets(396, 322, 28, 54, 6)}</g>`;
    s += `<g class="m-obj">${brackets(292, 377, 16, 11, 4)}</g>`;
    // HUD
    s += `<text x="300" y="186" class="t" text-anchor="middle">L2+ ADAS · LANE OK</text>`;
    s += `<text x="300" y="566" class="t t-hi" text-anchor="middle">72 km/h</text>`;
    return s + '</g>';
  }

  const ILLUS = { video, audio, edgeai, xr, security, auto: automotive };

  /* ------------------------------------------------------------------ */
  function build(svg) {
    seed = 11;
    svg.innerHTML = `${defs()}
      <g clip-path="url(#cp-port)">
        <rect width="600" height="600" fill="url(#rg-sky)"/>
        ${stars()}
        <g clip-path="url(#cp-sky)">
          <circle cx="300" cy="${H}" r="200" fill="url(#rg-halo)"/>
          <circle class="sun" cx="300" cy="${H}" r="100" fill="url(#lg-sun)" mask="url(#mk-sun)"/>
        </g>
        ${floor()}
        <line class="horizon-glow" x1="0" y1="${H}" x2="600" y2="${H}"/>
        <line class="horizon" x1="0" y1="${H}" x2="600" y2="${H}"/>
        ${Object.keys(ILLUS).map(k => ILLUS[k]()).join('')}
      </g>
      ${ring()}`;

    const floorLines = [...svg.querySelectorAll('[data-floor-h] line')];
    const meridians = [...svg.querySelectorAll('[data-meridians] ellipse')].map(e => ({ el: e, ph: +e.dataset.phase }));
    const R = 108;

    /* Per-frame updates that CSS can't express: the floor rushing toward the
       viewer (perspective-correct spacing) and the XR globe's rotation. */
    function tick(t, active) {
      const N = floorLines.length;
      floorLines.forEach((l, i) => {
        const p = ((i + t * 0.6) % N) / N;
        const y = H + (600 - H) * Math.pow(p, 2.4);
        l.setAttribute('y1', n(y)); l.setAttribute('y2', n(y));
        l.style.opacity = Math.min(1, p * 2.6).toFixed(2);
      });
      if (active === 'xr') {
        meridians.forEach(m => m.el.setAttribute('rx', n(Math.abs(Math.cos(m.ph + t * 0.7)) * R)));
      }
    }
    tick(0, 'xr');
    return { tick };
  }

  window.IttiamStage = { build };
})();
