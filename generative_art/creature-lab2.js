/* Fourfold — Creature Lab v2
   Anime / biotech illustration engine.
   Upgrades over v1: catmull silhouettes, tapered ribbons (hair, limbs, fronds, feathers),
   hard-edged cel shadow, rim light, anime eyes, emissive vein networks.
   window.CreatureLab2                                                             */
window.CreatureLab2 = (function () {
  "use strict";

  var W = 220, H = 250, TAU = Math.PI * 2;
  var PAL = { ink: '#101218', bone: '#EDE6D6', boneD: '#BFB6A2', gold: '#D9A441', goldD: '#B08430', dark: '#1A1520', muted: '#8B90A0' };
  var LIGHT = { dx: .60, dy: .80 };   // direction the shadow falls (light is upper-left)

  var D2 = {
    moth: {
      key: 'moth', name: 'Moth Archivist', short: 'Moth', domain: 'Work', r1: 'work', mood: 'calm',
      c3: '#B9AEFF', c5: '#8B7CF6', c7: '#5E4FB8', fur: '#514868', furD: '#332E45', signature: 'wing eyespots = tasks closed; vein glow = momentum'
    },
    squirrel: {
      key: 'squirrel', name: 'Squirrel Summoner', short: 'Squirrel', domain: 'Gourmet', r1: 'gourmet', mood: 'bright',
      c3: '#7FE7B4', c5: '#34C784', c7: '#1F8A59', fur: '#A9765C', furD: '#75492F', signature: 'painted tail + one plant species per streak week'
    },
    lion: {
      key: 'lion', name: 'Lion Warrior', short: 'Lion', domain: 'Body', r1: 'body', mood: 'fierce',
      c3: '#FF8A6B', c5: '#E4593D', c7: '#A63A26', fur: '#C98A55', furD: '#8A5730', signature: 'mane curl + bulk vs softness from streak'
    },
    bird: {
      key: 'bird', name: 'Bird Scholar', short: 'Bird', domain: 'Finance', r1: 'finance', mood: 'studious',
      c3: '#F2CD7E', c5: '#D9A441', c7: '#9C742B', fur: '#EDE6D6', furD: '#BCB29C', signature: 'feather rows = level; ledger line = 30-day trend'
    },
    bard: {
      key: 'bard', name: 'Panda Bard', short: 'Bard', domain: 'Enjoyment', r1: 'work', mood: 'happy',
      c3: '#FFB3D2', c5: '#E4699F', c7: '#A83A6B', fur: '#EDE6D6', furD: '#B4AC9A', signature: 'smile, aura notes and jewellery all scale with joy'
    }
  };
  var ORDER2 = ['moth', 'squirrel', 'lion', 'bird', 'bard'];

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
  function hue(hex, deg, sm, lm) { var c = hex2rgb(hex), h = rgb2hsl(c[0], c[1], c[2]); var o = hsl2rgb((h[0] + deg / 360 + 1) % 1, clamp(h[1] * (sm || 1)), clamp(h[2] * (lm || 1), .04, .96)); return rgb2hex(o[0], o[1], o[2]); }
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function f2(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }

  /* ---------- geometry ---------- */
  function catmull(pts, closed, tension) {
    var n = pts.length, t = tension === undefined ? 1 : tension, d, i, p0, p1, p2, p3, c1, c2;
    if (n < 3) return 'M' + pts.map(f2).join(' L');
    d = 'M' + f2(pts[0]);
    for (i = 0; i < (closed ? n : n - 1); i++) {
      p1 = pts[i]; p2 = pts[(i + 1) % n];
      p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
      p3 = closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
      c1 = [p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t];
      c2 = [p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t];
      d += ' C' + f2(c1) + ' ' + f2(c2) + ' ' + f2(p2);
    }
    return d + (closed ? ' Z' : '');
  }
  function blobPts(cx, cy, rx, ry, prof, n, rnd, jit) {
    var out = [], i, a, m;
    n = n || 16;
    for (i = 0; i < n; i++) {
      a = (i / n) * TAU - Math.PI / 2;
      m = prof ? prof(i / n, a) : 1;
      if (jit && rnd) m *= 1 + (rnd() - .5) * jit;
      out.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    return out;
  }
  function ribbonPts(line, wfn) {
    var L = [], R = [], i, n = line.length, p, a, b, dx, dy, m, nx, ny, w;
    for (i = 0; i < n; i++) {
      p = line[i]; a = line[Math.max(0, i - 1)]; b = line[Math.min(n - 1, i + 1)];
      dx = b[0] - a[0]; dy = b[1] - a[1]; m = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = -dy / m; ny = dx / m; w = wfn(i / (n - 1));
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
    }
    return L.concat(R.reverse());
  }
  function strandLine(x, y, ang, len, curl, segs, rnd, phase) {
    var out = [], i, a = ang, cx = x, cy = y, step = len / segs;
    for (i = 0; i <= segs; i++) {
      out.push([cx, cy]);
      a += curl * .42 * Math.sin(i * .82 + (phase || 0)) + (rnd ? (rnd() - .5) * .1 : 0);
      cx += Math.cos(a) * step; cy += Math.sin(a) * step;
    }
    return out;
  }
  function centroid(pts) { var x = 0, y = 0, i; for (i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; } return [x / pts.length, y / pts.length]; }
  function proj(pts) {
    var c = centroid(pts), u = [], mn = 1e9, mx = -1e9, i, d;
    for (i = 0; i < pts.length; i++) { d = (pts[i][0] - c[0]) * LIGHT.dx + (pts[i][1] - c[1]) * LIGHT.dy; u.push(d); if (d < mn) mn = d; if (d > mx) mx = d; }
    return { c: c, u: u, mn: mn, mx: mx };
  }
  function celShadow(pts, bite, curve) {
    var P = proj(pts), thr = P.mn + (P.mx - P.mn) * (1 - bite), n = pts.length, start = P.u.indexOf(P.mn), seq = [], i, j;
    for (i = 0; i < n; i++) { j = (start + i) % n; if (P.u[j] > thr) seq.push(pts[j]); }
    if (seq.length < 3) return null;
    var A = seq[0], B = seq[seq.length - 1];
    var mid = [(A[0] + B[0]) / 2 - LIGHT.dx * curve, (A[1] + B[1]) / 2 - LIGHT.dy * curve];
    return catmull(seq, false) + ' Q' + f2(mid) + ' ' + f2(A) + ' Z';
  }
  function litArc(pts, amount) {
    var P = proj(pts), thr = P.mn + (P.mx - P.mn) * amount, n = pts.length, start = P.u.indexOf(P.mx), seq = [], i, j;
    for (i = 0; i < n; i++) { j = (start + i) % n; if (P.u[j] < thr) seq.push(pts[j]); }
    return seq.length > 2 ? catmull(seq, false) : null;
  }
  function bbox(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
    for (i = 0; i < pts.length; i++) { x0 = Math.min(x0, pts[i][0]); y0 = Math.min(y0, pts[i][1]); x1 = Math.max(x1, pts[i][0]); y1 = Math.max(y1, pts[i][1]); }
    return [x0, y0, x1, y1];
  }

  /* ---------- vitals (same six signals as round 1, more derived properties) ---------- */
  var SIGNALS = [
    { id: 'momentum', label: 'Momentum', hint: 'trailing 7-day XP ÷ pace', min: 0, max: 1, step: .01 },
    { id: 'vitality', label: 'Vitality', hint: '30-day completion rate', min: 0, max: 1, step: .01 },
    { id: 'volatility', label: 'Volatility', hint: 'stdev of daily score, 14d', min: 0, max: 1, step: .01 },
    { id: 'streak', label: 'Streak', hint: 'consecutive days with a completion', min: 0, max: 30, step: 1 },
    { id: 'neglect', label: 'Days idle', hint: 'days since last completion in domain', min: 0, max: 9, step: 1 },
    { id: 'level', label: 'Level', hint: 'domain level 1–10 → tier I/II/III', min: 1, max: 10, step: 1 }
  ];
  function vitals(inp) {
    var i = { momentum: .62, vitality: .74, volatility: .28, streak: 5, neglect: 0, level: 4, seed: 's1' }, k;
    for (k in inp) if (inp[k] !== undefined) i[k] = inp[k];
    var dorm = clamp(i.neglect / 7), tier = i.level >= 7 ? 3 : i.level >= 4 ? 2 : 1;
    var state = 'steady';
    if (i.neglect >= 5) state = 'dormant';
    else if (i.neglect >= 3) state = 'slipping';
    else if (i.streak >= 7 && i.momentum >= .62) state = 'radiant';
    else if (i.neglect >= 1) state = 'drifting';
    var v = {
      input: i, tier: tier, state: state, dorm: dorm,
      sat: clamp(.32 + .95 * i.vitality - .66 * dorm, .05, 1.3),
      lum: clamp(.9 + .2 * i.vitality - .22 * dorm, .6, 1.12),
      cycle: +(6.4 - 3.9 * i.momentum + 3.2 * dorm).toFixed(2),
      bob: +(1.1 + 4.2 * i.momentum - 2.2 * dorm).toFixed(2),
      sway: +(.8 + 3.2 * i.momentum).toFixed(2),
      droop: +(9 * dorm).toFixed(2),
      gold: clamp(i.streak / 21),
      ornament: Math.round(3 + 9 * clamp(i.streak / 14) + 5 * (tier - 1) + 4 * i.momentum),
      density: clamp(.2 + .62 * (1 - i.vitality) + .3 * dorm),
      aura: clamp((i.streak >= 7 ? .3 : 0) + .5 * i.momentum - .55 * dorm),
      dust: Math.round(clamp(dorm * 1.25) * 12),
      rough: clamp(.12 + .88 * i.volatility),
      fog: clamp(.06 + .55 * dorm),
      // v2 additions
      bulk: clamp(i.streak / 18),                                   // buff vs soft
      curl: clamp(.35 + .7 * i.volatility + .2 * i.momentum, 0, 1.4),
      joy: clamp(i.momentum * .55 + i.vitality * .55 - dorm * .8),  // bard's smile + aura
      emissive: clamp(.12 + .82 * i.momentum - .6 * dorm),          // biolume strength
      rim: clamp(.25 + .6 * i.vitality - .4 * dorm),                // rim-light strength
      bite: clamp(.34 + .2 * (1 - i.vitality)),                     // cel shadow coverage
      species: 1 + Math.min(3, Math.floor(i.streak / 7)),           // plant species unlocked
      seed: i.seed
    };
    return v;
  }
  var STATES = {
    radiant: { label: 'Radiant', note: 'streak ≥ 7, momentum ≥ .62 — gold event, bloom on, ornament peaks', color: PAL.gold },
    steady: { label: 'Steady', note: 'active today or yesterday — the neutral read', color: '#8B90A0' },
    drifting: { label: 'Drifting', note: '1–2 days idle — glow fades, rim light thins', color: '#7FA8C8' },
    slipping: { label: 'Slipping', note: '3–4 days idle — posture sags, hatching thickens, motes appear', color: '#C8A06B' },
    dormant: { label: 'Dormant', note: '5+ days idle — desaturated, fogged, nearly still', color: '#6E7382' }
  };
  var PRESETS = {
    radiant: { momentum: .95, vitality: .95, volatility: .18, streak: 16, neglect: 0, level: 8 },
    steady: { momentum: .6, vitality: .75, volatility: .3, streak: 4, neglect: 0, level: 4 },
    drifting: { momentum: .38, vitality: .6, volatility: .45, streak: 0, neglect: 2, level: 4 },
    slipping: { momentum: .2, vitality: .42, volatility: .62, streak: 0, neglect: 4, level: 3 },
    dormant: { momentum: .05, vitality: .22, volatility: .3, streak: 0, neglect: 7, level: 3 },
    awakening: { momentum: .5, vitality: .38, volatility: .7, streak: 1, neglect: 0, level: 3 }
  };
  function series(v, n) {
    var r = prng(v.seed + '|s'), out = [], i, base = v.input.vitality, trend, noise;
    for (i = 0; i < n; i++) {
      trend = base * (.55 + .45 * (i / (n - 1)) * (.4 + v.input.momentum));
      noise = (r() - .5) * 1.6 * v.input.volatility;
      out.push(clamp(trend + noise, .04, 1));
    }
    for (i = n - Math.min(n, v.input.neglect); i < n; i++) out[i] = 0;
    return out;
  }

  /* ---------- colour resolution ---------- */
  function skin(key, v) {
    var D = D2[key], s = v.sat, l = v.lum, ash = v.dorm * .6;
    function T(c) { return mix(tone(c, s, l), PAL.muted, ash * .55); }
    return {
      shadow: 'rgba(0,0,0,' + (.4 - v.dorm * .16).toFixed(2) + ')',
      fur: T(D.fur), furD: T(D.furD), furL: tone(T(D.fur), .9, 1.16),
      bone: T(PAL.bone), boneD: T(PAL.boneD), ink: mix('#171A22', '#3A3F4E', .1 + v.dorm * .3), dark: PAL.dark,
      c3: T(D.c3), c5: T(D.c5), c7: T(D.c7),
      accent: T(D.c5), accent3: T(D.c3), accentD: T(D.c7),
      gold: mix(T(PAL.gold), PAL.muted, (1 - v.gold) * .4), goldD: T(PAL.goldD),
      glow: tone(T(D.c3), 1.1, 1.18), eye: '#141018', muted: PAL.muted,
      moss: T('#3E8C5A'), paint: T('#2FC57E'), jewel: T(PAL.gold), lip: T(D.c7)
    };
  }

  /* ---------- anime eye ---------- */
  function eyeParts(P, x, y, r, mood, v, flip) {
    var C = P.C, sh = flip ? -1 : 1, lod = P.lod === undefined ? 1 : P.lod, closed = (mood === 'happy' && v.joy > .82) || v.dorm > .8;
    function push(o) { o.z = 7; o.grp = 'face'; P.parts.push(o); }
    if (closed) {
      push({ k: 'p', d: 'M' + (x - r) + ',' + (y + r * .1) + ' Q' + x + ',' + (y - r * (mood === 'happy' ? .9 : .2)) + ' ' + (x + r) + ',' + (y + r * .1), tone: 'eye', sw: r * .34, cap: 'round', fill: false });
      if (mood === 'happy') push({ k: 'p', d: 'M' + (x - r * .7) + ',' + (y + r * .7) + ' Q' + x + ',' + (y + r * 1.05) + ' ' + (x + r * .7) + ',' + (y + r * .7), tone: 'c5', sw: r * .18, cap: 'round', fill: false, op: .5 });
      return;
    }
    var squint = mood === 'fierce' ? .26 : mood === 'studious' ? .12 : v.dorm > .5 ? .34 : .04;
    var sclera = blobPts(x, y, r, r * (1 - squint * .9), function (t, a) { return 1 - .12 * Math.abs(Math.cos(a)); }, 14);
    push({ k: 'blob', pts: sclera, tone: 'bone', shade: 0, rim: 0 });
    var ir = r * .78, iy = y + r * .06;
    push({ k: 'blob', pts: blobPts(x + sh * r * .06, iy, ir, ir, null, 14), tone: 'c5', shade: 0, rim: 0, clipTo: sclera });
    push({ k: 'blob', pts: blobPts(x + sh * r * .06, iy - ir * .34, ir * .95, ir * .58, null, 12), tone: 'c7', shade: 0, rim: 0, clipTo: sclera, op: .9 });
    push({ k: 'blob', pts: blobPts(x + sh * r * .06, iy + ir * .48, ir * .82, ir * .4, null, 12), tone: 'glow', shade: 0, rim: 0, clipTo: sclera, op: .85 });
    push({ k: 'blob', pts: blobPts(x + sh * r * .06, iy, ir * .42, ir * .5, null, 12), tone: 'eye', shade: 0, rim: 0, clipTo: sclera });
    push({ k: 'blob', pts: blobPts(x - sh * r * .3, y - r * .34, r * .27, r * .22, null, 10), tone: 'bone', shade: 0, rim: 0, op: .95 });
    if (lod > .6) push({ k: 'blob', pts: blobPts(x + sh * r * .34, y + r * .38, r * .13, r * .11, null, 8), tone: 'bone', shade: 0, rim: 0, op: .6 });
    // lid
    var lidY = y - r * (1 - squint);
    push({ k: 'p', d: 'M' + (x - r * 1.05) + ',' + (y - r * .1) + ' Q' + (x - sh * r * .1) + ',' + lidY + ' ' + (x + r * 1.05) + ',' + (y - r * (mood === 'fierce' ? -.1 : .05)), tone: 'ink', sw: r * .3, cap: 'round', fill: false });
    if (mood === 'fierce') push({ k: 'p', d: 'M' + (x - r * 1.2) + ',' + (y - r * 1.5) + ' Q' + x + ',' + (y - r * 1.05) + ' ' + (x + r * 1.15) + ',' + (y - r * 1.25), tone: 'furD', sw: r * .3, cap: 'round', fill: false });
  }

  /* ---------- BUILD ---------- */
  function build(key, v, lod) {
    var D = D2[key], t = v.tier, r = prng(v.seed + '|' + key), P = { parts: [], C: skin(key, v), lod: lod === undefined ? 1 : lod }, i, n, a, L;
    var LOD = P.lod, FULL = LOD > .6;
    function LN(x) { return Math.max(1, Math.round(x * (.35 + .65 * LOD))); }
    function blob(pts, tn, z, grp, o) { var q = { k: 'blob', pts: pts, tone: tn, z: z, grp: grp || 'body', shade: 1, rim: 1 }; if (o) for (var kk in o) q[kk] = o[kk]; P.parts.push(q); return q; }
    function rib(line, w0, w1, tn, z, grp, o) {
      var pts = ribbonPts(line, function (s) { return w0 + (w1 - w0) * s; });
      return blob(pts, tn, z, grp, Object.assign({ shade: 0, rim: 0, thin: 1 }, o || {}));
    }
    function pth(d, tn, z, grp, o) { var q = { k: 'p', d: d, tone: tn, z: z, grp: grp || 'body' }; if (o) for (var kk in o) q[kk] = o[kk]; P.parts.push(q); }
    function glow(x, y, rr, tn, ii, z) { P.parts.push({ k: 'glow', x: x, y: y, r: rr, tone: tn || 'glow', i: ii === undefined ? 1 : ii, z: z === undefined ? 8 : z, grp: 'sig' }); }

    blob(blobPts(110, 230, 54 + 6 * t, 8, null, 12), 'shadow', 0, 'back', { shade: 0, rim: 0, soft: 1 });

    /* ============================ LION — Blanka-buff, wild multi-colour mane ==== */
    if (key === 'lion') {
      var bulk = v.bulk, soft = 1 - bulk;
      // tail
      rib(strandLine(150, 200, -.35, 62, .8 * v.curl, 7, r, 1.4), 5.5, 2, 'fur', 1, 'back');
      blob(blobPts(196, 172, 9, 12, null, 12, r, .3), 'accentD', 1, 'back', { shade: 0 });
      // legs
      rib([[92, 190], [88, 208], [86, 224]], 15 + 3 * bulk, 12, 'furD', 2, 'lower');
      rib([[128, 190], [132, 208], [134, 224]], 15 + 3 * bulk, 12, 'furD', 2, 'lower');
      blob(blobPts(84, 228, 15, 7, null, 12), 'furD', 2, 'lower', { shade: 0 });
      blob(blobPts(136, 228, 15, 7, null, 12), 'furD', 2, 'lower', { shade: 0 });
      // torso: shoulders swell with bulk, belly with softness
      blob(blobPts(110, 172, 40 + 9 * bulk, 44, function (s, ang) {
        return 1 + (.2 * bulk - .02) * -Math.sin(ang) + .26 * soft * Math.max(0, Math.sin(ang)) - .1 * bulk * Math.max(0, Math.sin(ang));
      }, 22, r, .02), 'fur', 3, 'body');
      if (bulk > .25) { blob(blobPts(94, 152, 16, 11, null, 12), 'furL', 4, 'body', { op: .55 * bulk, shade: 0, rim: 0 }); blob(blobPts(126, 150, 16, 11, null, 12), 'furL', 4, 'body', { op: .55 * bulk, shade: 0, rim: 0 }); }
      if (soft > .4) blob(blobPts(110, 196, 24 * soft + 12, 20, null, 14), 'furD', 4, 'body', { op: .4, shade: 0, rim: 0 });
      // arms — heavy
      rib([[76, 146], [58, 172], [66, 200]], 15 + 9 * bulk, 10, 'fur', 5, 'body');
      blob(blobPts(66, 206, 13, 12, null, 12, r, .1), 'fur', 5, 'body');
      rib([[144, 144], [168, 122], [172, 100]], 14 + 9 * bulk, 9, 'fur', 5, 'body');
      blob(blobPts(174, 94, 12, 11, null, 12, r, .1), 'fur', 5, 'body');
      rib([[152, 132], [162, 126]], 6, 6, 'gold', 6, 'body');
      pth(catmull([[80, 142], [110, 158], [142, 138]], false), 'c7', 6, 'body', { sw: 9, cap: 'round', fill: false });
      blob(blobPts(126, 149, 6.5, 6.5, null, 10), 'gold', 6, 'body');
      // MANE — two rows of curly tapered strands, hue cycled
      n = LN(15 + v.ornament * .8);
      var manePal = ['c5', 'c3', 'c7', 'gold', 'c5', 'c3'];
      for (i = 0; i < n; i++) {
        a = (i / n) * TAU + r() * .12;
        L = 26 + 8 * (t - 1) + r() * 16 + 12 * v.input.vitality;
        var mx = 106 + Math.cos(a) * 22, my = 100 + Math.sin(a) * 21;
        rib(strandLine(mx, my, a + (r() - .5) * .5, L, v.curl * 1.5, 6, r, i * .7), 7.5, 1.4,
          (t === 3 && i % 5 === 0) ? 'gold' : manePal[i % manePal.length], 4, 'mane');
      }
      if (FULL) for (i = 0; i < Math.round(n * .6); i++) {
        a = (i / (n * .6)) * TAU + .3;
        rib(strandLine(106 + Math.cos(a) * 14, 100 + Math.sin(a) * 13, a, 18 + r() * 10, v.curl * 1.8, 5, r, i), 6, 1.2, i % 2 ? 'c7' : 'accentD', 4, 'mane');
      }
      blob(blobPts(88, 78, 8, 8, null, 10), 'furD', 5, 'body', { shade: 0 });
      blob(blobPts(124, 78, 8, 8, null, 10), 'furD', 5, 'body', { shade: 0 });
      blob(blobPts(106, 102, 27, 25, function (s, ang) { return 1 - .06 * Math.sin(ang); }, 18, r, .02), 'fur', 6, 'head');
      blob(blobPts(106, 118, 17, 12, null, 14), 'bone', 6, 'head', { shade: 1, rim: 0 });
      pth('M106,112 Q110,109 113,113 Q109,118 106,118.5 Q103,118 99,113 Q102,109 106,112 Z', 'eye', 7, 'face');
      pth('M106,119 L106,124 M106,124 Q98,128 94,122 M106,124 Q114,128 118,122', 'furD', 7, 'face', { sw: 1.6, fill: false, cap: 'round' });
      pth('M99,124 L97,131 L102,126 Z', 'bone', 7, 'face'); pth('M113,124 L115,131 L110,126 Z', 'bone', 7, 'face');
      eyeParts(P, 94, 99, 7.4, 'fierce', v, 1); eyeParts(P, 119, 97, 7.4, 'fierce', v, 0);
      if (v.aura > .5) { glow(66, 206, 16, 'c3', v.aura); glow(174, 94, 15, 'c3', v.aura); }
    }

    /* ============================ SQUIRREL — artsy, green, painted tail ======== */
    if (key === 'squirrel') {
      var tl = strandLine(140, 210, -1.42, 132, .5, 9, r, .6);
      rib(tl, 21 + 4 * t, 9, 'furD', 1, 'back');
      rib(tl.slice(0, 8), 15 + 3 * t, 7, 'fur', 1, 'back');
      // paint-dipped tip + drips
      var tip = tl.slice(5);
      rib(tip, 15, 6, 'paint', 1, 'back', { op: .92 });
      for (i = 0; i < (FULL ? 4 : 2); i++) {
        var dp = tip[Math.min(tip.length - 1, 1 + i)], dl = 10 + r() * 20;
        rib([[dp[0] + (r() - .5) * 8, dp[1]], [dp[0] + (r() - .5) * 6, dp[1] + dl]], 2.4, 1.4, 'paint', 1, 'back', { op: .85 });
        blob(blobPts(dp[0] + (r() - .5) * 6, dp[1] + dl + 2, 2.6, 3.2, null, 8), 'paint', 1, 'back', { shade: 0, rim: 0 });
      }
      for (i = 0; i < (FULL ? 3 : 1); i++) blob(blobPts(60 + i * 44 + r() * 14, 228 + r() * 4, 9 + r() * 9, 3.4, null, 12, r, .5), i % 2 ? 'paint' : 'moss', 1, 'back', { shade: 0, rim: 0, op: .5 });
      rib([[94, 192], [92, 210], [90, 222]], 12, 10, 'furD', 2, 'lower');
      rib([[124, 192], [126, 210], [128, 222]], 12, 10, 'furD', 2, 'lower');
      blob(blobPts(88, 226, 13, 6, null, 12), 'furD', 2, 'lower', { shade: 0 });
      blob(blobPts(130, 226, 13, 6, null, 12), 'furD', 2, 'lower', { shade: 0 });
      blob(blobPts(108, 176, 33, 40, function (s, ang) { return 1 + .08 * Math.max(0, Math.sin(ang)); }, 20, r, .02), 'fur', 3, 'body');
      blob(blobPts(104, 184, 20, 26, null, 16), 'bone', 4, 'body', { shade: 1, rim: 0 });
      blob(blobPts(126, 156, 13, 10, null, 12, r, .35), 'moss', 4, 'body', { shade: 0, rim: 0, op: .8 });
      blob(blobPts(92, 166, 9, 7, null, 12, r, .35), 'moss', 4, 'body', { shade: 0, rim: 0, op: .6 });
      rib([[84, 158], [86, 142], [98, 138]], 9, 7, 'fur', 5, 'body');
      rib([[132, 158], [130, 142], [118, 138]], 9, 7, 'fur', 5, 'body');
      blob(blobPts(96, 137, 8, 7, null, 12), 'fur', 5, 'body');
      blob(blobPts(120, 137, 8, 7, null, 12), 'fur', 5, 'body');
      rib(strandLine(88, 82, -1.5, 30, .5, 5, r, 0), 8, 2, 'fur', 4, 'head');
      rib(strandLine(124, 80, -1.62, 30, -.5, 5, r, 1), 8, 2, 'fur', 4, 'head');
      blob(blobPts(106, 104, 27, 26, null, 18, r, .02), 'fur', 6, 'head');
      blob(blobPts(100, 118, 12, 9, null, 14), 'bone', 6, 'head', { shade: 1, rim: 0 });
      pth('M100,112 Q103,109 106,112 Q103,117 100,117.5 Q97,117 94,112 Q97,109 100,112 Z', 'eye', 7, 'face');
      eyeParts(P, 95, 101, 7.6, 'bright', v, 1); eyeParts(P, 119, 99, 7.6, 'bright', v, 0);
      blob(blobPts(108, 144, 9.5, 10.5, null, 12), 'gold', 7, 'body');
      pth('M99,139 Q108,131 117,139 L117,142 Q108,136 99,142 Z', 'goldD', 7, 'body');
      for (i = 0; i < t; i++) pth('M108,144 m-' + (17 + i * 7) + ',0 a' + (17 + i * 7) + ',' + (17 + i * 7) + ' 0 1,0 ' + (34 + i * 14) + ',0 a' + (17 + i * 7) + ',' + (17 + i * 7) + ' 0 1,0 -' + (34 + i * 14) + ',0', 'c3', 8, 'sig', { sw: 1.8 - i * .4, fill: false, op: .75 });
      // PLANTS — species unlocked by streak; some rooted in its back
      n = Math.min(10, LN(1.5 + v.input.streak * .55 + (t - 1)));
      for (i = 0; i < n; i++) {
        var onBack = i % 3 === 2, sd = i % 2 ? 1 : -1;
        var px = onBack ? 108 + sd * (10 + r() * 20) : 110 + sd * (34 + (i * 11) % 48 + r() * 10);
        var py = onBack ? 150 + r() * 10 : 224 - (i % 3) * 3;
        var ph = 20 + r() * 30 + 10 * v.input.vitality, sp = i % v.species;
        var st = strandLine(px, py, -Math.PI / 2 + sd * .22, ph, .5 + r() * .5, 5, r, i);
        rib(st, 2.6, 1.2, 'moss', onBack ? 5 : 2, onBack ? 'body' : 'lower');
        var tp = st[st.length - 1];
        if (sp === 0) {
          for (var j = 0; j < (FULL ? 4 : 2); j++) {
            var lf = st[Math.max(1, st.length - 1 - j)];
            rib([[lf[0], lf[1]], [lf[0] + sd * (7 - j) * 1.5, lf[1] - 3]], 2.6, .6, j % 2 ? 'c3' : 'c5', onBack ? 5 : 2, onBack ? 'body' : 'lower');
            rib([[lf[0], lf[1]], [lf[0] - sd * (7 - j) * 1.4, lf[1] - 2]], 2.4, .6, j % 2 ? 'c5' : 'c3', onBack ? 5 : 2, onBack ? 'body' : 'lower');
          }
        } else if (sp === 1) {
          blob(blobPts(tp[0], tp[1] - 3, 4.4, 7, null, 10, r, .2), 'c3', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
          blob(blobPts(tp[0] - sd * 7, tp[1] + 3, 5.6, 3.4, null, 10, r, .2), 'c5', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
          blob(blobPts(tp[0] + sd * 7, tp[1] + 5, 5, 3, null, 10, r, .2), 'c7', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
        } else if (sp === 2) {
          blob(blobPts(tp[0], tp[1] - 4, 5.4, 6.4, null, 12), 'c5', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
          for (var q2 = 0; q2 < 5; q2++) { var qa = -Math.PI / 2 + (q2 - 2) * .5; blob(blobPts(tp[0] + Math.cos(qa) * 8, tp[1] - 4 + Math.sin(qa) * 8, 3, 4.4, null, 8), q2 % 2 ? 'c3' : 'paint', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0, op: .9 }); }
          if (v.gold > .5) blob(blobPts(tp[0], tp[1] - 4, 2.6, 2.6, null, 8), 'gold', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
        } else {
          blob(blobPts(tp[0], tp[1] - 5, 6.2, 6.2, null, 12), 'c7', onBack ? 5 : 2, onBack ? 'body' : 'lower', { shade: 0, rim: 0 });
          for (var q3 = 0; q3 < 5; q3++) blob(blobPts(tp[0] + (r() - .5) * 16, tp[1] - 14 - r() * 12, 1.5, 1.5, null, 6), 'c3', onBack ? 5 : 2, 'sig', { shade: 0, rim: 0, op: .7 });
          if (v.emissive > .5) glow(tp[0], tp[1] - 5, 10, 'c3', v.emissive * .7);
        }
      }
    }

    /* ============================ MOTH ARCHIVIST — biotech data wings ========== */
    if (key === 'moth') {
      function wing(sd, big) {
        var base = big ? [106, 146] : [106, 128];
        var sc = big ? 1 : 1.18, sp = .5 + .5 * v.input.momentum;
        var pts = blobPts(base[0] + sd * 44 * sc, base[1] - (big ? 6 : 24) * sc, 46 * sc, big ? 30 : 34,
          function (s, ang) { return 1 + .22 * Math.cos(ang * 2 + sd) - .14 * Math.max(0, Math.sin(ang)) * (big ? 1 : 0); }, 20, r, .05);
        var q = blob(pts, big ? 'c7' : 'c5', big ? 1 : 2, 'wing' + (sd > 0 ? 'R' : 'L'), { op: big ? .92 : .96, shade: 1, rim: 1, membrane: 1 });
        // veins
        var vn = LN(3 + v.ornament * .35);
        for (var k2 = 0; k2 < vn; k2++) {
          var aa = (-.7 + (k2 / (vn - 1 || 1)) * 1.5) * (big ? 1 : .8);
          var vl = strandLine(base[0] + sd * 8, base[1] - (big ? 2 : 16), sd > 0 ? aa : Math.PI - aa, 40 + r() * 22 * sc, .25, 5, r, k2);
          rib(vl, 1.9, .5, 'c3', big ? 1 : 2, 'wing' + (sd > 0 ? 'R' : 'L'), { op: .55 + .4 * v.emissive });
          if (v.emissive > .35 && k2 % 2 === 0) glow(vl[vl.length - 1][0], vl[vl.length - 1][1], 7, 'glow', v.emissive * .8, big ? 1 : 2);
        }
        // eyespots — one per closed task
        var es = LN(v.ornament * .45);
        for (var k3 = 0; k3 < es; k3++) {
          var ea = -1 + r() * 1.9, er = 18 + r() * 24;
          var ex = base[0] + sd * (18 + Math.cos(ea) * er), ey = base[1] - (big ? 4 : 20) + Math.sin(ea) * er * .6;
          blob(blobPts(ex, ey, 5 + r() * 3.4, 5 + r() * 3.4, null, 10), 'c3', big ? 1 : 2, 'wing' + (sd > 0 ? 'R' : 'L'), { shade: 0, rim: 0, op: .8 });
          blob(blobPts(ex, ey, 2.4, 2.4, null, 8), k3 % 3 === 0 ? 'gold' : 'dark', big ? 1 : 2, 'wing' + (sd > 0 ? 'R' : 'L'), { shade: 0, rim: 0 });
        }
      }
      wing(-1, true); wing(1, true); wing(-1, false); wing(1, false);
      for (i = 0; i < 4; i++) blob(blobPts(110, 186 + i * 11, 15 - i * 2.2, 8 - i * .8, null, 12), i % 2 ? 'furD' : 'fur', 3, 'body');
      blob(blobPts(110, 160, 21, 26, null, 18, r, .06), 'fur', 4, 'body');
      n = FULL ? 16 : 8;
      for (i = 0; i < n; i++) { a = (i / n) * TAU; rib(strandLine(110 + Math.cos(a) * 16, 160 + Math.sin(a) * 20, a, 9 + r() * 7, .8, 3, r, i), 3.4, .6, 'furD', 4, 'body'); }
      rib([[96, 152], [82, 166], [86, 182]], 5.5, 4, 'furD', 5, 'body');
      rib([[124, 152], [138, 166], [134, 182]], 5.5, 4, 'furD', 5, 'body');
      blob(blobPts(108, 190, 17, 13, null, 14), 'c7', 5, 'body', { op: .85 });
      for (i = 0; i < Math.max(2, Math.round(v.ornament * .3)); i++) blob(blobPts(99 + (i % 4) * 6, 186 + Math.floor(i / 4) * 7, 1.7, 1.7, null, 6), 'glow', 6, 'body', { shade: 0, rim: 0 });
      if (v.emissive > .2) glow(108, 190, 20, 'glow', v.emissive);
      blob(blobPts(110, 116, 19, 17, null, 16), 'fur', 6, 'head');
      for (i = 0; i < 2; i++) {
        var sd2 = i ? 1 : -1, an = strandLine(110 + sd2 * 9, 104, -Math.PI / 2 + sd2 * .62, 40 + 8 * (t - 1), .38, 6, r, i * 2);
        rib(an, 2.6, 1, 'furD', 6, 'sig');
        for (var b2 = 1; b2 < an.length; b2 += (FULL ? 1 : 2)) {
          var bl = 7 - b2 * .8;
          rib([[an[b2][0], an[b2][1]], [an[b2][0] + sd2 * bl, an[b2][1] - bl * .5]], 1.5, .4, 'c3', 6, 'sig', { op: .8 });
          if (FULL) rib([[an[b2][0], an[b2][1]], [an[b2][0] - sd2 * bl * .7, an[b2][1] - bl * .5]], 1.4, .4, 'c3', 6, 'sig', { op: .6 });
        }
      }
      eyeParts(P, 101, 116, 9.4, 'calm', v, 1); eyeParts(P, 121, 115, 9.4, 'calm', v, 0);
      for (i = 0; i < v.dust + Math.round(4 * v.emissive); i++) blob(blobPts(46 + r() * 128, 70 + r() * 150, 1.5, 1.5, null, 6), i % 3 ? 'c3' : 'gold', 9, 'fx', { shade: 0, rim: 0, op: .7 });
    }

    /* ============================ BIRD SCHOLAR ================================ */
    if (key === 'bird') {
      n = LN(5 + v.ornament * .5);
      for (i = 0; i < n; i++) {
        var ff = i / (n - 1 || 1), sp2 = .8 + .5 * v.input.momentum;
        var fl = 44 + 30 * Math.sin(ff * Math.PI) + 8 * (t - 1);
        rib(strandLine(88, 154, Math.PI + (-.5 + ff * 1.15) * sp2, fl, .22, 4, r, i), 6.5 - ff * 2.6, 1.2, i % 2 ? 'c5' : 'c3', 2, 'wingL');
        rib(strandLine(132, 154, (.5 - ff * 1.15) * sp2, fl, -.22, 4, r, i), 6.5 - ff * 2.6, 1.2, i % 2 ? 'c5' : 'c3', 2, 'wingR');
      }
      for (i = 0; i < 3 + t; i++) rib(strandLine(110, 194, Math.PI / 2 + (i - (2 + t) / 2) * .26, 34 + i * 3, .2, 4, r, i), 5.5, 1.4, 'c7', 2, 'lower');
      blob(blobPts(110, 162, 27, 38, function (s, ang) { return 1 - .1 * Math.max(0, Math.sin(ang)); }, 18, r, .02), 'fur', 3, 'body');
      blob(blobPts(106, 170, 17, 26, null, 16), 'boneD', 4, 'body', { shade: 1, rim: 0, op: .55 });
      pth(catmull([[90, 138], [110, 150], [130, 136]], false), 'c5', 4, 'body', { sw: 10, cap: 'round', fill: false });
      rib([[88, 176], [82, 190], [86, 202]], 7, 5, 'fur', 5, 'body');
      rib([[132, 176], [138, 190], [134, 202]], 7, 5, 'fur', 5, 'body');
      blob(blobPts(109, 108, 25, 24, null, 16, r, .02), 'fur', 6, 'head');
      pth('M109,102 L86,113 L109,122 Z', 'gold', 6, 'face');
      pth('M109,122 L92,126 L109,130 Z', 'goldD', 6, 'face');
      for (i = 0; i < 2 + t; i++) rib(strandLine(104 + i * 4, 86, -Math.PI / 2 + .3 + i * .12, 20 + i * 5, .5, 4, r, i), 3.4, .8, i === 0 ? 'gold' : 'c5', 5, 'sig');
      eyeParts(P, 100, 108, 8, 'studious', v, 1); eyeParts(P, 120, 106, 8, 'studious', v, 0);
      pth('M100,108 m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0 M120,106 m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0 M111,107 L109,107', 'gold', 7, 'face', { sw: 1.6, fill: false, op: .95 });
      blob([[50, 188], [98, 176], [104, 212], [56, 224]], 'bone', 6, 'body', { shade: 1, rim: 0 });
      var s30 = series(v, 12), dd = '', pl;
      for (i = 0; i < s30.length; i++) { pl = [56 + (i / (s30.length - 1)) * 42, 212 - s30[i] * 25 - (i / s30.length) * 4]; dd += (i ? ' L' : 'M') + f2(pl); }
      pth(dd, 'gold', 7, 'body', { sw: 1.9, fill: false, cap: 'round' });
      blob(blobPts(98, 212 - s30[s30.length - 1] * 25 - 4, 2.4, 2.4, null, 8), 'gold', 7, 'body', { shade: 0, rim: 0 });
    }

    /* ============================ PANDA BARD — joy, jewellery, lute =========== */
    if (key === 'bard') {
      var joy = v.joy;
      blob(blobPts(146, 186, 30, 34, null, 16, r, .02), 'furD', 1, 'back', { shade: 1 });
      blob(blobPts(146, 186, 22, 25, null, 14), 'boneD', 1, 'back', { shade: 0, rim: 0, op: .5 });
      blob(blobPts(146, 186, 7, 7, null, 10), 'gold', 1, 'back', { shade: 0, rim: 0 });
      rib([[152, 158], [176, 118], [184, 98]], 6.5, 5, 'furD', 1, 'back');
      blob(blobPts(186, 94, 8, 6, null, 10), 'dark', 1, 'back', { shade: 0, rim: 0 });
      for (i = 0; i < (FULL ? 4 : 2); i++) rib([[142 + i * 3, 200], [176 + i * 2.2, 108]], .7, .55, 'boneD', 1, 'back', { op: .6 });
      rib([[94, 194], [90, 212], [88, 226]], 12, 10, 'ink', 2, 'lower');
      rib([[124, 194], [128, 212], [130, 226]], 12, 10, 'ink', 2, 'lower');
      blob(blobPts(86, 230, 13, 6, null, 12), 'ink', 2, 'lower', { shade: 0 });
      blob(blobPts(132, 230, 13, 6, null, 12), 'ink', 2, 'lower', { shade: 0 });
      blob(blobPts(108, 176, 34, 40, null, 20, r, .02), 'bone', 3, 'body');
      blob(blobPts(104, 184, 21, 26, null, 16), 'boneD', 4, 'body', { shade: 0, rim: 0, op: .4 });
      pth(catmull([[80, 150], [108, 164], [138, 146]], false), 'c5', 4, 'body', { sw: 11, cap: 'round', fill: false });
      rib([[86, 152], [78, 176], [96, 190]], 10, 8, 'ink', 5, 'body');
      blob(blobPts(102, 192, 9, 8, null, 12), 'ink', 5, 'body');
      rib([[132, 150], [156, 132], [172, 116]], 10, 8, 'ink', 5, 'body');
      blob(blobPts(176, 112, 9, 8, null, 12), 'ink', 5, 'body');
      // necklace — one bead per streak day
      var bn = Math.min(11, LN(3 + v.input.streak * .5));
      for (i = 0; i < bn; i++) {
        var ba = -.95 + (i / (bn - 1)) * 1.9;
        blob(blobPts(108 + Math.sin(ba) * 26, 156 + Math.cos(ba) * 13, 2.8 + (i % 3 === 0 ? 1.1 : 0), 2.8 + (i % 3 === 0 ? 1.1 : 0), null, 8),
          i % 3 === 0 ? 'gold' : 'c5', 6, 'body', { shade: 0, rim: 0 });
      }
      blob(blobPts(84, 76, 12, 12, null, 12), 'ink', 5, 'head');
      blob(blobPts(132, 76, 12, 12, null, 12), 'ink', 5, 'head');
      blob(blobPts(108, 106, 30, 28, null, 20, r, .02), 'bone', 6, 'head');
      blob(blobPts(94, 106, 9.5, 11, null, 12), 'ink', 6, 'head', { shade: 0, rim: 0 });
      blob(blobPts(122, 104, 9.5, 11, null, 12), 'ink', 6, 'head', { shade: 0, rim: 0 });
      blob(blobPts(108, 122, 13, 9.5, null, 14), 'boneD', 6, 'head', { shade: 1, rim: 0 });
      pth('M108,117 Q111,114 114,118 Q110,123 108,123.5 Q106,123 102,118 Q105,114 108,117 Z', 'eye', 7, 'face');
      pth('M' + (108 - 9) + ',126 Q108,' + (126 + 4 + joy * 8).toFixed(1) + ' ' + (108 + 9) + ',126', 'eye', 7, 'face', { sw: 1.8, cap: 'round', fill: false });
      eyeParts(P, 94, 106, 7.6, 'happy', v, 1); eyeParts(P, 122, 104, 7.6, 'happy', v, 0);
      // jewellery: hoop earring, ear flower, wrist ring
      pth('M136,88 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', 'gold', 7, 'head', { sw: 2, fill: false });
      for (i = 0; FULL && i < 5; i++) { var pa = (i / 5) * TAU; blob(blobPts(80 + Math.cos(pa) * 7, 66 + Math.sin(pa) * 7, 4.4, 3.4, null, 8), i % 2 ? 'c3' : 'c5', 7, 'head', { shade: 0, rim: 0 }); }
      blob(blobPts(80, 66, 3.2, 3.2, null, 8), 'gold', 7, 'head', { shade: 0, rim: 0 });
      rib([[96, 186], [104, 190]], 3, 3, 'gold', 6, 'body');
      // aura of notes / motes — count and brightness from joy
      n = LN(2 + joy * 9);
      for (i = 0; i < n; i++) {
        a = -2.9 + (i / (n - 1 || 1)) * 2.5 + (r() - .5) * .25;
        var ar = 46 + r() * 40, ax = 108 + Math.cos(a) * ar, ay = 116 + Math.sin(a) * ar * .9;
        blob(blobPts(ax, ay, 3 + r() * 2.4, 3 + r() * 2.4, null, 8), i % 3 === 0 ? 'gold' : 'c3', 8, 'sig', { shade: 0, rim: 0, op: (.4 + joy * .6).toFixed(2) });
        if (i % 3 === 1) rib([[ax + 3, ay], [ax + 3, ay - 9]], 1.1, 1.1, i % 2 ? 'gold' : 'c3', 8, 'sig', { op: .6 + joy * .4 });
      }
      if (joy > .45) glow(108, 116, 92, 'c3', (joy - .45) * 1.2, 8);
      for (i = 0; i < v.dust; i++) blob(blobPts(50 + r() * 130, 80 + r() * 130, 1.5, 1.5, null, 6), 'muted', 9, 'fx', { shade: 0, rim: 0, op: .6 });
    }

    // posture: sag the upper body when dormant
    if (v.droop > .1) for (i = 0; i < P.parts.length; i++) {
      var pp = P.parts[i];
      if (['head', 'face', 'body'].indexOf(pp.grp) >= 0 && pp.pts) for (var g2 = 0; g2 < pp.pts.length; g2++) pp.pts[g2][1] += v.droop * .55;
      else if (['head', 'face'].indexOf(pp.grp) >= 0 && pp.k === 'p') pp.sag = v.droop * .55;
    }
    P.parts.sort(function (x, y) { return x.z - y.z; });
    return P;
  }

  /* ---------- descriptor helpers ---------- */
  function glowGrad(defs, uid, col) {
    var id = uid + 'rg' + String(col).replace(/[^a-z0-9]/gi, '');
    if (!defs.__seen) defs.__seen = {};
    if (!defs.__seen[id]) {
      defs.__seen[id] = 1;
      defs.push({ t: 'radialGradient', a: { id: id }, k: id, c: [
        { t: 'stop', k: '0', a: { offset: '0', stopColor: col, stopOpacity: '.9' } },
        { t: 'stop', k: '1', a: { offset: '1', stopColor: col, stopOpacity: '0' } }] });
    }
    return 'url(#' + id + ')';
  }

  function fillNode(q, C, uid, i, extra) {
    var col = C[q.tone] || q.tone, a;
    if (q.k === 'blob') {
      a = { d: catmull(q.pts, true), fill: col };
      if (q.op !== undefined) a.opacity = q.op;
      if (extra) for (var k in extra) a[k] = extra[k];
      return { t: 'path', a: a, k: uid + 'b' + i };
    }
    a = { d: q.d };
    if (q.sag) a.transform = 'translate(0 ' + q.sag.toFixed(1) + ')';
    if (q.fill === false) { a.fill = 'none'; a.stroke = col; a.strokeWidth = q.sw || 2; a.strokeLinecap = q.cap || 'round'; a.strokeLinejoin = 'round'; }
    else a.fill = col;
    if (q.op !== undefined) a.opacity = q.op;
    if (extra) for (var k2 in extra) a[k2] = extra[k2];
    return { t: 'path', a: a, k: uid + 'p' + i };
  }
  var GROUPS = ['back', 'lower', 'body', 'mane', 'wingL', 'wingR', 'wing', 'head', 'face', 'sig', 'fx'];
  function bucket(parts) {
    var g = {}, i, k;
    for (i = 0; i < GROUPS.length; i++) g[GROUPS[i]] = [];
    for (i = 0; i < parts.length; i++) { k = parts[i].grp; if (!g[k]) g[k] = []; g[k].push(parts[i]); }
    return g;
  }
  function anim(v, kind) {
    var c = v.cycle, base = { transformBox: 'view-box' };
    function S(o) { for (var k in base) if (o[k] === undefined) o[k] = base[k]; return o; }
    if (kind === 'bob') return S({ animation: 'ffBob ' + c + 's ease-in-out infinite', transformOrigin: '110px 210px', '--ffBob': v.bob + 'px' });
    if (kind === 'sway') return S({ animation: 'ffSway ' + (c * 1.4) + 's ease-in-out infinite', transformOrigin: '110px 226px', '--ffSway': v.sway + 'deg' });
    if (kind === 'flapL') return S({ animation: 'ffFlapL ' + (c * .34).toFixed(2) + 's ease-in-out infinite', transformOrigin: '108px 152px', '--ffFlap': (7 + v.input.momentum * 16).toFixed(1) + 'deg' });
    if (kind === 'flapR') return S({ animation: 'ffFlapR ' + (c * .34).toFixed(2) + 's ease-in-out infinite', transformOrigin: '108px 152px', '--ffFlap': (7 + v.input.momentum * 16).toFixed(1) + 'deg' });
    if (kind === 'drift') return S({ animation: 'ffDrift ' + (c * 2.6) + 's ease-in-out infinite', transformOrigin: '110px 130px' });
    if (kind === 'twinkle') return S({ animation: 'ffTwinkle ' + (c * .9) + 's ease-in-out infinite alternate' });
    if (kind === 'fall') return S({ animation: 'ffFall ' + (c * 1.8) + 's linear infinite' });
    if (kind === 'mane') return S({ animation: 'ffSway ' + (c * .8) + 's ease-in-out infinite', transformOrigin: '106px 118px', '--ffSway': (1 + v.curl * 2.4).toFixed(2) + 'deg' });
    return {};
  }
  function grpAnim(name, key, v, hi) {
    if (hi === false) return {};
    if (name === 'fx') return anim(v, 'fall');
    if (name === 'sig') return anim(v, key === 'moth' ? 'drift' : 'twinkle');
    if (name === 'mane') return anim(v, 'mane');
    if (name === 'wingL' || name === 'wingR') return anim(v, name === 'wingL' ? 'flapL' : 'flapR');
    if (name === 'lower' || name === 'back') return anim(v, 'sway');
    return anim(v, 'bob');
  }

  /* ---------- 2a — CEL BLOOM (anime cel shading) ---------- */
  function celBloom(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo', B = build(key, v, hi ? 1 : .3), C = B.C, uid = 'a' + key + (opt.uid || '');
    var defs = [], nodes = [], g = bucket(B.parts), gi = 0;
    function render(list, gname) {
      var kids = [], i, q, sh, la;
      for (i = 0; i < list.length; i++) {
        q = list[i];
        if (q.k === 'glow') {
          if (!hi) continue;
          kids.push({ t: 'circle', k: uid + 'gl' + gname + i, a: { cx: q.x, cy: q.y, r: q.r * 1.55, fill: glowGrad(defs, uid, C[q.tone] || q.tone), opacity: (.6 * q.i).toFixed(2) } });
          kids.push({ t: 'circle', k: uid + 'gc' + gname + i, a: { cx: q.x, cy: q.y, r: Math.max(1.4, q.r * .22), fill: C.glow, opacity: (.55 * q.i).toFixed(2) } });
          continue;
        }
        kids.push(fillNode(q, C, uid + gname, i));
        if (q.k === 'blob' && q.shade && hi) {
          sh = celShadow(q.pts, v.bite, 6);
          if (sh) kids.push({ t: 'path', k: uid + 'sh' + gname + i, a: { d: sh, fill: mix(C[q.tone] || q.tone, '#1B1E2C', .34), opacity: q.op !== undefined ? q.op : 1 } });
        }
        if (q.k === 'blob' && q.rim && hi && v.rim > .12) {
          la = litArc(q.pts, .42);
          if (la) kids.push({ t: 'path', k: uid + 'ri' + gname + i, a: { d: la, fill: 'none', stroke: mix(C.bone, C.glow, .5), strokeWidth: 1.7, strokeLinecap: 'round', opacity: (v.rim * .8).toFixed(2) } });
        }
      }
      return { t: 'g', a: { style: grpAnim(gname, key, v, hi) }, k: uid + 'G' + gname, c: kids };
    }
    if (v.aura > .1) nodes.push({ t: 'ellipse', k: uid + 'aura', a: { cx: 110, cy: 150, rx: 104, ry: 116, fill: glowGrad(defs, uid, C.glow), opacity: (v.aura * .3).toFixed(3) } });
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(render(g[GROUPS[gi]], GROUPS[gi]));
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  /* ---------- 2b — INK & SPORE (tapered ink, hatch cores, biolume) ---------- */
  function celHatch(q, C, uid, gname, i, v) {
    var out = [], bb = bbox(q.pts), sh = celShadow(q.pts, v.bite + .12, 4);
    if (!sh) return out;
    var cid = uid + 'c' + gname + i;
    out.push({ t: 'clipPath', a: { id: cid }, k: cid, c: [{ t: 'path', a: { d: sh }, k: 'p' }] });
    var step = 3.2 - v.density * 1.7, x, d = '';
    for (x = bb[0] - (bb[3] - bb[1]); x < bb[2] + 4; x += step) d += 'M' + x.toFixed(1) + ',' + bb[3].toFixed(1) + ' L' + (x + (bb[3] - bb[1])).toFixed(1) + ',' + bb[1].toFixed(1) + ' ';
    out.push({
      t: 'g', a: { clipPath: 'url(#' + cid + ')' }, k: uid + 'hg' + gname + i,
      c: [{ t: 'path', a: { d: d, stroke: '#14161F', strokeWidth: (.55 + v.density * .7).toFixed(2), fill: 'none', opacity: (.3 + v.density * .35).toFixed(2) }, k: 'h' }]
    });
    return out;
  }
  function inkSpore(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo', B = build(key, v, hi ? 1 : .3), C = B.C, uid = 'b' + key + (opt.uid || '');
    var defs = [], nodes = [], g = bucket(B.parts), INK = '#14161F', gi;
    function render(list, gname) {
      var kids = [], i, q, j, hs, la;
      for (i = 0; i < list.length; i++) {
        q = list[i];
        if (q.k === 'glow') {
          if (!hi) continue;
          kids.push({ t: 'circle', k: uid + 'gl' + gname + i, a: { cx: q.x, cy: q.y, r: q.r * 1.6, fill: glowGrad(defs, uid, C[q.tone] || q.tone), opacity: (.6 * q.i).toFixed(2) } });
          kids.push({ t: 'circle', k: uid + 'gc' + gname + i, a: { cx: q.x, cy: q.y, r: Math.max(1.4, q.r * .2), fill: C.bone, opacity: (.7 * q.i).toFixed(2) } });
          continue;
        }
        kids.push(fillNode(q, C, uid + gname, i, q.membrane ? { opacity: .8 } : null));
        if (q.k === 'blob' && q.shade && hi) { hs = celHatch(q, C, uid, gname, i, v); for (j = 0; j < hs.length; j++) (hs[j].t === 'clipPath' ? defs : kids).push(hs[j]); }
        if (q.k === 'blob' && !q.thin) kids.push({ t: 'path', k: uid + 'o' + gname + i, a: { d: catmull(q.pts, true), fill: 'none', stroke: INK, strokeWidth: q.tone === 'shadow' ? 0 : (hi ? 1.5 : 1), strokeLinejoin: 'round', opacity: .92 } });
        if (q.k === 'blob' && q.rim && hi && v.rim > .2) { la = litArc(q.pts, .38); if (la) kids.push({ t: 'path', k: uid + 'r' + gname + i, a: { d: la, fill: 'none', stroke: C.bone, strokeWidth: 2.2, strokeLinecap: 'round', opacity: (v.rim * .5).toFixed(2) } }); }
      }
      return { t: 'g', a: { style: grpAnim(gname, key, v, hi) }, k: uid + 'G' + gname, c: kids };
    }
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(render(g[GROUPS[gi]], GROUPS[gi]));
    if (hi) {
      defs.push({
        t: 'filter', a: { id: uid + 'grain', x: '0', y: '0', width: '100%', height: '100%' }, k: 'fg', c: [
          { t: 'feTurbulence', k: 'a', a: { type: 'fractalNoise', baseFrequency: '.85', numOctaves: '2', stitchTiles: 'stitch' } },
          { t: 'feColorMatrix', k: 'b', a: { type: 'saturate', values: '0' } }]
      });
      nodes.push({ t: 'rect', k: uid + 'gr', a: { x: 0, y: 0, width: W, height: H, filter: 'url(#' + uid + 'grain)', opacity: (.07 + v.density * .1).toFixed(2), pointerEvents: 'none' } });
    }
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  /* ---------- 2c — CHITIN & GLASS (translucent plates, sheen, glowing seams) -- */
  function chitin(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo', B = build(key, v, hi ? 1 : .3), C = B.C, uid = 'c' + key + (opt.uid || '');
    var defs = [], nodes = [], g = bucket(B.parts), gi, gid = 0;
    function render(list, gname) {
      var kids = [], i, q, col, sh, la, id;
      for (i = 0; i < list.length; i++) {
        q = list[i];
        if (q.k === 'glow') {
          if (!hi) continue;
          kids.push({ t: 'circle', k: uid + 'gl' + gname + i, a: { cx: q.x, cy: q.y, r: q.r * 1.75, fill: glowGrad(defs, uid, C.glow), opacity: (.68 * q.i).toFixed(2) } });
          kids.push({ t: 'circle', k: uid + 'gc' + gname + i, a: { cx: q.x, cy: q.y, r: Math.max(1.4, q.r * .2), fill: '#FFFFFF', opacity: (.8 * q.i).toFixed(2) } });
          continue;
        }
        col = C[q.tone] || q.tone;
        if (q.k === 'blob' && hi && q.tone !== 'shadow') {
          id = uid + 'lg' + gname + i;
          defs.push({
            t: 'linearGradient', a: { id: id, x1: '0', y1: '0', x2: '.7', y2: '1' }, k: id, c: [
              { t: 'stop', k: '0', a: { offset: '0', stopColor: mix(col, '#FFFFFF', .3 + .2 * v.rim) } },
              { t: 'stop', k: '1', a: { offset: '.52', stopColor: col } },
              { t: 'stop', k: '2', a: { offset: '1', stopColor: mix(col, '#0B0D14', .42) } }]
          });
          kids.push({ t: 'path', k: uid + 'b' + gname + i, a: { d: catmull(q.pts, true), fill: 'url(#' + id + ')', opacity: q.op !== undefined ? q.op : (q.membrane ? .82 : 1) } });
        } else kids.push(fillNode(q, C, uid + gname, i));
        if (q.k === 'blob' && q.shade && hi) {
          sh = celShadow(q.pts, v.bite * .8, 10);
          if (sh) kids.push({ t: 'path', k: uid + 'sh' + gname + i, a: { d: sh, fill: '#0B0D14', opacity: .22 } });
        }
        if (q.k === 'blob' && q.rim && hi) {
          la = litArc(q.pts, .34);
          if (la) {
            kids.push({ t: 'path', k: uid + 'r1' + gname + i, a: { d: la, fill: 'none', stroke: C.glow, strokeWidth: 4.6, strokeLinecap: 'round', opacity: (.12 + v.emissive * .22).toFixed(2) } });
            kids.push({ t: 'path', k: uid + 'r2' + gname + i, a: { d: la, fill: 'none', stroke: '#FFFFFF', strokeWidth: 1.1, strokeLinecap: 'round', opacity: (v.rim * .6).toFixed(2) } });
          }
        }
      }
      return { t: 'g', a: { style: grpAnim(gname, key, v, hi) }, k: uid + 'G' + gname, c: kids };
    }
    nodes.push({ t: 'ellipse', k: uid + 'amb', a: { cx: 110, cy: 156, rx: 112, ry: 124, fill: glowGrad(defs, uid, C.c7), opacity: (.22 + v.emissive * .22).toFixed(3) } });
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(render(g[GROUPS[gi]], GROUPS[gi]));
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  return {
    W: W, H: H, PAL: PAL, DOMAINS: D2, ORDER: ORDER2, SIGNALS: SIGNALS, STATES: STATES, PRESETS: PRESETS,
    vitals: vitals, build: build, skin: skin, series: series, prng: prng, clamp: clamp, mix: mix, tone: tone,
    celBloom: celBloom, inkSpore: inkSpore, chitin: chitin, catmull: catmull, GROUPS: GROUPS, anim: anim, grpAnim: grpAnim
  };
})();
