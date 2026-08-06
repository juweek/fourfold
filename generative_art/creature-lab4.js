/* Fourfold — Creature Lab v4
   Round 4 shares one anatomy engine between the faceted and Ink & Spore surfaces.
   Cast: squirrel, lion, eagle, panda bard, reclining beaver engineer.
   The engine intentionally emits serializable SVG descriptor trees. window.CreatureLab4 */
window.CreatureLab4 = (function () {
  "use strict";

  var W = 220, H = 250, TAU = Math.PI * 2;
  var PAL = { ink: '#101218', bone: '#EDE6D6', boneD: '#BFB6A2', gold: '#D9A441', goldD: '#B08430', dark: '#15121B', muted: '#8B90A0', deep: '#0B0D14' };
  var LIGHT = { dx: .58, dy: .81 };

  var D3 = {
    squirrel: {
      key: 'squirrel', name: 'Squirrel Summoner', short: 'Squirrel', domain: 'Gourmet Data', mood: 'bright',
      c3: '#7FE7B4', c5: '#34C784', c7: '#1F8A59', fur: '#A9765C', furD: '#6F4429',
      sig: 'paint on the tail tip, one plant species per streak week, moss with 30-day XP'
    },
    lion: {
      key: 'lion', name: 'Lion Warrior', short: 'Lion', domain: 'Body', mood: 'fierce',
      c3: '#FF8A6B', c5: '#E4593D', c7: '#A63A26', fur: '#C98A55', furD: '#83512B',
      sig: 'pumped build + mane fullness from streak, claw extension and radiant smirk from momentum'
    },
    bird: {
      key: 'bird', name: 'Eagle Scholar', short: 'Eagle', domain: 'Finance', mood: 'studious',
      c3: '#FFE08A', c5: '#F2C13E', c7: '#A8761A', fur: '#F9EFC8', furD: '#C29A3C',
      sig: 'three feather rows scale with level; the slab plots the real 30-day trend'
    },
    panda: {
      key: 'panda', name: 'Panda Bard', short: 'Panda', domain: 'Enjoyment', mood: 'happy',
      c3: '#F2CD7E', c5: '#D9A441', c7: '#8C6235', fur: '#EDE6D6', furD: '#8C8270',
      sig: 'oversized gourd fill, bronze jewellery and smile arc all read joy'
    },
    beaver: {
      key: 'beaver', name: 'Beaver Engineer', short: 'Beaver', domain: 'Systems', mood: 'studious',
      c3: '#9DE6D8', c5: '#3EAD98', c7: '#27685E', fur: '#9A6846', furD: '#573A2A',
      sig: 'single brass monocle-goggle; tools and foreground stick field grow with level and streak'
    }
  };
  var ORDER3 = ['squirrel', 'lion', 'bird', 'panda', 'beaver'];

  /* ---------- utils ---------- */
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function hash(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) { var a = hash(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { function f(n) { var s = Math.round(clamp(n, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; } return '#' + f(r) + f(g) + f(b); }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    function q(p, q2, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q2 - p) * 6 * t; if (t < .5) return q2; if (t < 2 / 3) return p + (q2 - p) * (2 / 3 - t) * 6; return p; }
    if (!s) return [l * 255, l * 255, l * 255];
    var b = l < .5 ? l * (1 + s) : l + s - l * s, a = 2 * l - b;
    return [q(a, b, h + 1 / 3) * 255, q(a, b, h) * 255, q(a, b, h - 1 / 3) * 255];
  }
  function tone(hex, sm, lm) { var c = hex2rgb(hex), h = rgb2hsl(c[0], c[1], c[2]), o = hsl2rgb(h[0], clamp(h[1] * sm), clamp(h[2] * lm, .03, .97)); return rgb2hex(o[0], o[1], o[2]); }
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function f2(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }

  /* ---------- geometry ---------- */
  function poly(pts) { return 'M' + pts.map(f2).join(' L') + ' Z'; }
  function open(pts) { return 'M' + pts.map(f2).join(' L'); }
  function smooth(pts, closed) {
    var n = pts.length, d, i, p0, p1, p2, p3, c1, c2;
    if (n < 3) return open(pts);
    d = 'M' + f2(pts[0]);
    for (i = 0; i < (closed ? n : n - 1); i++) {
      p1 = pts[i]; p2 = pts[(i + 1) % n];
      p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
      p3 = closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
      c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + f2(c1) + ' ' + f2(c2) + ' ' + f2(p2);
    }
    return d + (closed ? ' Z' : '');
  }
  function ring(cx, cy, rx, ry, prof, n, rnd, jit) {
    var out = [], i, a, m;
    for (i = 0; i < n; i++) {
      a = (i / n) * TAU - Math.PI / 2;
      m = prof ? prof(i / n, a) : 1;
      if (jit && rnd) m *= 1 + (rnd() - .5) * jit;
      out.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    return out;
  }
  function ribbon(line, w0, w1, ease) {
    var L = [], R = [], i, n = line.length, p, a, b, dx, dy, m, nx, ny, w, s;
    for (i = 0; i < n; i++) {
      p = line[i]; a = line[Math.max(0, i - 1)]; b = line[Math.min(n - 1, i + 1)];
      dx = b[0] - a[0]; dy = b[1] - a[1]; m = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = -dy / m; ny = dx / m; s = i / (n - 1);
      w = w0 + (w1 - w0) * (ease ? s * s : s);
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
    }
    return L.concat(R.reverse());
  }
  function bend(x, y, ang, len, curl, segs, rnd, phase, grav) {
    var out = [], i, a = ang, cx = x, cy = y, step = len / segs;
    for (i = 0; i <= segs; i++) {
      out.push([cx, cy]);
      a += curl * .4 * Math.sin(i * .8 + (phase || 0)) + (rnd ? (rnd() - .5) * .09 : 0) + (grav || 0) * (i / segs);
      cx += Math.cos(a) * step; cy += Math.sin(a) * step;
    }
    return out;
  }
  function centroid(pts) { var x = 0, y = 0, i; for (i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; } return [x / pts.length, y / pts.length]; }
  function uOf(p, c) { return (p[0] - c[0]) * LIGHT.dx + (p[1] - c[1]) * LIGHT.dy; }
  function clipHalf(pts, c, t, keepBelow) {
    // Sutherland-Hodgman against the plane u = t
    var out = [], n = pts.length, i, A, B, ua, ub, s;
    for (i = 0; i < n; i++) {
      A = pts[i]; B = pts[(i + 1) % n];
      ua = uOf(A, c) - t; ub = uOf(B, c) - t;
      if (keepBelow) { ua = -ua; ub = -ub; }
      if (ua <= 0) out.push(A);
      if ((ua <= 0) !== (ub <= 0)) { s = ua / (ua - ub); out.push([A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]); }
    }
    return out;
  }
  function bands(pts, k) {
    var c = centroid(pts), i, mn = 1e9, mx = -1e9, u, out = [], lo, hi2, band;
    for (i = 0; i < pts.length; i++) { u = uOf(pts[i], c); if (u < mn) mn = u; if (u > mx) mx = u; }
    for (i = 0; i < k; i++) {
      lo = mn + (mx - mn) * (i / k); hi2 = mn + (mx - mn) * ((i + 1) / k);
      band = clipHalf(clipHalf(pts, c, lo, true), c, hi2, false);
      if (band.length > 2) out.push(band);
    }
    return out;
  }
  function litEdge(pts, amount) {
    var c = centroid(pts), i, mn = 1e9, mx = -1e9, u = [], seq = [], start, j;
    for (i = 0; i < pts.length; i++) { u.push(uOf(pts[i], c)); if (u[i] < mn) mn = u[i]; if (u[i] > mx) mx = u[i]; }
    var thr = mn + (mx - mn) * amount;
    start = u.indexOf(mx);
    for (i = 0; i < pts.length; i++) { j = (start + i) % pts.length; if (u[j] < thr) seq.push(pts[j]); }
    return seq.length > 1 ? seq : null;
  }
  function bbox(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
    for (i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); y0 = Math.min(y0, pts[i][1]); x1 = Math.max(x1, pts[i][0]); y1 = Math.max(y1, pts[i][1]); }
    return [x0, y0, x1, y1];
  }
  function inset(pts, k) { var c = centroid(pts), i, o = []; for (i = 0; i < pts.length; i++) o.push([pts[i][0] + (c[0] - pts[i][0]) * k, pts[i][1] + (c[1] - pts[i][1]) * k]); return o; }

  /* ---------- signals -> drawing properties ---------- */
  var SIGNALS = [
    { id: 'momentum', label: 'Momentum', hint: 'trailing 7-day XP ÷ pace', min: 0, max: 1, step: .01 },
    { id: 'vitality', label: 'Vitality', hint: '30-day completion rate', min: 0, max: 1, step: .01 },
    { id: 'volatility', label: 'Volatility', hint: 'stdev of daily score, 14d', min: 0, max: 1, step: .01 },
    { id: 'streak', label: 'Streak', hint: 'consecutive days with a completion', min: 0, max: 30, step: 1 },
    { id: 'neglect', label: 'Days idle', hint: 'days since last completion', min: 0, max: 9, step: 1 },
    { id: 'level', label: 'Level', hint: 'domain level 1–10 → tier I/II/III', min: 1, max: 10, step: 1 }
  ];
  function vitals(inp) {
    var i = { momentum: .72, vitality: .82, volatility: .26, streak: 9, neglect: 0, level: 6, seed: 'r3' }, k;
    for (k in inp) if (inp[k] !== undefined) i[k] = inp[k];
    var dorm = clamp(i.neglect / 7), tier = i.level >= 7 ? 3 : i.level >= 4 ? 2 : 1;
    var state = i.resting ? 'resting' : 'steady';
    if (!i.resting && i.neglect >= 5) state = 'dormant';
    else if (!i.resting && i.neglect >= 3) state = 'slipping';
    else if (!i.resting && i.streak >= 7 && i.momentum >= .62) state = 'radiant';
    else if (!i.resting && i.neglect >= 1) state = 'drifting';
    return {
      input: i, tier: tier, state: state, dorm: dorm,
      sat: clamp(.34 + .92 * i.vitality - .66 * dorm, .05, 1.3),
      lum: clamp(.9 + .2 * i.vitality - .22 * dorm, .6, 1.12),
      droop: +(9 * dorm).toFixed(2),
      gold: clamp(i.streak / 21),
      ornament: Math.round(3 + 9 * clamp(i.streak / 14) + 5 * (tier - 1) + 4 * i.momentum),
      aura: clamp((i.streak >= 7 ? .3 : 0) + .5 * i.momentum - .55 * dorm),
      emissive: clamp(.12 + .82 * i.momentum - .6 * dorm),
      rim: clamp(.28 + .6 * i.vitality - .4 * dorm),
      spec: clamp(.2 + .7 * i.vitality - .5 * dorm),
      bulk: clamp(i.streak / 18),
      curl: clamp(.3 + .6 * i.volatility + .2 * i.momentum, 0, 1.3),
      joy: clamp(i.momentum * .55 + i.vitality * .55 - dorm * .8),
      fur: clamp(.35 + .65 * i.vitality),
      species: 1 + Math.min(3, Math.floor(i.streak / 7)),
      dust: Math.round(clamp(dorm * 1.25) * 10),
      fog: clamp(.06 + .55 * dorm),
      density: clamp(.2 + .62 * (1 - i.vitality) + .3 * dorm),
      bite: clamp(.34 + .2 * (1 - i.vitality)),
      spores: Math.round(2 + 8 * clamp(.12 + .82 * i.momentum - .6 * dorm)),
      toolCount: Math.min(5, 1 + tier + Math.floor(i.streak / 7)),
      stickCount: Math.min(14, 7 + tier + Math.floor(i.streak / 4)),
      seed: i.seed
    };
  }
  var STATES = {
    resting: { label: 'Resting', note: 'the new-day pose — neutral vitality with eyes closed', color: '#8B90A0' },
    radiant: { label: 'Radiant', note: 'streak ≥ 7, momentum ≥ .62 — seams lit, gold facets, ornament peaks', color: PAL.gold },
    steady: { label: 'Steady', note: 'active today or yesterday — the neutral read', color: '#8B90A0' },
    drifting: { label: 'Drifting', note: '1–2 days idle — seam glow fades, specular dulls', color: '#7FA8C8' },
    slipping: { label: 'Slipping', note: '3–4 days idle — posture sags, facets flatten, motes appear', color: '#C8A06B' },
    dormant: { label: 'Dormant', note: '5+ days idle — desaturated, fogged, no seam light', color: '#6E7382' }
  };
  var PRESETS = {
    resting: { momentum: .62, vitality: .78, volatility: .3, streak: 5, neglect: 0, level: 5, resting: true },
    radiant: { momentum: .95, vitality: .95, volatility: .18, streak: 18, neglect: 0, level: 9 },
    steady: { momentum: .62, vitality: .78, volatility: .3, streak: 5, neglect: 0, level: 5 },
    drifting: { momentum: .38, vitality: .6, volatility: .45, streak: 0, neglect: 2, level: 4 },
    slipping: { momentum: .2, vitality: .42, volatility: .62, streak: 0, neglect: 4, level: 3 },
    dormant: { momentum: .05, vitality: .22, volatility: .3, streak: 0, neglect: 7, level: 3 }
  };
  function series(v, n) {
    var r = prng(v.seed + '|s'), out = [], i, base = v.input.vitality, trend, noise;
    for (i = 0; i < n; i++) {
      trend = base * (.55 + .45 * (i / (n - 1)) * (.4 + v.input.momentum));
      noise = (r() - .5) * 1.5 * v.input.volatility;
      out.push(clamp(trend + noise, .05, 1));
    }
    for (i = n - Math.min(n, v.input.neglect); i < n; i++) out[i] = .04;
    return out;
  }
  function skin(key, v) {
    var D = D3[key], s = v.sat, l = v.lum, ash = v.dorm * .6;
    function T(c) { return mix(tone(c, s, l), PAL.muted, ash * .55); }
    return {
      shadow: 'rgba(0,0,0,' + (.4 - v.dorm * .16).toFixed(2) + ')',
      fur: T(D.fur), furD: T(D.furD), furL: tone(T(D.fur), .92, 1.15),
      bone: T(PAL.bone), boneD: T(PAL.boneD), ink: mix('#191C24', '#3A3F4E', .1 + v.dorm * .28), dark: PAL.dark,
      c3: T(D.c3), c5: T(D.c5), c7: T(D.c7),
      gold: mix(T(PAL.gold), PAL.muted, (1 - v.gold) * .4), goldD: T(PAL.goldD),
      glow: tone(T(D.c3), 1.1, 1.16), eye: '#120F16', muted: PAL.muted,
      moss: T('#3E8C5A'), paint: T('#2FC57E'), sake: T('#E9E2D0'), wood: T('#8A6141'), deep: PAL.deep
    };
  }

  /* ---------- anime eye, angular ---------- */
  function eyeParts(P, x, y, r, mood, v, flip) {
    var sh = flip ? -1 : 1, closed = v.state === 'resting' || (mood === 'happy' && v.joy > .84) || v.dorm > .82, lod = P.lod;
    function push(o, feature) { o.z = 7; o.grp = 'face'; o.mat = 'flat'; o.feature = feature || 'eye-essential'; P.parts.push(o); }
    if (closed) {
      push({ k: 'p', d: 'M' + (x - r) + ',' + (y + r * .1) + ' Q' + x + ',' + (y - r * (mood === 'happy' ? .95 : .2)) + ' ' + (x + r) + ',' + (y + r * .1), tone: 'eye', sw: r * .34, cap: 'round', fill: false });
      if (mood === 'happy') push({ k: 'p', d: 'M' + (x - r * .7) + ',' + (y + r * .72) + ' Q' + x + ',' + (y + r * 1.08) + ' ' + (x + r * .7) + ',' + (y + r * .72), tone: 'c5', sw: r * .18, cap: 'round', fill: false, op: .5 }, 'eye-detail');
      return;
    }
    var squint = mood === 'fierce' ? .48 : mood === 'studious' ? .18 : v.dorm > .5 ? .34 : .05;
    push({ k: 'poly', pts: ring(x, y, r, r * (1 - squint), function (t, a) { return 1 - .14 * Math.abs(Math.cos(a)); }, 9), tone: 'bone' });
    var ir = r * .8, iy = y + r * .05, irisX = mood === 'fierce' ? x - sh * r * .13 : x + sh * r * .05;
    push({ k: 'poly', pts: ring(irisX, iy, ir, ir * (1 - squint * .7), null, 8), tone: 'c5' });
    push({ k: 'poly', pts: ring(irisX, iy - ir * .3, ir * .92, ir * .5, null, 7), tone: 'c7', op: .92 }, 'eye-detail');
    push({ k: 'poly', pts: ring(irisX, iy + ir * .42, ir * .78, ir * .34, null, 7), tone: 'glow', op: .85 }, 'eye-detail');
    push({ k: 'poly', pts: ring(irisX, iy, ir * .4, ir * .46, null, 7), tone: 'eye' });
    push({ k: 'poly', pts: [[x - sh * r * .52, y - r * .5], [x - sh * r * .1, y - r * .42], [x - sh * r * .2, y - r * .1], [x - sh * r * .58, y - r * .18]], tone: 'bone', op: .96 }, 'eye-detail');
    if (lod > .6) push({ k: 'poly', pts: ring(x + sh * r * .36, y + r * .36, r * .13, r * .11, null, 6), tone: 'bone', op: .55 }, 'eye-detail');
    push({
      k: 'p', tone: 'ink', sw: r * .32, cap: 'round', fill: false,
      d: 'M' + (x - r * 1.06) + ',' + (y - r * .12) + ' Q' + (x - sh * r * .12) + ',' + (y - r * (1 - squint)) + ' ' + (x + r * 1.06) + ',' + (y - r * (mood === 'fierce' ? -.14 : .06))
    });
    if (mood === 'fierce') push({ k: 'poly', pts: [[x - r * 1.42, y - r * 1.92], [x + r * 1.26, y - r * 1.3], [x + r * 1.06, y - r * .84], [x - r * 1.34, y - r * 1.42]], tone: 'furD' });
    if (mood === 'studious') push({ k: 'poly', pts: [[x - r * 1.25, y - r * 1.5], [x + r * 1.15, y - r * 1.2], [x + r, y - r * .92], [x - r * 1.2, y - r * 1.12]], tone: 'furD', op: .9 });
  }

  /* ---------- BUILD ---------- */
  function build(key, v, lod) {
    var D = D3[key], t = v.tier, r = prng(v.seed + '|' + key), i, n, a, L;
    var P = { parts: [], C: skin(key, v), lod: lod === undefined ? 1 : lod };
    var LOD = P.lod, FULL = LOD > .6;
    function LN(x) { return Math.max(1, Math.round(x * (.38 + .62 * LOD))); }
    function pl(pts, tn, z, grp, o) { var q = { k: 'poly', pts: pts, tone: tn, z: z, grp: grp || 'body', mat: 'plate' }; if (o) for (var kk in o) q[kk] = o[kk]; P.parts.push(q); return q; }
    function sm(pts, tn, z, grp, o) { var q = { k: 'poly', pts: pts, tone: tn, z: z, grp: grp || 'body', mat: 'plate', soft: 1 }; if (o) for (var kk in o) q[kk] = o[kk]; P.parts.push(q); return q; }
    function rb(line, w0, w1, tn, z, grp, o) { return pl(ribbon(line, w0, w1, o && o.ease), tn, z, grp, Object.assign({ mat: 'skin' }, o || {})); }
    function pth(d, tn, z, grp, o) { var q = { k: 'p', d: d, tone: tn, z: z, grp: grp || 'body', mat: 'flat' }; if (o) for (var kk in o) q[kk] = o[kk]; P.parts.push(q); }
    function glow(x, y, rr, tn, ii, z) { P.parts.push({ k: 'glow', x: x, y: y, r: rr, tone: tn || 'glow', i: ii === undefined ? 1 : ii, z: z === undefined ? 8 : z, grp: 'sig', mat: 'flat' }); }

    pl(ring(110, 232, 52 + 6 * t, 7, null, 10), 'shadow', 0, 'back', { mat: 'flat' });

    /* ====================== SQUIRREL ====================== */
    if (key === 'squirrel') {
      var tail = bend(138, 212, -1.36, 118, .66, 10, r, .6);
      // furry tail: overlapping angular locks along the spine, paint only on the last stretch
      pl(ribbon(tail, 17 + 2 * t, 8), 'furD', 1, 'tail');
      pl(ribbon(tail.slice(0, 8), 12 + 2 * t, 6), 'fur', 1, 'tail');
      n = LN(32);
      for (i = 0; i < n; i++) {
        var ft = .1 + (i / n) * .9, ti = Math.min(tail.length - 2, Math.floor(ft * (tail.length - 1)));
        var pA = tail[ti], pB = tail[ti + 1];
        var ang = Math.atan2(pB[1] - pA[1], pB[0] - pA[0]) + (i % 2 ? 1 : -1) * (1.85 + r() * .45);
        var flen = 9 + 5 * r() + 10 * v.fur;
        var painted = ft > .9;
        pl(ribbon(bend(pA[0], pA[1], ang, flen, .3, 3, r, i), 8 + r() * 3.5, 1.2, true),
          painted ? 'paint' : (i % 3 === 0 ? 'furL' : 'fur'), 1, 'tail', { mat: 'skin' });
      }
      var tip = tail.slice(9);
      pl(ribbon(tip, 10, 4), 'paint', 1, 'tail', { op: .95 });
      for (i = 0; i < (FULL ? 3 : 1); i++) {
        var dp = tip[Math.min(tip.length - 1, i)], dl = 9 + r() * 16;
        pl(ribbon([[dp[0] + (r() - .5) * 7, dp[1]], [dp[0] + (r() - .5) * 5, dp[1] + dl]], 2.2, 1.2), 'paint', 1, 'tail', { op: .9, mat: 'flat' });
        pl(ring(dp[0] + (r() - .5) * 5, dp[1] + dl + 2, 2.4, 3, null, 7), 'paint', 1, 'tail', { mat: 'flat' });
      }
      for (i = 0; i < (FULL ? 3 : 1); i++) pl(ring(62 + i * 42 + r() * 12, 229 + r() * 4, 8 + r() * 8, 3, null, 8, r, .5), i % 2 ? 'paint' : 'moss', 1, 'back', { mat: 'flat', op: .45 });
      rb([[94, 194], [92, 212], [90, 224]], 12, 10, 'furD', 2, 'lower');
      rb([[124, 194], [126, 212], [128, 224]], 12, 10, 'furD', 2, 'lower');
      pl(ring(88, 228, 13, 5.5, null, 8), 'furD', 2, 'lower');
      pl(ring(130, 228, 13, 5.5, null, 8), 'furD', 2, 'lower');
      pl([[80, 152], [96, 140], [122, 140], [138, 152], [142, 182], [130, 206], [110, 214], [90, 206], [78, 182]], 'fur', 3, 'body');
      pl([[94, 158], [116, 156], [124, 182], [112, 206], [98, 204], [88, 182]], 'bone', 4, 'body');
      pl(ring(126, 154, 12, 9, null, 8, r, .3), 'moss', 4, 'body', { op: .8, mat: 'skin' });
      pl(ring(92, 164, 8.5, 6.5, null, 7, r, .3), 'moss', 4, 'body', { op: .6, mat: 'skin' });
      rb([[84, 156], [86, 140], [98, 136]], 9, 7, 'fur', 5, 'body');
      rb([[132, 156], [130, 140], [118, 136]], 9, 7, 'fur', 5, 'body');
      pl(ring(96, 135, 8, 7, null, 7), 'fur', 5, 'body');
      pl(ring(120, 135, 8, 7, null, 7), 'fur', 5, 'body');
      pl(ribbon(bend(89, 84, -1.4, 21, .5, 4, r, 0), 9, 2.4), 'fur', 4, 'head');
      pl(ribbon(bend(123, 82, -1.68, 21, -.5, 4, r, 1), 9, 2.4), 'fur', 4, 'head');
      pl(ring(106, 103, 30, 28, function (t2, ang2) { return 1 - .08 * Math.max(0, Math.sin(ang2)); }, 12, r, .03), 'fur', 6, 'head');
      pl(ring(100, 118, 12, 9, null, 8), 'bone', 6, 'head');
      pth('M100,112 L104,109 L107,113 L100,118 L93,113 L96,109 Z', 'eye', 7, 'face');
      eyeParts(P, 96, 101, 6.4, 'bright', v, 1); eyeParts(P, 118, 99, 6.4, 'bright', v, 0);
      pl(ring(108, 144, 9.5, 10.5, null, 8), 'gold', 7, 'body');
      pth('M99,139 L108,133 L117,139 L117,142 L108,137 L99,142 Z', 'goldD', 7, 'body');
      for (i = 0; i < t; i++) pth('M108,144 m-' + (17 + i * 7) + ',0 a' + (17 + i * 7) + ',' + (17 + i * 7) + ' 0 1,0 ' + (34 + i * 14) + ',0 a' + (17 + i * 7) + ',' + (17 + i * 7) + ' 0 1,0 -' + (34 + i * 14) + ',0', 'c3', 8, 'sig', { sw: 1.5 - i * .3, fill: false, op: .42 });
      n = Math.min(10, LN(1.5 + v.input.streak * .55 + (t - 1)));
      for (i = 0; i < n; i++) {
        var onBack = i % 3 === 2, sd = i % 2 ? 1 : -1;
        var px = onBack ? 108 + sd * (10 + r() * 18) : 110 + sd * (34 + (i * 11) % 46 + r() * 10);
        var py = onBack ? 148 + r() * 10 : 226 - (i % 3) * 3;
        var ph = 20 + r() * 28 + 10 * v.input.vitality, sp = i % v.species;
        var zz = onBack ? 5 : 2, gg = onBack ? 'body' : 'lower';
        var st = bend(px, py, -Math.PI / 2 + sd * .2, ph, .45 + r() * .45, 4, r, i);
        pl(ribbon(st, 2.6, 1.1), 'moss', zz, gg, { mat: 'flat' });
        var tp = st[st.length - 1];
        if (sp === 0) {
          for (var j = 0; j < (FULL ? 4 : 2); j++) {
            var lf = st[Math.max(1, st.length - 1 - j)];
            pl([[lf[0], lf[1]], [lf[0] + sd * (8 - j) * 1.5, lf[1] - 4], [lf[0] + sd * (8 - j) * 1.1, lf[1] + 1]], j % 2 ? 'c3' : 'c5', zz, gg, { mat: 'skin' });
            pl([[lf[0], lf[1]], [lf[0] - sd * (8 - j) * 1.4, lf[1] - 3], [lf[0] - sd * (8 - j) * 1, lf[1] + 2]], j % 2 ? 'c5' : 'c3', zz, gg, { mat: 'skin' });
          }
        } else if (sp === 1) {
          pl(ring(tp[0], tp[1] - 3, 4.4, 7, null, 7, r, .2), 'c3', zz, gg, { mat: 'skin' });
          pl(ring(tp[0] - sd * 7, tp[1] + 3, 5.6, 3.4, null, 7, r, .2), 'c5', zz, gg, { mat: 'skin' });
          pl(ring(tp[0] + sd * 7, tp[1] + 5, 5, 3, null, 7, r, .2), 'c7', zz, gg, { mat: 'skin' });
        } else if (sp === 2) {
          pl(ring(tp[0], tp[1] - 4, 5.4, 6.4, null, 8), 'c5', zz, gg, { mat: 'skin' });
          for (var q2 = 0; q2 < 5; q2++) { var qa = -Math.PI / 2 + (q2 - 2) * .5; pl(ring(tp[0] + Math.cos(qa) * 8, tp[1] - 4 + Math.sin(qa) * 8, 3, 4.4, null, 6), q2 % 2 ? 'c3' : 'paint', zz, gg, { mat: 'flat', op: .9 }); }
          if (v.gold > .5) pl(ring(tp[0], tp[1] - 4, 2.6, 2.6, null, 6), 'gold', zz, gg, { mat: 'flat' });
        } else {
          pl(ring(tp[0], tp[1] - 5, 6.2, 6.2, null, 8), 'c7', zz, gg, { mat: 'skin' });
          for (var q3 = 0; q3 < 4; q3++) pl(ring(tp[0] + (r() - .5) * 16, tp[1] - 14 - r() * 12, 1.5, 1.5, null, 5), 'c3', zz, 'sig', { mat: 'flat', op: .7 });
          if (v.emissive > .5) glow(tp[0], tp[1] - 5, 11, 'c3', v.emissive * .7);
        }
      }
    }

    /* ====================== LION ====================== */
    if (key === 'lion') {
      // The warrior always starts broad; streak adds definition instead of deciding
      // whether he is muscular at all.
      var bulk = .58 + .42 * v.bulk, soft = 1 - v.bulk, def = clamp(.45 + .55 * v.bulk);
      pl(ribbon(bend(150, 202, -.3, 60, .7 * v.curl, 6, r, 1.4), 5.5, 2), 'fur', 1, 'back', { mat: 'skin' });
      pl(ribbon(bend(196, 176, -1.1, 22, .8, 4, r, 2), 8, 1.6, true), 'c7', 1, 'back', { mat: 'skin' });
      // legs
      pl([[86, 188], [104, 188], [102, 214], [106, 226], [82, 226], [80, 208]], 'furD', 2, 'lower');
      pl([[118, 188], [136, 188], [140, 208], [138, 226], [114, 226], [118, 214]], 'furD', 2, 'lower');
      // torso: angular, wide chest -> narrower waist
      var TW = 1 + .16 * bulk;
      pl([[72 - 6 * bulk, 142], [90, 126], [110, 122], [130, 126], [148 + 6 * bulk, 142],
      [152 * TW - 22, 166], [144, 194], [124, 210], [96, 210], [76, 194], [68 * TW + 4, 166]], 'fur', 3, 'body');
      // muscle plates
      pl([[86, 134], [107, 130], [109, 154], [90, 158]], 'furL', 4, 'body', { op: (.55 + .4 * def).toFixed(2), mat: 'plate' });
      pl([[111, 130], [134, 136], [131, 159], [111, 154]], 'furL', 4, 'body', { op: (.55 + .4 * def).toFixed(2), mat: 'plate' });
      pl([[108, 130], [112, 130], [111, 200], [108, 200]], 'furD', 4, 'body', { op: (.3 + .4 * def).toFixed(2), mat: 'flat' });
      for (i = 0; i < 3; i++) {
        var ay = 162 + i * 13, aw = 15 - i * 2.4;
        pl([[110 - aw, ay], [110 - 2, ay + 1], [110 - 2, ay + 10], [110 - aw + 1, ay + 9]], 'furL', 4, 'body', { op: (.3 + .45 * def).toFixed(2), mat: 'plate' });
        pl([[110 + 2, ay + 1], [110 + aw, ay], [110 + aw - 1, ay + 9], [110 + 2, ay + 10]], 'furL', 4, 'body', { op: (.3 + .45 * def).toFixed(2), mat: 'plate' });
      }
      if (soft > .45) pl(ring(110, 194, 24 * soft + 12, 19, null, 9), 'furD', 4, 'body', { op: .38, mat: 'skin' });
      // arms + claws
      pl(ribbon([[76, 144], [58, 172], [66, 200]], 15 + 9 * bulk, 10), 'fur', 5, 'body');
      pl(ring(66, 207, 13, 12, null, 8, r, .1), 'fur', 5, 'body');
      pl(ribbon([[144, 142], [168, 120], [172, 98]], 14 + 9 * bulk, 9), 'fur', 5, 'body');
      pl(ring(174, 92, 12, 11, null, 8, r, .1), 'fur', 5, 'body');
      pl([[67, 142], [79, 127], [94, 132], [86, 151]], 'furL', 5, 'body', { op: (.34 + .38 * def).toFixed(2) });
      pl([[128, 131], [145, 126], [158, 139], [143, 151]], 'furL', 5, 'body', { op: (.34 + .38 * def).toFixed(2) });
      var cl = 5 + 5 * v.input.momentum;
      for (i = 0; i < 4; i++) {
        var ca = 1.05 + i * .38;
        pl([[66 + Math.cos(ca) * 11, 207 + Math.sin(ca) * 10], [66 + Math.cos(ca) * (11 + cl), 207 + Math.sin(ca) * (10 + cl) + 2], [66 + Math.cos(ca + .16) * 11, 207 + Math.sin(ca + .16) * 10]], 'bone', 5, 'body', { mat: 'flat' });
        var ca2 = -1.9 + i * .36;
        pl([[174 + Math.cos(ca2) * 10, 92 + Math.sin(ca2) * 9], [174 + Math.cos(ca2) * (10 + cl), 92 + Math.sin(ca2) * (9 + cl) - 2], [174 + Math.cos(ca2 + .15) * 10, 92 + Math.sin(ca2 + .15) * 9]], 'bone', 5, 'body', { mat: 'flat' });
      }
      pl(ribbon([[152, 130], [163, 124]], 6, 6), 'gold', 6, 'body', { mat: 'plate' });
      pth('M80,140 L110,156 L142,136 L144,146 L110,166 L78,150 Z', 'c7', 6, 'body');
      pl(ring(126, 150, 6.5, 6.5, null, 6), 'gold', 6, 'body');
      // MANE — full and droopy: broad locks, gravity-weighted, longer at the sides and bottom
      n = LN(20 + v.ornament * .7);
      var pal = ['c5', 'c3', 'c7', 'gold', 'c5', 'c7', 'c3'];
      for (i = 0; i < n; i++) {
        a = (i / n) * TAU + r() * .1;
        var down = Math.max(0, Math.sin(a));                    // 1 at the bottom
        L = (24 + 10 * (t - 1) + r() * 12 + 12 * v.input.vitality) * (.72 + .8 * down);
        var mx = 106 + Math.cos(a) * 23, my = 100 + Math.sin(a) * 22;
        var grav = .16 + .22 * (1 - down);
        pl(ribbon(bend(mx, my, a + (r() - .5) * .35, L, v.curl * .9, 5, r, i * .7, grav), 9 + r() * 3.5, 1.6, true),
          (t === 3 && i % 6 === 0) ? 'gold' : pal[i % pal.length], 4, 'mane', { mat: 'skin' });
      }
      if (FULL) for (i = 0; i < Math.round(n * .34); i++) {
        a = .5 + (i / (n * .34)) * (TAU * .62);
        pl(ribbon(bend(106 + Math.cos(a) * 17, 101 + Math.sin(a) * 16, a, 15 + r() * 8, v.curl * .9, 4, r, i, .26), 7.5, 1.3, true), i % 2 ? 'c7' : 'c5', 4, 'mane', { mat: 'skin' });
      }
      pl(ring(88, 78, 8, 8, null, 6), 'furD', 5, 'body');
      pl(ring(124, 78, 8, 8, null, 6), 'furD', 5, 'body');
      pl([[84, 96], [94, 80], [106, 76], [120, 80], [130, 96], [128, 114], [116, 126], [96, 126], [84, 114]], 'fur', 6, 'head');
      pl([[96, 112], [116, 112], [122, 122], [110, 130], [100, 130], [92, 122]], 'bone', 6, 'head');
      pth('M106,112 L111,109 L114,114 L106,120 L98,114 L101,109 Z', 'eye', 7, 'face');
      if (v.state === 'radiant') {
        // Asymmetric, confident half-smirk: still fierce, but clearly enjoying the power-up.
        pth('M106,120 L106,124 M96,127 Q104,132 116,124', 'furD', 7, 'face', { sw: 2.1, fill: false, cap: 'round' });
        pth('M112,124 L116,131 L109,126 Z', 'bone', 7, 'face');
      } else {
        pth('M106,120 L106,125 M106,125 L97,130 M106,125 L115,128', 'furD', 7, 'face', { sw: 1.9, fill: false, cap: 'round' });
        pth('M99,127 L97,135 L104,128 Z', 'bone', 7, 'face'); pth('M112,126 L115,134 L109,127 Z', 'bone', 7, 'face');
      }
      eyeParts(P, 95, 99, 7.4, 'fierce', v, 1); eyeParts(P, 118, 97, 7.4, 'fierce', v, 0);
      pth('M84,87 L98,92 M128,85 L116,90', 'furD', 8, 'face', { sw: 3.4, fill: false, cap: 'round' });
      if (v.aura > .5) { glow(66, 207, 15, 'c3', v.aura); glow(174, 92, 14, 'c3', v.aura); }
    }

    /* ====================== EAGLE SCHOLAR ====================== */
    if (key === 'bird') {
      function wingSide(sd) {
        var sx = 106 + sd * 22, sy = 148, tipx = 106 + sd * 86, tipy = 108;
        var rows = [
          { n: LN(6 + Math.round(v.ornament * .18)), l0: 40, l1: 54, w: 7.5, t0: .42, tone1: 'c7', tone2: 'c5', dz: 0 },
          { n: LN(5 + Math.round(v.ornament * .14)), l0: 30, l1: 42, w: 6.5, t0: .16, tone1: 'c5', tone2: 'c3', dz: 1 },
          { n: LN(6), l0: 15, l1: 22, w: 5.5, t0: 0, tone1: 'c3', tone2: 'fur', dz: 2 }
        ];
        rows.forEach(function (row, ri) {
          for (var k2 = 0; k2 < row.n; k2++) {
            var s = k2 / (row.n - 1 || 1), fx = sx + (tipx - sx) * (row.t0 + s * (1 - row.t0));
            var fy = sy + (tipy - sy) * (row.t0 + s * (1 - row.t0)) + ri * 5;
            var flen = row.l0 + (row.l1 - row.l0) * Math.sin(s * Math.PI * .8);
            var fang = (Math.PI / 2) - sd * (.15 + s * .5) * (ri === 0 ? 1.15 : 1);
            var line = bend(fx, fy, fang, flen, .12, 3, r, k2 + ri);
            pl(ribbon(line, row.w, 1.4, true), k2 % 2 ? row.tone1 : row.tone2, 2 + row.dz, sd > 0 ? 'wingR' : 'wingL', { mat: 'skin' });
            if (FULL && ri === 0) pl(ribbon(line.slice(0, 3), 2.2, .8), 'c3', 2 + row.dz, sd > 0 ? 'wingR' : 'wingL', { mat: 'flat', op: .5 });
          }
        });
        pl(ribbon([[sx, sy - 4], [106 + sd * 54, 120], [tipx, tipy]], 8.5, 3), 'c7', 2, sd > 0 ? 'wingR' : 'wingL', { mat: 'skin' });
      }
      wingSide(-1); wingSide(1);
      for (i = 0; i < LN(4 + t); i++) pl(ribbon(bend(110, 196, Math.PI / 2 + (i - (3 + t) / 2) * .24, 34 + i * 3, .14, 3, r, i), 6, 1.6, true), i % 2 ? 'c7' : 'c5', 2, 'lower', { mat: 'skin' });
      pl([[86, 140], [104, 128], [124, 132], [136, 146], [138, 176], [126, 200], [108, 208], [92, 198], [84, 172]], 'c5', 3, 'body');
      pl([[100, 148], [122, 150], [126, 178], [112, 200], [100, 194], [94, 172]], 'c3', 4, 'body', { op: .95 });
      // head — pale, hooked yellow beak, brow
      for (i = 0; i < LN(6); i++) pl(ribbon(bend(124 + i * 2, 92 + i * 5, .5 + i * .12, 16 + i * 2, .3, 3, r, i), 5, 1.2, true), i % 2 ? 'c5' : 'c3', 5, 'head', { mat: 'skin' });
      pl(ring(108, 102, 27, 26, function (t2, ang2) { return 1 - .07 * Math.max(0, Math.sin(ang2)); }, 12, r, .02), 'fur', 6, 'head');
      pl([[108, 88], [90, 92], [68, 108], [70, 120], [90, 116], [106, 104]], 'c5', 6, 'face');
      pl([[68, 108], [70, 122], [80, 134], [85, 120]], 'c7', 7, 'face', { mat: 'plate' });
      pl([[70, 120], [90, 116], [92, 126], [78, 130]], 'c7', 6, 'face', { mat: 'skin' });
      pl([[90, 116], [106, 106], [108, 118], [92, 126]], 'goldD', 6, 'face', { mat: 'skin' });
      pl([[100, 92], [108, 90], [109, 104], [100, 104]], 'furD', 7, 'face', { mat: 'flat', op: .45 });
      pl(ring(98, 99, 2.4, 2.4, null, 5), 'dark', 7, 'face', { mat: 'flat' });
      eyeParts(P, 104, 100, 8.4, 'studious', v, 1); eyeParts(P, 124, 99, 8.4, 'studious', v, 0);
      // talons + slab with the trend
      pl(ribbon([[96, 200], [92, 214]], 5, 4), 'gold', 5, 'lower', { mat: 'skin' });
      pl(ribbon([[124, 200], [128, 214]], 5, 4), 'gold', 5, 'lower', { mat: 'skin' });
      for (i = 0; i < 3; i++) { var ta = 1.1 + i * .5; pl([[92, 216], [92 + Math.cos(ta) * 9, 216 + Math.sin(ta) * 7], [93, 219]], 'goldD', 5, 'lower', { mat: 'flat' }); }
      pl([[46, 186], [96, 174], [102, 210], [52, 222]], 'bone', 6, 'body');
      var s30 = series(v, 12), dd = '', plt;
      for (i = 0; i < s30.length; i++) { plt = [53 + (i / (s30.length - 1)) * 42, 210 - s30[i] * 26 - (i / s30.length) * 4]; dd += (i ? ' L' : 'M') + f2(plt); }
      pth(dd, 'c7', 7, 'body', { sw: 2, fill: false, cap: 'round' });
      pl(ring(95, 210 - s30[s30.length - 1] * 26 - 4, 2.6, 2.6, null, 6), 'gold', 7, 'body', { mat: 'flat' });
    }

    /* ====================== PANDA BARD ====================== */
    if (key === 'panda') {
      var joy = v.joy, fill = clamp(.25 + .7 * joy);
      // The lute stays secondary: a compact body tucked behind the left shoulder.
      pl(ring(38, 194, 20, 24, null, 10, r, .02), 'wood', 1, 'back');
      pl(ring(38, 194, 6.5, 6.5, null, 7), 'dark', 1, 'back', { mat: 'flat' });
      pl(ribbon([[34, 174], [25, 144], [25, 121]], 5, 4), 'wood', 1, 'back', { mat: 'skin' });
      pl([[18, 116], [31, 115], [32, 125], [19, 128]], 'dark', 1, 'back', { mat: 'flat' });
      for (i = 0; i < (FULL ? 4 : 2); i++) pl(ribbon([[33 + i * 2.6, 210], [23 + i * 1.4, 124]], .62, .5), 'boneD', 1, 'back', { mat: 'flat', op: .55 });
      // The gourd is deliberately larger than the lute body and leads the silhouette.
      sm(ring(180, 184, 29, 36, null, 12, r, .02), 'wood', 2, 'lower');
      sm(ring(178, 151, 18, 25, null, 11, r, .015), 'wood', 2, 'lower');
      pl([[169, 123], [186, 122], [188, 136], [168, 137]], 'wood', 2, 'lower', { mat: 'plate' });
      pl([[166, 117], [189, 116], [190, 124], [166, 126]], 'dark', 2, 'lower', { mat: 'flat' });
      pl(ribbon([[164, 145], [148, 158], [146, 181]], 2.5, 1.9), 'c7', 2, 'lower', { mat: 'flat' });
      pl([[153, 187], [208, 184], [205, 207], [158, 214]], 'c5', 2, 'lower', { op: (.22 + .58 * fill).toFixed(2), mat: 'flat' });
      pl(ring(207, 222, 10, 7, null, 8), 'sake', 2, 'lower');
      pl(ring(207, 220, 7.5, 4.2, null, 8), 'c5', 2, 'lower', { op: (.3 + .55 * fill).toFixed(2), mat: 'flat' });
      // Wider, taller and softer than the lion: a grounded, generous zen silhouette.
      pl(ring(110, 232, 72, 7, null, 10), 'shadow', 1, 'back', { mat: 'flat' });
      pl([[68, 190], [101, 188], [103, 214], [110, 229], [67, 229], [62, 210]], 'ink', 2, 'lower');
      pl([[116, 188], [151, 190], [158, 210], [155, 229], [110, 229], [116, 214]], 'ink', 2, 'lower');
      sm(ring(109, 177, 54, 45, function (t2, ang2) { return 1 + .08 * Math.max(0, Math.sin(ang2)); }, 13), 'bone', 3, 'body');
      sm(ring(109, 183, 38, 31, null, 12), 'boneD', 4, 'body', { op: .42, mat: 'skin' });
      pth('M59,151 L108,168 L158,146 L160,158 L109,181 L58,163 Z', 'c7', 4, 'body');
      pl(ribbon([[68, 154], [57, 179], [79, 198]], 13, 9), 'ink', 5, 'body');
      pl(ring(84, 201, 10, 9, null, 7), 'ink', 5, 'body');
      pl(ribbon([[149, 151], [164, 143], [172, 154]], 13, 9), 'ink', 5, 'body');
      pl(ring(174, 158, 10, 9, null, 7), 'ink', 5, 'body');
      // Jewellery: bronze/gold, with no pink accent dependency.
      for (i = 0; i < (FULL ? 3 : 2); i++) pl(ribbon([[77 + i * 2.5, 192 - i * 3], [91 + i * 2.5, 197 - i * 3]], 2.5, 2.5), i === 1 ? 'c7' : 'gold', 6, 'body', { mat: 'plate' });
      for (i = 0; i < 2; i++) pl(ribbon([[164 + i * 3, 151 - i * 4], [176 + i * 3, 155 - i * 4]], 2.3, 2.3), 'gold', 6, 'body', { mat: 'plate' });
      var bn = Math.min(11, LN(4 + v.input.streak * .45));
      for (i = 0; i < bn; i++) {
        var ba = -.95 + (i / (bn - 1)) * 1.9;
        pl(ring(109 + Math.sin(ba) * 31, 159 + Math.cos(ba) * 14, 2.9 + (i % 3 === 0 ? 1 : 0), 2.9 + (i % 3 === 0 ? 1 : 0), null, 6), i % 3 === 0 ? 'gold' : 'c7', 6, 'body', { mat: 'flat' });
      }
      pl([[104, 176], [114, 176], [112, 188], [106, 188]], 'gold', 6, 'body', { mat: 'plate' });
      pl(ring(70, 77, 14, 14, null, 7), 'ink', 5, 'head');
      pl(ring(147, 77, 14, 14, null, 7), 'ink', 5, 'head');
      sm([[61, 101], [78, 78], [108, 69], [139, 78], [156, 101], [153, 124], [132, 142], [87, 142], [63, 124]], 'bone', 6, 'head');
      pl(ring(91, 109, 12, 14, null, 7), 'ink', 6, 'head', { mat: 'flat' });
      pl(ring(128, 107, 12, 14, null, 7), 'ink', 6, 'head', { mat: 'flat' });
      pl(ring(109, 127, 16, 11, null, 8), 'boneD', 6, 'head');
      pth('M109,121 L115,117 L119,122 L109,130 L99,122 L103,117 Z', 'eye', 7, 'face');
      pth('M97,132 Q109,' + (132 + 4 + joy * 10).toFixed(1) + ' 121,132', 'eye', 7, 'face', { sw: 2.1, cap: 'round', fill: false });
      eyeParts(P, 91, 109, 8.3, 'happy', v, 1); eyeParts(P, 128, 107, 8.3, 'happy', v, 0);
      pth('M154,89 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0', 'gold', 7, 'head', { sw: 2.3, fill: false });
      pth('M57,91 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', 'gold', 7, 'head', { sw: 2.1, fill: false });
      pl(ring(154, 99, 2.8, 3.7, null, 5), 'c7', 7, 'head', { mat: 'flat' });
      if (FULL) for (i = 0; i < 5; i++) { var pa = (i / 5) * TAU; pl(ring(76 + Math.cos(pa) * 8, 61 + Math.sin(pa) * 7, 4.8, 3.6, null, 6), i % 2 ? 'gold' : 'c7', 7, 'head', { mat: 'flat' }); }
      if (FULL) pl(ring(76, 61, 3.4, 3.4, null, 5), 'gold', 7, 'head', { mat: 'flat' });
      n = LN(2 + joy * 8);
      for (i = 0; i < n; i++) {
        a = -2.95 + (i / (n - 1 || 1)) * 2.4 + (r() - .5) * .22;
        var ar = 54 + r() * 38, ax = 109 + Math.cos(a) * ar, ay = 119 + Math.sin(a) * ar * .9;
        pl(ring(ax, ay, 3 + r() * 2.2, 3 + r() * 2.2, null, 5), i % 3 === 0 ? 'gold' : 'c7', 8, 'sig', { mat: 'flat', op: (.4 + joy * .55).toFixed(2) });
        if (i % 3 === 1) pl(ribbon([[ax + 3, ay], [ax + 3, ay - 9]], 1.1, 1.1), i % 2 ? 'gold' : 'c7', 8, 'sig', { mat: 'flat', op: (.5 + joy * .4).toFixed(2) });
      }
    }

    /* ====================== RECLINING BEAVER ENGINEER ====================== */
    if (key === 'beaver') {
      var charge = v.emissive, toolN = FULL ? v.toolCount : Math.min(2, v.toolCount);
      var stickN = FULL ? v.stickCount : Math.min(7, v.stickCount);
      var stickBases = [12, 27, 43, 59, 78, 94, 158, 174, 190, 207];
      pl(ring(112, 229, 91, 8, null, 11), 'shadow', 0, 'back', { mat: 'flat' });

      // A workshop-like twig field grows with level and streak and sits in the foreground.
      for (i = 0; i < stickN; i++) {
        var sbx = stickBases[i % stickBases.length] + (r() - .5) * 8;
        var sby = 230 + (r() - .5) * 3;
        var stick = bend(sbx, sby, -Math.PI / 2 + (r() - .5) * .54, 20 + r() * 25, (r() - .5) * .28, 4, r, i, -.025);
        pl(ribbon(stick, 3.1, 1.15), 'wood', 9, 'fx', { mat: 'skin' });
        if (FULL || i < 3) {
          var forkAt = stick[Math.min(3, 2 + (i % 2))];
          var fork = bend(forkAt[0], forkAt[1], -1.12 + (i % 2 ? .34 : -.28), 9 + r() * 8, .08, 3, r, i + 9);
          pl(ribbon(fork, 1.8, .65), i % 3 === 0 ? 'goldD' : 'wood', 9, 'fx', { mat: 'skin' });
        }
        if (FULL && i % 2 === 0) {
          var stickTip = stick[stick.length - 1];
          pl(ring(stickTip[0], stickTip[1], 2.2, 1.35, null, 7), 'boneD', 10, 'fx', { mat: 'flat' });
        }
      }

      // Restore the earlier broad, belly-up engineer pose and left-side paddle tail.
      sm([[13, 204], [18, 172], [37, 145], [60, 151], [72, 179], [62, 210], [39, 222]], 'furD', 1, 'back');
      if (FULL) {
        pth('M20,180 L59,207 M17,193 L49,219 M30,157 L68,185 M21,209 L56,158 M40,219 L69,177', 'ink', 2, 'back', { sw: 1.2, fill: false, cap: 'round', op: .48 });
      }
      sm(ring(119, 176, 65, 50, function (t2, ang2) { return 1 + .08 * Math.max(0, Math.sin(ang2)); }, 14, r, .015), 'fur', 3, 'body');
      sm(ring(122, 181, 47, 38, null, 12), 'boneD', 4, 'body', { op: .88, mat: 'skin' });
      pl(ribbon([[157, 177], [178, 146], [190, 126]], 18, 12), 'furD', 3, 'lower');
      pl(ring(193, 119, 17, 13, null, 9, r, .04), 'furD', 4, 'lower');
      for (i = 0; i < 3; i++) pl([[181 + i * 8, 112], [185 + i * 8, 105], [188 + i * 8, 114]], 'bone', 5, 'lower', { mat: 'flat' });
      pl(ribbon([[143, 202], [167, 215]], 17, 12), 'furD', 3, 'lower');
      pl(ring(174, 219, 18, 10, null, 9), 'furD', 4, 'lower');

      // Head, single monocle-goggle and incisors keep the engineer silhouette readable.
      sm(ring(60, 143, 32, 29, null, 12, r, .02), 'fur', 5, 'head');
      pl(ring(42, 121, 9, 9, null, 7), 'furD', 4, 'head');
      pl(ring(72, 117, 9, 9, null, 7), 'furD', 4, 'head');
      sm(ring(41, 151, 18, 13, null, 10), 'furL', 6, 'head');
      pl(ring(29, 150, 6.5, 5.5, null, 7), 'eye', 7, 'face', { mat: 'flat' });
      pl([[36, 157], [45, 157], [45, 169], [37, 168]], 'bone', 7, 'face', { mat: 'flat' });
      pl([[45, 157], [54, 158], [52, 169], [45, 169]], 'bone', 7, 'face', { mat: 'flat' });
      pth('M34,156 Q44,161 55,157', 'furD', 7, 'face', { sw: 1.6, fill: false, cap: 'round' });
      eyeParts(P, 51, 140, 6.8, 'studious', v, 1); eyeParts(P, 71, 136, 6.8, 'studious', v, 0);
      pth('M31,130 Q51,119 82,125', 'goldD', 7, 'head', { sw: 2.8, fill: false, cap: 'round' });
      pth('M40.5,140 A10.5,8.5 0 1 0 61.5,140 A10.5,8.5 0 1 0 40.5,140', 'c7', 8, 'face', { sw: 3.2, fill: false, cap: 'round' });
      pl(ring(51, 140, 7.2, 5.5, null, 12), 'bone', 9, 'face', { mat: 'flat', op: .22, feature: 'eye-detail' });
      pth('M61,137 Q72,151 69,177', 'goldD', 8, 'face', { sw: 2.1, fill: false, cap: 'round' });

      // Forepaws rest across the belly without an instrument covering the torso.
      pl(ribbon([[78, 155], [102, 142], [116, 145]], 9, 6), 'furD', 6, 'body');
      pl(ring(118, 146, 8, 7, null, 8), 'furD', 7, 'body');
      pl(ribbon([[91, 199], [116, 178], [131, 158]], 9, 6), 'furD', 6, 'body');
      pl(ring(133, 155, 8, 7, null, 8), 'furD', 7, 'body');

      var tools = [
        'M179,190 L207,218 M181,188 L176,181 M181,188 L188,183 M207,218 L213,216',
        'M186,171 L210,158 M208,154 L214,162 M203,160 L209,168',
        'M184,207 L211,193 M208,190 L215,196',
        'M83,217 L111,220 M86,213 L82,221 M108,216 L114,223',
        'M86,111 L101,96 M97,94 L104,101'
      ];
      for (i = 0; i < toolN; i++) pth(tools[i], i % 2 ? 'c7' : 'gold', 7, 'sig', { sw: i === 0 ? 3.2 : 2.5, fill: false, cap: 'round' });

      // Ambient spores keep the Ink & Spore energy without replacing the removed belly core.
      n = FULL ? v.spores : Math.min(3, v.spores);
      for (i = 0; i < n; i++) {
        a = -2.8 + (i / Math.max(1, n - 1)) * 2.1;
        var sr = 30 + r() * 33, sx = 136 + Math.cos(a) * sr, sy = 154 + Math.sin(a) * sr * .8;
        pl(ring(sx, sy, 2.2 + r() * 2.3, 2.2 + r() * 2.3, null, 7), i % 3 ? 'c3' : 'gold', 8, 'fx', { mat: 'flat', op: (.42 + .5 * charge).toFixed(2) });
      }
    }

    for (i = 0; i < v.dust; i++) pl(ring(50 + r() * 130, 80 + r() * 130, 1.5, 1.5, null, 5), 'muted', 9, 'fx', { mat: 'flat', op: .55 });

    if (v.droop > .1) for (i = 0; i < P.parts.length; i++) {
      var pp = P.parts[i];
      if (['head', 'face', 'body'].indexOf(pp.grp) >= 0 && pp.pts) for (var g2 = 0; g2 < pp.pts.length; g2++) pp.pts[g2][1] += v.droop * .5;
    }
    P.parts.sort(function (x, y) { return x.z - y.z; });
    return P;
  }

  /* ---------- RENDER A: faceted plates, seam light, specular ---------- */
  var GROUPS = ['back', 'tail', 'lower', 'body', 'mane', 'wingL', 'wingR', 'head', 'face', 'sig', 'fx'];
  function glowGrad(defs, uid, col) {
    var id = uid + 'g' + String(col).replace(/[^a-z0-9]/gi, '');
    if (!defs.__seen) defs.__seen = {};
    if (!defs.__seen[id]) {
      defs.__seen[id] = 1;
      defs.push({
        t: 'radialGradient', a: { id: id }, k: id, c: [
          { t: 'stop', k: '0', a: { offset: '0', stopColor: col, stopOpacity: '.9' } },
          { t: 'stop', k: '1', a: { offset: '1', stopColor: col, stopOpacity: '0' } }]
      });
    }
    return 'url(#' + id + ')';
  }
  function renderFaceted(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo';
    var nf = opt.facets === undefined ? 3 : opt.facets;
    var B = build(key, v, hi ? 1 : .32), C = B.C, uid = 'ff' + key + (opt.uid || '');
    var defs = [], nodes = [], g = {}, i, gi;
    for (i = 0; i < GROUPS.length; i++) g[GROUPS[i]] = [];
    for (i = 0; i < B.parts.length; i++) { var kk = B.parts[i].grp; if (!g[kk]) g[kk] = []; g[kk].push(B.parts[i]); }

    function plate(q, id) {
      var col = C[q.tone] || q.tone, out = [], op = q.op !== undefined ? +q.op : 1;
      var d = q.soft ? smooth(q.pts, true) : poly(q.pts);
      if (q.tone === 'shadow' || q.mat === 'flat' || !hi || nf < 2) {
        out.push({ t: 'path', k: id, a: { d: d, fill: col, opacity: op } });
        return out;
      }
      var bs = bands(q.pts, nf), k2;
      out.push({ t: 'path', k: id + 'u', a: { d: d, fill: mix(col, PAL.deep, .3), opacity: op } });
      for (k2 = 0; k2 < bs.length; k2++) {
        var f = bs.length < 2 ? 0 : k2 / (bs.length - 1);
        var shade = f < .5 ? mix(col, '#FFFFFF', (.5 - f) * (.15 + .13 * v.spec)) : mix(col, PAL.deep, (f - .5) * .86);
        out.push({ t: 'path', k: id + 'f' + k2, a: { d: poly(bs[k2]), fill: shade, opacity: op } });
      }
      if (q.mat === 'plate' && v.spec > .3 && bs.length) {
        var bb2 = bbox(q.pts), area = (bb2[2] - bb2[0]) * (bb2[3] - bb2[1]);
        if (area < 900) {
          var sp = inset(bs[0], .38);
          if (sp.length > 2) out.push({ t: 'path', k: id + 's', a: { d: poly(sp), fill: '#FFFFFF', opacity: (v.spec * .16 * op).toFixed(2) } });
        }
      }
      if (q.rim !== 0 && v.rim > .15) {
        var le = litEdge(q.pts, .36);
        if (le) {
          out.push({ t: 'path', k: id + 'e1', a: { d: open(le), fill: 'none', stroke: C.glow, strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: (.1 + v.emissive * .2).toFixed(2) } });
          out.push({ t: 'path', k: id + 'e2', a: { d: open(le), fill: 'none', stroke: mix('#FFFFFF', C.glow, .35), strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: (v.rim * .62 * op).toFixed(2) } });
        }
      }
      return out;
    }

    function emit(list, gname) {
      var kids = [], i2, j, q, sub, a;
      for (i2 = 0; i2 < list.length; i2++) {
        q = list[i2];
        if (q.k === 'glow') {
          if (!hi) continue;
          kids.push({ t: 'circle', k: uid + gname + 'gl' + i2, a: { cx: q.x, cy: q.y, r: q.r * 1.7, fill: glowGrad(defs, uid, C[q.tone] || q.tone), opacity: (.6 * q.i).toFixed(2) } });
          kids.push({ t: 'circle', k: uid + gname + 'gc' + i2, a: { cx: q.x, cy: q.y, r: Math.max(1.3, q.r * .16), fill: '#FFFFFF', opacity: (.7 * q.i).toFixed(2) } });
          continue;
        }
        if (q.k === 'p') {
          a = { d: q.d };
          if (q.fill === false) { a.fill = 'none'; a.stroke = C[q.tone] || q.tone; a.strokeWidth = q.sw || 2; a.strokeLinecap = q.cap || 'round'; a.strokeLinejoin = 'round'; }
          else a.fill = C[q.tone] || q.tone;
          if (q.op !== undefined) a.opacity = q.op;
          kids.push({ t: 'path', k: uid + gname + 'p' + i2, a: a });
          continue;
        }
        sub = plate(q, uid + gname + i2);
        for (j = 0; j < sub.length; j++) kids.push(sub[j]);
      }
      return { t: 'g', a: { id: uid + '-' + gname, 'data-creature': key, 'data-group': gname, 'data-surface': 'faceted' }, k: uid + 'G' + gname, c: kids };
    }

    if (key !== 'panda' && v.aura > .1) nodes.push({ t: 'ellipse', k: uid + 'aura', a: { cx: 110, cy: 152, rx: 108, ry: 120, fill: glowGrad(defs, uid, C.glow), opacity: (v.aura * .26).toFixed(3) } });
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(emit(g[GROUPS[gi]], GROUPS[gi]));
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  /* ---------- RENDER B: 2b Ink & Spore ----------
     One weighted outline per form, clipped hatch cores in the shadow half,
     paper tooth above 90px, and a signal-driven spore field. */
  function shadowCore(pts, bite) {
    var c = centroid(pts), i, mn = 1e9, mx = -1e9, u;
    for (i = 0; i < pts.length; i++) {
      u = uOf(pts[i], c); mn = Math.min(mn, u); mx = Math.max(mx, u);
    }
    return clipHalf(pts, c, mn + (mx - mn) * (1 - bite), true);
  }

  function renderInkSpore(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo', B = build(key, v, hi ? 1 : .32), C = B.C;
    var uid = 'is' + key + (opt.uid || ''), defs = [], nodes = [], g = {}, i, gi;
    var INK = '#11141B', outline = hi ? 1.65 : 1.08;
    for (i = 0; i < GROUPS.length; i++) g[GROUPS[i]] = [];
    for (i = 0; i < B.parts.length; i++) {
      var groupName = B.parts[i].grp;
      if (!g[groupName]) g[groupName] = [];
      g[groupName].push(B.parts[i]);
    }

    function hatch(q, id) {
      if (!hi || q.mat === 'flat' || q.tone === 'shadow' || !q.pts) return null;
      var bb = bbox(q.pts), area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
      if (area < 115) return null;
      var core = shadowCore(q.pts, v.bite + .1), cid = id + '-clip', h = bb[3] - bb[1];
      if (core.length < 3) return null;
      defs.push({ t: 'clipPath', a: { id: cid }, k: cid, c: [{ t: 'path', k: cid + 'p', a: { d: poly(core) } }] });
      var pitch = 5.2 - v.density * 2.7, x, d = '', cross = '';
      for (x = bb[0] - h - 3; x < bb[2] + h + 3; x += pitch) {
        d += 'M' + x.toFixed(1) + ',' + (bb[3] + 2).toFixed(1) + ' L' + (x + h + 4).toFixed(1) + ',' + (bb[1] - 2).toFixed(1) + ' ';
      }
      if (v.density > .54) {
        for (x = bb[0] - h - 3; x < bb[2] + h + 3; x += pitch * 1.55) {
          cross += 'M' + x.toFixed(1) + ',' + (bb[1] - 2).toFixed(1) + ' L' + (x + h + 4).toFixed(1) + ',' + (bb[3] + 2).toFixed(1) + ' ';
        }
      }
      var children = [{ t: 'path', k: id + 'ha', a: { d: d, fill: 'none', stroke: INK, strokeWidth: (.52 + v.density * .5).toFixed(2), opacity: (.28 + v.density * .35).toFixed(2) } }];
      if (cross) children.push({ t: 'path', k: id + 'hb', a: { d: cross, fill: 'none', stroke: INK, strokeWidth: (.42 + v.density * .34).toFixed(2), opacity: (.2 + v.density * .24).toFixed(2) } });
      return { t: 'g', a: { clipPath: 'url(#' + cid + ')' }, k: id + 'h', c: children };
    }

    function emit(list, gname) {
      var kids = [], j, q, id, col, d, a, ht, edge;
      for (j = 0; j < list.length; j++) {
        q = list[j]; id = uid + '-' + gname + '-' + j; col = C[q.tone] || q.tone;
        if (q.feature === 'eye-detail') continue;
        if (q.k === 'glow') {
          if (!hi) continue;
          kids.push({ t: 'circle', k: id + 'g', a: { cx: q.x, cy: q.y, r: Math.min(q.r * 1.65, 128), fill: glowGrad(defs, uid, C[q.tone] || q.tone), opacity: (.52 * q.i).toFixed(2) } });
          kids.push({ t: 'circle', k: id + 'c', a: { cx: q.x, cy: q.y, r: Math.max(1.25, q.r * .16), fill: C.bone, opacity: (.76 * q.i).toFixed(2) } });
          continue;
        }
        if (q.k === 'p') {
          a = { d: q.d };
          if (q.fill === false) {
            a.fill = 'none'; a.stroke = col; a.strokeWidth = q.sw || 2;
            a.strokeLinecap = q.cap || 'round'; a.strokeLinejoin = 'round';
          } else {
            a.fill = col; a.stroke = INK; a.strokeWidth = outline; a.strokeLinejoin = 'round';
          }
          if (q.op !== undefined) a.opacity = q.op;
          kids.push({ t: 'path', k: id, a: a });
          continue;
        }
        d = q.soft ? smooth(q.pts, true) : poly(q.pts);
        kids.push({ t: 'path', k: id + 'f', a: { d: d, fill: col, opacity: q.op === undefined ? 1 : q.op } });
        ht = hatch(q, id); if (ht) kids.push(ht);
        if (q.tone !== 'shadow') kids.push({ t: 'path', k: id + 'o', a: { d: d, fill: 'none', stroke: INK, strokeWidth: outline, strokeLinejoin: 'round', strokeLinecap: 'round', opacity: .94 } });
        if (hi && q.mat !== 'flat' && q.rim !== 0 && v.rim > .2) {
          edge = litEdge(q.pts, .34);
          if (edge) kids.push({ t: 'path', k: id + 'r', a: { d: open(edge), fill: 'none', stroke: C.bone, strokeWidth: 1.9, strokeLinecap: 'round', opacity: (v.rim * .38).toFixed(2) } });
        }
      }
      return { t: 'g', a: { id: uid + '-' + gname, 'data-creature': key, 'data-group': gname, 'data-surface': 'ink-spore' }, k: uid + 'G' + gname, c: kids };
    }

    if (key !== 'panda' && v.aura > .12 && hi) nodes.push({ t: 'ellipse', k: uid + 'aura', a: { cx: 110, cy: 153, rx: 104, ry: 117, fill: glowGrad(defs, uid, C.glow), opacity: (v.aura * .2).toFixed(3) } });
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(emit(g[GROUPS[gi]], GROUPS[gi]));

    // Surface-level spores keep the treatment coherent even on creatures whose
    // signature anatomy does not naturally emit particles.
    var rr = prng(v.seed + '|' + key + '|spores'), sporeKids = [], count = hi ? v.spores : Math.min(2, v.spores);
    for (i = 0; i < count; i++) {
      var side = i % 2 ? 1 : -1, sy = 76 + rr() * 118, sx = 110 + side * (58 + rr() * 38), sr = 1.4 + rr() * 3.2;
      sporeKids.push({ t: 'circle', k: uid + 'sp' + i, a: { cx: sx.toFixed(1), cy: sy.toFixed(1), r: sr.toFixed(1), fill: 'none', stroke: i % 3 ? C.glow : C.gold, strokeWidth: hi ? 1.25 : 1, opacity: (.35 + v.emissive * .5).toFixed(2) } });
      if (hi && i % 2 === 0) sporeKids.push({ t: 'circle', k: uid + 'sd' + i, a: { cx: sx.toFixed(1), cy: sy.toFixed(1), r: '.85', fill: C.bone, opacity: (.45 + v.emissive * .42).toFixed(2) } });
    }
    if (sporeKids.length) nodes.push({ t: 'g', a: { id: uid + '-spores', 'data-group': 'spores', 'data-surface': 'ink-spore' }, k: uid + 'Gspores', c: sporeKids });

    if (hi && opt.grain !== false) {
      var grainId = uid + '-grain';
      var grainAlpha = (.035 + v.density * .05).toFixed(3);
      defs.push({ t: 'filter', a: { id: grainId, x: '-10%', y: '-10%', width: '120%', height: '120%' }, k: grainId, c: [
        { t: 'feTurbulence', k: grainId + 't', a: { type: 'fractalNoise', baseFrequency: '.82', numOctaves: '2', seed: String((hash(v.seed) % 31) + 1), stitchTiles: 'stitch', result: 'noise' } },
        { t: 'feColorMatrix', k: grainId + 'm', a: { in: 'noise', type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + grainAlpha + ' 0', result: 'paper' } },
        { t: 'feComposite', k: grainId + 'c', a: { in: 'paper', in2: 'SourceAlpha', operator: 'in', result: 'texture' } },
        { t: 'feBlend', k: grainId + 'b', a: { in: 'SourceGraphic', in2: 'texture', mode: 'multiply' } }
      ] });
      nodes = [{ t: 'g', k: uid + 'paper', a: { id: uid + '-paper-grain', filter: 'url(#' + grainId + ')', 'data-group': 'paper-grain', 'data-surface': 'ink-spore' }, c: nodes }];
    }
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  function render(key, v, opt) {
    opt = opt || {};
    return opt.style === 'ink-spore' ? renderInkSpore(key, v, opt) : renderFaceted(key, v, opt);
  }

  var PLANES = { back: -84, tail: -70, lower: -32, wingL: -24, wingR: -24, body: 0, mane: 15, head: 26, face: 34, sig: 56, fx: 68 };

  return {
    W: W, H: H, PAL: PAL, DOMAINS: D3, ORDER: ORDER3, SIGNALS: SIGNALS, STATES: STATES, PRESETS: PRESETS,
    GROUPS: GROUPS, PLANES: PLANES, vitals: vitals, build: build, skin: skin, series: series, prng: prng,
    clamp: clamp, mix: mix, render: render, renderFaceted: renderFaceted, renderInkSpore: renderInkSpore
  };
})();
