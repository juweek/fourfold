/* Fourfold — Creature Lab v3
   Round 3: the 2c direction refined. Angular faceted plates, no CSS animation by default,
   no per-form gradients (flat band polygons instead — cheaper AND more angular).
   Cast: squirrel, lion, bird, bard.                                    window.CreatureLab3 */
window.CreatureLab3 = (function () {
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
      sig: 'muscle definition + mane fullness from streak, claw extension from momentum'
    },
    bird: {
      key: 'bird', name: 'Eagle Scholar', short: 'Eagle', domain: 'Finance', mood: 'studious',
      c3: '#FFE08A', c5: '#F2C13E', c7: '#A8761A', fur: '#F9EFC8', furD: '#C29A3C',
      sig: 'three feather rows scale with level; the slab plots the real 30-day trend'
    },
    bard: {
      key: 'bard', name: 'Panda Bard', short: 'Bard', domain: 'Enjoyment', mood: 'happy',
      c3: '#FFB3D2', c5: '#E4699F', c7: '#A83A6B', fur: '#EDE6D6', furD: '#A79F8D',
      sig: 'gourd fill, jewellery count and smile arc all read joy'
    }
  };
  var ORDER3 = ['squirrel', 'lion', 'bird', 'bard'];

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
    var state = 'steady';
    if (i.neglect >= 5) state = 'dormant';
    else if (i.neglect >= 3) state = 'slipping';
    else if (i.streak >= 7 && i.momentum >= .62) state = 'radiant';
    else if (i.neglect >= 1) state = 'drifting';
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
      seed: i.seed
    };
  }
  var STATES = {
    radiant: { label: 'Radiant', note: 'streak ≥ 7, momentum ≥ .62 — seams lit, gold facets, ornament peaks', color: PAL.gold },
    steady: { label: 'Steady', note: 'active today or yesterday — the neutral read', color: '#8B90A0' },
    drifting: { label: 'Drifting', note: '1–2 days idle — seam glow fades, specular dulls', color: '#7FA8C8' },
    slipping: { label: 'Slipping', note: '3–4 days idle — posture sags, facets flatten, motes appear', color: '#C8A06B' },
    dormant: { label: 'Dormant', note: '5+ days idle — desaturated, fogged, no seam light', color: '#6E7382' }
  };
  var PRESETS = {
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
    var sh = flip ? -1 : 1, closed = (mood === 'happy' && v.joy > .84) || v.dorm > .82, lod = P.lod;
    function push(o) { o.z = 7; o.grp = 'face'; o.mat = 'flat'; P.parts.push(o); }
    if (closed) {
      push({ k: 'p', d: 'M' + (x - r) + ',' + (y + r * .1) + ' Q' + x + ',' + (y - r * (mood === 'happy' ? .95 : .2)) + ' ' + (x + r) + ',' + (y + r * .1), tone: 'eye', sw: r * .34, cap: 'round', fill: false });
      if (mood === 'happy') push({ k: 'p', d: 'M' + (x - r * .7) + ',' + (y + r * .72) + ' Q' + x + ',' + (y + r * 1.08) + ' ' + (x + r * .7) + ',' + (y + r * .72), tone: 'c5', sw: r * .18, cap: 'round', fill: false, op: .5 });
      return;
    }
    var squint = mood === 'fierce' ? .3 : mood === 'studious' ? .18 : v.dorm > .5 ? .34 : .05;
    push({ k: 'poly', pts: ring(x, y, r, r * (1 - squint), function (t, a) { return 1 - .14 * Math.abs(Math.cos(a)); }, 9), tone: 'bone' });
    var ir = r * .8, iy = y + r * .05;
    push({ k: 'poly', pts: ring(x + sh * r * .05, iy, ir, ir * (1 - squint * .7), null, 8), tone: 'c5' });
    push({ k: 'poly', pts: ring(x + sh * r * .05, iy - ir * .3, ir * .92, ir * .5, null, 7), tone: 'c7', op: .92 });
    push({ k: 'poly', pts: ring(x + sh * r * .05, iy + ir * .42, ir * .78, ir * .34, null, 7), tone: 'glow', op: .85 });
    push({ k: 'poly', pts: ring(x + sh * r * .05, iy, ir * .4, ir * .46, null, 7), tone: 'eye' });
    push({ k: 'poly', pts: [[x - sh * r * .52, y - r * .5], [x - sh * r * .1, y - r * .42], [x - sh * r * .2, y - r * .1], [x - sh * r * .58, y - r * .18]], tone: 'bone', op: .96 });
    if (lod > .6) push({ k: 'poly', pts: ring(x + sh * r * .36, y + r * .36, r * .13, r * .11, null, 6), tone: 'bone', op: .55 });
    push({
      k: 'p', tone: 'ink', sw: r * .32, cap: 'round', fill: false,
      d: 'M' + (x - r * 1.06) + ',' + (y - r * .12) + ' Q' + (x - sh * r * .12) + ',' + (y - r * (1 - squint)) + ' ' + (x + r * 1.06) + ',' + (y - r * (mood === 'fierce' ? -.14 : .06))
    });
    if (mood === 'fierce') push({ k: 'poly', pts: [[x - r * 1.3, y - r * 1.75], [x + r * 1.2, y - r * 1.35], [x + r * 1.05, y - r * .95], [x - r * 1.25, y - r * 1.3]], tone: 'furD' });
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
      pl(ribbon(tail, 17 + 2 * t, 8), 'furD', 1, 'back');
      pl(ribbon(tail.slice(0, 8), 12 + 2 * t, 6), 'fur', 1, 'back');
      n = LN(32);
      for (i = 0; i < n; i++) {
        var ft = .1 + (i / n) * .9, ti = Math.min(tail.length - 2, Math.floor(ft * (tail.length - 1)));
        var pA = tail[ti], pB = tail[ti + 1];
        var ang = Math.atan2(pB[1] - pA[1], pB[0] - pA[0]) + (i % 2 ? 1 : -1) * (1.85 + r() * .45);
        var flen = 9 + 5 * r() + 10 * v.fur;
        var painted = ft > .9;
        pl(ribbon(bend(pA[0], pA[1], ang, flen, .3, 3, r, i), 8 + r() * 3.5, 1.2, true),
          painted ? 'paint' : (i % 3 === 0 ? 'furL' : 'fur'), 1, 'back', { mat: 'skin' });
      }
      var tip = tail.slice(9);
      pl(ribbon(tip, 10, 4), 'paint', 1, 'back', { op: .95 });
      for (i = 0; i < (FULL ? 3 : 1); i++) {
        var dp = tip[Math.min(tip.length - 1, i)], dl = 9 + r() * 16;
        pl(ribbon([[dp[0] + (r() - .5) * 7, dp[1]], [dp[0] + (r() - .5) * 5, dp[1] + dl]], 2.2, 1.2), 'paint', 1, 'back', { op: .9, mat: 'flat' });
        pl(ring(dp[0] + (r() - .5) * 5, dp[1] + dl + 2, 2.4, 3, null, 7), 'paint', 1, 'back', { mat: 'flat' });
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
      var bulk = v.bulk, soft = 1 - bulk, def = clamp(.3 + .7 * bulk);
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
      pth('M106,120 L106,125 M106,125 L98,129 M106,125 L114,129', 'furD', 7, 'face', { sw: 1.6, fill: false, cap: 'round' });
      pth('M100,126 L98,133 L103,127 Z', 'bone', 7, 'face'); pth('M112,126 L114,133 L109,127 Z', 'bone', 7, 'face');
      eyeParts(P, 95, 99, 7.4, 'fierce', v, 1); eyeParts(P, 118, 97, 7.4, 'fierce', v, 0);
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
    if (key === 'bard') {
      var joy = v.joy, fill = clamp(.25 + .7 * joy);
      // lute, behind left
      pl(ring(52, 190, 26, 30, null, 10, r, .02), 'wood', 1, 'back');
      pl(ring(52, 190, 8, 8, null, 7), 'dark', 1, 'back', { mat: 'flat' });
      pl(ribbon([[46, 164], [30, 128], [26, 110]], 6, 5), 'wood', 1, 'back', { mat: 'skin' });
      pl([[20, 106], [32, 102], [34, 112], [22, 116]], 'dark', 1, 'back', { mat: 'flat' });
      for (i = 0; i < (FULL ? 4 : 2); i++) pl(ribbon([[48 + i * 3, 206], [29 + i * 2, 116]], .7, .55), 'boneD', 1, 'back', { mat: 'flat', op: .55 });
      // BIG sake gourd, right of the body, on the ground
      pl([[150, 176], [166, 168], [180, 176], [184, 192], [176, 206], [160, 212], [147, 204], [144, 190]], 'sake', 2, 'lower');
      pl([[153, 152], [166, 146], [176, 152], [178, 166], [168, 172], [155, 168], [150, 160]], 'sake', 2, 'lower');
      pl([[160, 138], [172, 136], [173, 148], [161, 149]], 'wood', 2, 'lower', { mat: 'plate' });
      pl([[158, 132], [175, 130], [176, 137], [157, 138]], 'dark', 2, 'lower', { mat: 'flat' });
      pl(ribbon([[152, 158], [140, 168], [138, 182]], 2.2, 1.8), 'c7', 2, 'lower', { mat: 'flat' });
      pl([[147, 196], [183, 194], [180, 205], [152, 208]], 'c5', 2, 'lower', { op: (.3 + .5 * fill).toFixed(2), mat: 'flat' });
      pl(ring(192, 216, 9, 7, null, 8), 'sake', 2, 'lower');
      pl(ring(192, 214, 6.5, 4, null, 8), 'c5', 2, 'lower', { op: (.35 + .5 * fill).toFixed(2), mat: 'flat' });
      // body
      pl([[92, 190], [110, 190], [108, 214], [112, 228], [86, 228], [86, 210]], 'ink', 2, 'lower');
      pl([[118, 190], [136, 190], [138, 210], [138, 228], [112, 228], [116, 214]], 'ink', 2, 'lower');
      pl([[78, 152], [96, 138], [120, 138], [138, 152], [142, 182], [130, 206], [108, 214], [88, 206], [76, 182]], 'bone', 3, 'body');
      pl([[94, 160], [118, 158], [124, 184], [110, 206], [96, 202], [88, 182]], 'boneD', 4, 'body', { op: .4, mat: 'skin' });
      pth('M80,148 L108,162 L138,144 L140,154 L108,172 L78,158 Z', 'c5', 4, 'body');
      pl(ribbon([[86, 152], [78, 176], [96, 190]], 10, 8), 'ink', 5, 'body');
      pl(ring(102, 193, 9, 8, null, 7), 'ink', 5, 'body');
      pl(ribbon([[132, 150], [152, 138], [162, 150]], 10, 8), 'ink', 5, 'body');
      pl(ring(164, 154, 9, 8, null, 7), 'ink', 5, 'body');
      // jewellery: wrist bangles, necklace + pendant, two earrings
      for (i = 0; i < (FULL ? 3 : 2); i++) pl(ribbon([[95 + i * 2, 186 - i * 3], [106 + i * 2, 190 - i * 3]], 2.4, 2.4), i === 1 ? 'c5' : 'gold', 6, 'body', { mat: 'plate' });
      for (i = 0; i < 2; i++) pl(ribbon([[155 + i * 3, 148 - i * 4], [166 + i * 3, 152 - i * 4]], 2.2, 2.2), 'gold', 6, 'body', { mat: 'plate' });
      var bn = Math.min(11, LN(4 + v.input.streak * .45));
      for (i = 0; i < bn; i++) {
        var ba = -.95 + (i / (bn - 1)) * 1.9;
        pl(ring(108 + Math.sin(ba) * 25, 158 + Math.cos(ba) * 12, 2.9 + (i % 3 === 0 ? 1 : 0), 2.9 + (i % 3 === 0 ? 1 : 0), null, 6), i % 3 === 0 ? 'gold' : 'c5', 6, 'body', { mat: 'flat' });
      }
      pl([[104, 172], [112, 172], [110, 182], [106, 182]], 'gold', 6, 'body', { mat: 'plate' });
      pl(ring(84, 78, 12, 12, null, 7), 'ink', 5, 'head');
      pl(ring(132, 78, 12, 12, null, 7), 'ink', 5, 'head');
      pl([[80, 100], [92, 82], [108, 78], [126, 82], [136, 100], [134, 120], [120, 132], [96, 132], [80, 120]], 'bone', 6, 'head');
      pl(ring(94, 106, 9.5, 11, null, 7), 'ink', 6, 'head', { mat: 'flat' });
      pl(ring(122, 104, 9.5, 11, null, 7), 'ink', 6, 'head', { mat: 'flat' });
      pl(ring(108, 122, 13, 9.5, null, 8), 'boneD', 6, 'head');
      pth('M108,117 L113,114 L116,119 L108,125 L100,119 L103,114 Z', 'eye', 7, 'face');
      pth('M99,127 Q108,' + (127 + 4 + joy * 9).toFixed(1) + ' 117,127', 'eye', 7, 'face', { sw: 1.9, cap: 'round', fill: false });
      eyeParts(P, 94, 106, 7.6, 'happy', v, 1); eyeParts(P, 122, 104, 7.6, 'happy', v, 0);
      pth('M138,90 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', 'gold', 7, 'head', { sw: 2.2, fill: false });
      pth('M78,92 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', 'gold', 7, 'head', { sw: 2, fill: false });
      pl(ring(138, 99, 2.6, 3.4, null, 5), 'c5', 7, 'head', { mat: 'flat' });
      if (FULL) for (i = 0; i < 5; i++) { var pa = (i / 5) * TAU; pl(ring(80 + Math.cos(pa) * 7, 64 + Math.sin(pa) * 7, 4.4, 3.4, null, 6), i % 2 ? 'c3' : 'c5', 7, 'head', { mat: 'flat' }); }
      if (FULL) pl(ring(80, 64, 3.2, 3.2, null, 5), 'gold', 7, 'head', { mat: 'flat' });
      n = LN(2 + joy * 8);
      for (i = 0; i < n; i++) {
        a = -2.95 + (i / (n - 1 || 1)) * 2.4 + (r() - .5) * .22;
        var ar = 48 + r() * 36, ax = 108 + Math.cos(a) * ar, ay = 116 + Math.sin(a) * ar * .9;
        pl(ring(ax, ay, 3 + r() * 2.2, 3 + r() * 2.2, null, 5), i % 3 === 0 ? 'gold' : 'c3', 8, 'sig', { mat: 'flat', op: (.4 + joy * .55).toFixed(2) });
        if (i % 3 === 1) pl(ribbon([[ax + 3, ay], [ax + 3, ay - 9]], 1.1, 1.1), i % 2 ? 'gold' : 'c3', 8, 'sig', { mat: 'flat', op: (.5 + joy * .4).toFixed(2) });
      }
      if (joy > .45) glow(108, 116, 96, 'c3', (joy - .45) * 1.15, 8);
    }

    for (i = 0; i < v.dust; i++) pl(ring(50 + r() * 130, 80 + r() * 130, 1.5, 1.5, null, 5), 'muted', 9, 'fx', { mat: 'flat', op: .55 });

    if (v.droop > .1) for (i = 0; i < P.parts.length; i++) {
      var pp = P.parts[i];
      if (['head', 'face', 'body'].indexOf(pp.grp) >= 0 && pp.pts) for (var g2 = 0; g2 < pp.pts.length; g2++) pp.pts[g2][1] += v.droop * .5;
    }
    P.parts.sort(function (x, y) { return x.z - y.z; });
    return P;
  }

  /* ---------- RENDER: faceted plates, seam light, specular ---------- */
  var GROUPS = ['back', 'lower', 'body', 'mane', 'wingL', 'wingR', 'head', 'face', 'sig', 'fx'];
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
  function render(key, v, opt) {
    opt = opt || {};
    var hi = opt.detail !== 'lo';
    var nf = opt.facets === undefined ? 3 : opt.facets;
    var B = build(key, v, hi ? 1 : .32), C = B.C, uid = 'r3' + key + (opt.uid || '');
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
      return { t: 'g', a: {}, k: uid + 'G' + gname, c: kids };
    }

    if (v.aura > .1) nodes.push({ t: 'ellipse', k: uid + 'aura', a: { cx: 110, cy: 152, rx: 108, ry: 120, fill: glowGrad(defs, uid, C.glow), opacity: (v.aura * .26).toFixed(3) } });
    for (gi = 0; gi < GROUPS.length; gi++) if (g[GROUPS[gi]] && g[GROUPS[gi]].length) nodes.push(emit(g[GROUPS[gi]], GROUPS[gi]));
    return { defs: defs, nodes: nodes, w: W, h: H };
  }

  var PLANES = { back: -84, lower: -32, wingL: -24, wingR: -24, body: 0, mane: 15, head: 26, face: 34, sig: 56, fx: 68 };

  return {
    W: W, H: H, PAL: PAL, DOMAINS: D3, ORDER: ORDER3, SIGNALS: SIGNALS, STATES: STATES, PRESETS: PRESETS,
    GROUPS: GROUPS, PLANES: PLANES, vitals: vitals, build: build, skin: skin, series: series, prng: prng,
    clamp: clamp, mix: mix, render: render
  };
})();
