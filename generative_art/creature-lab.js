/* Fourfold — Creature Lab
   One skeleton per creature -> four rendering styles.
   Pure geometry generator: emits {t, a, c} descriptors (React-ready attrs) or point clouds.
   No framework deps. window.CreatureLab                                            */
window.CreatureLab = (function () {
  "use strict";

  var PAL = {
    ink: '#12141A', surface: '#1A1D26', raised: '#232735', bone: '#E9E2D0', boneD: '#CFC5AC',
    gold: '#D9A441', goldD: '#B08430', dark: '#231512', muted: '#8B90A0'
  };

  var DOMAINS = {
    work: {
      key: 'work', name: 'Panda Spellcaster', domain: 'Work', glyph: 'constellation',
      c3: '#B9AEFF', c5: '#8B7CF6', c7: '#5E4FB8', fur: '#E9E2D0', furD: '#B9B2A0',
      signature: 'constellation nodes = tasks closed this week'
    },
    gourmet: {
      key: 'gourmet', name: 'Squirrel Summoner', domain: 'Gourmet Data', glyph: 'sigil-ring',
      c3: '#7FE7B4', c5: '#34C784', c7: '#1F8A59', fur: '#A9765C', furD: '#7E523E',
      signature: 'one plant per streak day, tail volume = 30-day XP'
    },
    body: {
      key: 'body', name: 'Lion Warrior', domain: 'Body', glyph: 'peak',
      c3: '#FF8A6B', c5: '#E4593D', c7: '#A63A26', fur: '#C89464', furD: '#8E603B',
      signature: 'mane spike count + length = 60-day mass'
    },
    finance: {
      key: 'finance', name: 'Bird Scholar', domain: 'Finance', glyph: 'rising-line',
      c3: '#F2CD7E', c5: '#D9A441', c7: '#9C742B', fur: '#E9E2D0', furD: '#C3BBA8',
      signature: 'feather rows = level, ledger line plots the real 30-day trend'
    }
  };
  var ORDER = ['work', 'gourmet', 'body', 'finance'];

  /* ---------- math / color ---------- */
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function hash(s) { var h = 2166136261, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) { var a = hash(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { function f(n) { var s = Math.round(clamp(n, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; } return '#' + f(r) + f(g) + f(b); }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    function q(p, q2, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q2 - p) * 6 * t; if (t < .5) return q2; if (t < 2 / 3) return p + (q2 - p) * (2 / 3 - t) * 6; return p; }
    if (!s) return [l * 255, l * 255, l * 255];
    var b = l < .5 ? l * (1 + s) : l + s - l * s, a = 2 * l - b;
    return [q(a, b, h + 1 / 3) * 255, q(a, b, h) * 255, q(a, b, h - 1 / 3) * 255];
  }
  function tone(hex, satMul, lumMul) {
    var c = hex2rgb(hex), h = rgb2hsl(c[0], c[1], c[2]);
    var o = hsl2rgb(h[0], clamp(h[1] * satMul), clamp(h[2] * lumMul, .03, .97));
    return rgb2hex(o[0], o[1], o[2]);
  }
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

  /* ---------- 1. VITALS: raw app data -> codified drawing properties ---------- */
  var SIGNALS = [
    { id: 'momentum', label: 'Momentum', hint: 'trailing 7-day XP ÷ pace', min: 0, max: 1, step: .01 },
    { id: 'vitality', label: 'Vitality', hint: '30-day completion rate', min: 0, max: 1, step: .01 },
    { id: 'volatility', label: 'Volatility', hint: 'stdev of daily score, 14d', min: 0, max: 1, step: .01 },
    { id: 'streak', label: 'Streak', hint: 'consecutive days with a completion', min: 0, max: 30, step: 1 },
    { id: 'neglect', label: 'Days idle', hint: 'days since last completion in domain', min: 0, max: 9, step: 1 },
    { id: 'level', label: 'Level', hint: 'domain level 1–10 → tier I/II/III', min: 1, max: 10, step: 1 }
  ];

  function vitals(inp) {
    var i = {
      momentum: .62, vitality: .74, volatility: .28, streak: 5, neglect: 0, level: 4,
      balance: .5, seed: 'season-1'
    };
    for (var k in inp) if (inp[k] !== undefined) i[k] = inp[k];

    var dorm = clamp(i.neglect / 7);
    var tier = i.level >= 7 ? 3 : i.level >= 4 ? 2 : 1;
    var state = 'steady';
    if (i.neglect >= 5) state = 'dormant';
    else if (i.neglect >= 3) state = 'slipping';
    else if (i.streak >= 7 && i.momentum >= .62) state = 'radiant';
    else if (i.neglect >= 1) state = 'drifting';

    var v = {
      input: i, tier: tier, state: state, dorm: dorm,
      sat: clamp(.34 + .9 * i.vitality - .62 * dorm, .05, 1.28),   // colour saturation
      lum: clamp(.88 + .22 * i.vitality - .2 * dorm, .62, 1.12),   // colour lightness
      cycle: +(6.4 - 3.9 * i.momentum + 3.2 * dorm).toFixed(2),    // s per idle loop
      bob: +(1.1 + 4.2 * i.momentum - 2.2 * dorm).toFixed(2),      // px of idle travel
      sway: +(.8 + 3.2 * i.momentum).toFixed(2),                   // deg of sway
      droop: +(8 * dorm).toFixed(2),                               // px of posture sag
      lean: +(((i.balance - .5) * 9).toFixed(2)),                  // deg, party imbalance
      gold: clamp(i.streak / 21),                                  // gilding ratio
      ornament: Math.round(3 + 9 * clamp(i.streak / 14) + 5 * (tier - 1) + 4 * i.momentum),
      density: clamp(.2 + .62 * (1 - i.vitality) + .3 * dorm),     // hatch / grain
      aura: clamp((i.streak >= 7 ? .3 : 0) + .5 * i.momentum - .55 * dorm),
      dust: Math.round(clamp(dorm * 1.25) * 12),                   // falling motes
      rough: clamp(.12 + .88 * i.volatility),                      // linework jitter
      fog: clamp(.06 + .55 * dorm),
      seed: i.seed
    };
    v.rnd = prng(i.seed);
    return v;
  }

  var STATES = {
    radiant: { label: 'Radiant', note: 'streak ≥ 7 and momentum ≥ .62 — gold event, aura on, ornament peaks', color: PAL.gold },
    steady: { label: 'Steady', note: 'active today or yesterday, no long streak — the neutral read', color: '#8B90A0' },
    drifting: { label: 'Drifting', note: '1–2 days idle — sway slows, gilding dims, colour begins to cool', color: '#7FA8C8' },
    slipping: { label: 'Slipping', note: '3–4 days idle — posture sags, hatching thickens, motes appear', color: '#C8A06B' },
    dormant: { label: 'Dormant', note: '5+ days idle — desaturated, fog, animation nearly stopped', color: '#6E7382' }
  };

  var PRESETS = {
    radiant: { momentum: .95, vitality: .95, volatility: .18, streak: 14, neglect: 0, level: 8 },
    steady: { momentum: .6, vitality: .75, volatility: .3, streak: 3, neglect: 0, level: 4 },
    drifting: { momentum: .38, vitality: .6, volatility: .45, streak: 0, neglect: 2, level: 4 },
    slipping: { momentum: .2, vitality: .42, volatility: .62, streak: 0, neglect: 4, level: 3 },
    dormant: { momentum: .05, vitality: .22, volatility: .3, streak: 0, neglect: 7, level: 3 },
    awakening: { momentum: .5, vitality: .38, volatility: .7, streak: 1, neglect: 0, level: 3 }
  };

  /* a plausible 30-day score series, deterministic from the seed — the art plots real history */
  function series(v, n) {
    var r = prng(v.seed + '|series'), out = [], i, base = v.input.vitality;
    for (i = 0; i < n; i++) {
      var trend = base * (.55 + .45 * (i / (n - 1)) * (.4 + v.input.momentum));
      var noise = (r() - .5) * 1.6 * v.input.volatility;
      out.push(clamp(trend + noise, .04, 1));
    }
    for (i = n - Math.min(n, v.input.neglect); i < n; i++) out[i] = 0;
    return out;
  }

  /* ---------- 2. SKELETON: shared chassis, per-creature silhouette ---------- */
  /* part = {k:'e'|'p', grp, z, tone, ...geom}  grp: back|lower|upper|sig|fx */
  function build(key, v) {
    var D = DOMAINS[key], t = v.tier, P = [], r = prng(v.seed + '|' + key), i, a, n;
    function e(x, y, rx, ry, tn, z, grp, rot) { P.push({ k: 'e', x: x, y: y, rx: rx, ry: ry, tone: tn, z: z, grp: grp || 'upper', rot: rot || 0 }); }
    function p(d, tn, z, grp, o) { var q = { k: 'p', d: d, tone: tn, z: z, grp: grp || 'upper' }; if (o) for (var kk in o) q[kk] = o[kk]; P.push(q); }

    e(108, 222, 54 + 4 * t, 8, 'shadow', 0, 'back');

    if (key === 'work') {
      p('M82,126 Q48,166 56,214 Q80,220 98,212 Q84,168 94,130 Z', 'clothD', 1, 'back');
      p('M132,126 Q166,166 158,214 Q134,220 116,212 Q130,168 120,130 Z', 'clothD', 1, 'back');
      p('M156,46 L128,216', 'brownD', 1, 'back', { sw: 5, cap: 'round', fill: false });
      e(157, 42, 7.5, 7.5, 'gold', 1, 'back');
      e(92, 206, 12, 15, 'ink', 2, 'lower'); e(122, 206, 12, 15, 'ink', 2, 'lower');
      e(107, 170, 33, 38, 'fur', 3, 'upper'); e(103, 177, 20, 24, 'furD', 3, 'upper');
      p('M76,150 Q107,164 138,148 L136,158 Q107,174 78,160 Z', 'gold', 4, 'upper');
      e(73, 136, 10, 26, 'ink', 4, 'upper', -26); e(143, 176, 10, 22, 'ink', 4, 'upper', 14);
      e(66, 116, 9.5, 9.5, 'ink', 4, 'upper'); e(149, 196, 8.5, 8.5, 'ink', 4, 'upper');
      e(103, 100, 31, 31, 'fur', 5, 'upper');
      e(74, 70, 12, 12, 'ink', 5, 'upper'); e(132, 70, 12, 12, 'ink', 5, 'upper');
      p('M77,94 Q77,56 103,46 Q131,56 132,94 Q118,77 103,75 Q89,77 77,94 Z', 'cloth', 6, 'upper');
      p('M77,94 Q90,82 103,80 Q90,84 84,96 Z', 'clothD', 6, 'upper');
      e(90, 100, 9.5, 11.5, 'ink', 6, 'upper', -14); e(117, 98, 9.5, 11.5, 'ink', 6, 'upper', 12);
      e(103, 115, 13, 9, 'furD', 6, 'upper');
      p('M97,110 Q103,106 109,110 Q106,116 103,117 Q100,116 97,110 Z', 'eye', 7, 'upper');
      e(90, 101, 3.4, 4.3, 'eye', 7, 'upper'); e(117, 99, 3.4, 4.3, 'eye', 7, 'upper');
      e(91.3, 99.3, 1.1, 1.1, 'bone', 7, 'upper'); e(118.3, 97.3, 1.1, 1.1, 'bone', 7, 'upper');
      // signature: constellation scatter above the open hand — one node per closed task
      n = Math.max(3, v.ornament);
      var prev = null;
      for (i = 0; i < n; i++) {
        a = -2.55 + (i / (n - 1 || 1)) * 2.15 + (r() - .5) * .3;
        var rad = 30 + r() * 30;
        var nx = 66 + Math.cos(a) * rad, ny = 116 + Math.sin(a) * rad;
        if (prev) p('M' + prev[0].toFixed(1) + ',' + prev[1].toFixed(1) + ' L' + nx.toFixed(1) + ',' + ny.toFixed(1), 'accent', 8, 'sig', { sw: .9, fill: false, dim: .5 });
        e(nx, ny, 1.6 + r() * 2.2 + (t === 3 ? .9 : 0), 1.6 + r() * 2.2, i % 4 === 0 ? 'gold' : 'accent3', 8, 'sig');
        prev = [nx, ny];
      }
      if (t >= 2) p('M66,116 m-46,0 a46,26 0 1,0 92,0 a46,26 0 1,0 -92,0', 'accent', 8, 'sig', { sw: 1, fill: false, dim: .35 });
    }

    if (key === 'gourmet') {
      // tail: volume from 30-day XP
      var tw = 20 + 9 * t + 6 * v.input.vitality;
      p('M138,204 Q192,186 182,120 Q176,70 140,62', 'furD', 1, 'back', { sw: tw, cap: 'round', fill: false });
      p('M140,200 Q184,182 175,122 Q170,80 141,70', 'fur', 1, 'back', { sw: tw * .6, cap: 'round', fill: false });
      e(92, 208, 12, 13, 'furD', 2, 'lower'); e(120, 208, 12, 13, 'furD', 2, 'lower');
      e(104, 170, 32, 38, 'fur', 3, 'upper'); e(100, 176, 19, 24, 'bone', 3, 'upper');
      p('M72,146 Q104,132 136,146 Q130,166 104,158 Q78,166 72,146 Z', 'cloth', 4, 'upper');
      e(78, 152, 9, 21, 'fur', 4, 'upper', -44); e(130, 152, 9, 21, 'fur', 4, 'upper', 44);
      e(89, 137, 7.5, 7.5, 'fur', 5, 'upper'); e(119, 137, 7.5, 7.5, 'fur', 5, 'upper');
      e(102, 100, 28, 27, 'fur', 5, 'upper');
      p('M80,80 Q72,52 88,50 Q92,66 90,78 Z', 'fur', 4, 'upper'); p('M116,78 Q120,50 135,52 Q133,68 126,80 Z', 'fur', 4, 'upper');
      p('M83,78 Q79,60 87,56 Q89,68 87,76 Z', 'furD', 5, 'upper'); p('M119,76 Q121,60 129,58 Q127,70 123,76 Z', 'furD', 5, 'upper');
      e(96, 114, 11, 8, 'bone', 6, 'upper');
      p('M92,107 Q96,104 100,107 Q98,111 96,111.5 Q94,111 92,107 Z', 'eye', 7, 'upper');
      e(90, 97, 3.4, 4.4, 'eye', 7, 'upper'); e(113, 95, 3.4, 4.4, 'eye', 7, 'upper');
      e(91.2, 95.4, 1, 1, 'bone', 7, 'upper'); e(114.2, 93.4, 1, 1, 'bone', 7, 'upper');
      e(104, 142, 9, 9.5, 'gold', 7, 'upper');
      p('M95,138 Q104,130 113,138 L113,141 Q104,135 95,141 Z', 'goldD', 7, 'upper');
      // signature: sigil rings (tier) + one plant per streak day
      for (i = 0; i < t; i++) p('M104,142 m-' + (16 + i * 7) + ',0 a' + (16 + i * 7) + ',' + (16 + i * 7) + ' 0 1,0 ' + (32 + i * 14) + ',0 a' + (16 + i * 7) + ',' + (16 + i * 7) + ' 0 1,0 -' + (32 + i * 14) + ',0', 'accent3', 8, 'sig', { sw: 1.9 - i * .4, fill: false, dim: .8 });
      p('M104,126 a16,16 0 0 1 13,7.5', 'accent3', 8, 'sig', { sw: 3.4, fill: false });
      n = Math.min(11, Math.round(1 + v.input.streak * .7 + (t - 1)));
      for (i = 0; i < n; i++) {
        var side = i % 2 ? 1 : -1, px = 108 + side * (26 + (i * 9) % 46 + r() * 8), py = 214 - (i % 3) * 4;
        var hh = 14 + r() * 22 + 6 * v.input.vitality;
        p('M' + px.toFixed(0) + ',' + py.toFixed(0) + ' q' + (side * -4) + ',-' + (hh * .6).toFixed(0) + ' ' + (side * 3) + ',-' + hh.toFixed(0), 'accent', 2, 'lower', { sw: 2.2, cap: 'round', fill: false });
        e(px + side * 3, py - hh, 2.6, 5.4, i % 3 === 0 ? 'accent3' : 'accent', 2, 'lower', side * 22);
        if (t === 3 && i % 3 === 1) e(px + side * 3, py - hh - 6, 3.2, 3.2, 'gold', 2, 'lower');
      }
    }

    if (key === 'body') {
      p('M152,84 L178,200', 'brownD', 1, 'back', { sw: 6, cap: 'round', fill: false });
      e(150, 78, 15, 13, 'ink', 1, 'back'); e(150, 78, 15.5, 4, 'gold', 1, 'back');
      e(88, 206, 14, 15, 'furD', 2, 'lower'); e(124, 206, 14, 15, 'furD', 2, 'lower');
      e(106, 170, 34 + 2 * t, 39, 'fur', 3, 'upper'); e(102, 178, 22, 24, 'furD', 3, 'upper');
      p('M74,146 Q106,162 138,144 L142,156 Q106,176 72,158 Z', 'cloth', 4, 'upper');
      e(120, 152, 6.5, 6.5, 'gold', 4, 'upper');
      e(70, 166, 12 + t, 26, 'fur', 4, 'upper', -12); e(144, 154, 12 + t, 24, 'fur', 4, 'upper', 20);
      e(64, 194, 9.5, 9.5, 'fur', 4, 'upper'); e(150, 130, 9.5, 9.5, 'fur', 4, 'upper');
      // signature: mane — spike count and length from 60-day mass
      n = 12 + Math.round(v.ornament * .8);
      for (i = 0; i < n; i++) {
        a = (i / n) * Math.PI * 2;
        var L = 20 + 7 * (t - 1) + r() * 11 + 9 * v.input.vitality;
        var rr = 23 + L * .42;
        e(104 + Math.cos(a) * rr, 99 + Math.sin(a) * rr * .96, L * .3, L * .52, (t === 3 && i % 4 === 0) ? 'gold' : (i % 2 ? 'accentD' : 'accent'), 4, 'upper', a * 180 / Math.PI + 90);
      }
      e(104, 100, 27, 26, 'fur', 5, 'upper');
      e(84, 79, 8.5, 8.5, 'fur', 5, 'upper'); e(124, 79, 8.5, 8.5, 'fur', 5, 'upper');
      e(104, 116, 16, 11, 'bone', 6, 'upper');
      p('M98,110 Q104,106 110,110 Q107,116 104,117 Q101,116 98,110 Z', 'eye', 7, 'upper');
      p('M104,118 L104,124 M104,124 Q97,127 93,122 M104,124 Q111,127 115,122', 'furD', 7, 'upper', { sw: 1.4, fill: false });
      e(93, 98, 3.6, 4.2, 'eye', 7, 'upper'); e(116, 97, 3.6, 4.2, 'eye', 7, 'upper');
      e(94.3, 96.3, 1.1, 1.1, 'bone', 7, 'upper'); e(117.3, 95.3, 1.1, 1.1, 'bone', 7, 'upper');
      p('M84,90 Q90,86 98,89', 'furD', 7, 'upper', { sw: 2, cap: 'round', fill: false });
      p('M112,88 Q120,85 125,89', 'furD', 7, 'upper', { sw: 2, cap: 'round', fill: false });
      // peak sigil on the pauldron: 3-bar ascending chart
      for (i = 0; i < 3; i++) e(62 + i * 8, 178 - i * 5, 2.6, 5 + i * 4, 'gold', 5, 'upper');
    }

    if (key === 'finance') {
      // signature: feather rows — count from level, spread from momentum
      n = 5 + Math.round(v.ornament * .55);
      for (i = 0; i < n; i++) {
        var f = i / (n - 1 || 1), sp = 1 + .5 * v.input.momentum;
        var ang = (-58 + f * 70) * sp, len = 40 + 30 * Math.sin(f * Math.PI) + 8 * (t - 1);
        p('M84,146 q-' + (len * .5).toFixed(0) + ',' + (-len * .34 + f * 22).toFixed(0) + ' -' + len.toFixed(0) + ',' + (-len * .12 + f * 30).toFixed(0), i % 2 ? 'accent' : 'accent3', 2, 'sig', { sw: 7 - f * 3, cap: 'round', fill: false, rotAt: [84, 146, ang * .16] });
        p('M130,146 q' + (len * .5).toFixed(0) + ',' + (-len * .34 + f * 22).toFixed(0) + ' ' + len.toFixed(0) + ',' + (-len * .12 + f * 30).toFixed(0), i % 2 ? 'accent' : 'accent3', 2, 'sig', { sw: 7 - f * 3, cap: 'round', fill: false, rotAt: [130, 146, -ang * .16] });
      }
      for (i = 0; i < 3 + t; i++) p('M106,186 q' + ((i - 2) * 5) + ',18 ' + ((i - 2) * 10) + ',34', 'accentD', 2, 'lower', { sw: 6 - i * .5, cap: 'round', fill: false });
      e(107, 156, 26, 36, 'fur', 3, 'upper'); e(103, 162, 16, 24, 'furD', 3, 'upper');
      p('M86,132 Q107,144 128,130 L130,142 Q107,156 84,144 Z', 'cloth', 4, 'upper');
      e(84, 168, 8, 18, 'fur', 4, 'upper', -28); e(130, 170, 8, 18, 'fur', 4, 'upper', 26);
      e(105, 98, 25, 24, 'fur', 5, 'upper');
      p('M105,92 L86,102 L105,110 Z', 'gold', 6, 'upper');
      p('M105,110 L90,114 L105,118 Z', 'goldD', 6, 'upper');
      e(97, 95, 4.2, 4.6, 'eye', 6, 'upper'); e(116, 93, 4.2, 4.6, 'eye', 6, 'upper');
      e(98.4, 93.2, 1.2, 1.2, 'bone', 7, 'upper'); e(117.4, 91.2, 1.2, 1.2, 'bone', 7, 'upper');
      p('M97,95 m-9,0 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0 M116,93 m-9,0 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0 M106,94 L107,94', 'gold', 7, 'upper', { sw: 1.5, fill: false });
      for (i = 0; i < 2 + t; i++) p('M' + (100 + i * 4) + ',76 q' + (2 + i) + ',-' + (12 + i * 5) + ' ' + (10 + i * 3) + ',-' + (16 + i * 4), i === 0 ? 'gold' : 'accent', 4, 'sig', { sw: 3, cap: 'round', fill: false });
      // ledger scroll with the real 30-day trend plotted on it
      p('M50,176 L96,166 L102,200 L56,210 Z', 'bone', 6, 'upper');
      var s30 = series(v, 12), d = '', px2, py2;
      for (i = 0; i < s30.length; i++) {
        px2 = 55 + (i / (s30.length - 1)) * 42; py2 = 200 - s30[i] * 24 - (i / s30.length) * 4;
        d += (i ? ' L' : 'M') + px2.toFixed(1) + ',' + py2.toFixed(1);
      }
      p(d, 'gold', 7, 'upper', { sw: 1.8, fill: false, cap: 'round' });
      e(px2, py2, 2.2, 2.2, 'gold', 7, 'upper');
    }

    // posture: dormancy sags the upper body, imbalance leans it
    for (i = 0; i < P.length; i++) {
      var q = P[i];
      if (q.grp === 'upper' && q.z >= 3) { if (q.k === 'e') q.y += v.droop * .7; else q.sagged = v.droop * .7; }
    }
    // decay motes
    for (i = 0; i < v.dust; i++) {
      var mx = 40 + prng(v.seed + key + 'm' + i)() * 140;
      e(mx, 70 + prng(v.seed + key + 'd' + i)() * 130, 1.4, 1.4, 'muted', 9, 'fx');
    }
    P.sort(function (x, y) { return x.z - y.z; });
    return P;
  }

  /* ---------- colour resolution ---------- */
  function skin(key, v) {
    var D = DOMAINS[key], s = v.sat, l = v.lum, ash = v.dorm * .55;
    function T(c) { return mix(tone(c, s, l), PAL.muted, ash * .5); }
    return {
      shadow: 'rgba(0,0,0,' + (.42 - v.dorm * .16).toFixed(2) + ')',
      fur: T(D.fur), furD: T(D.furD), bone: T(PAL.bone), boneD: T(PAL.boneD),
      ink: mix(PAL.ink, '#3A3F4E', .12 + v.dorm * .3), dark: PAL.dark,
      cloth: T(D.c5), clothD: T(D.c7), accent: T(D.c5), accent3: T(D.c3), accentD: T(D.c7),
      gold: mix(T(PAL.gold), PAL.muted, (1 - v.gold) * .45), goldD: T(PAL.goldD),
      brown: T('#A9765C'), brownD: T('#7E523E'), eye: PAL.dark, muted: PAL.muted,
      glow: T(D.c3)
    };
  }

  /* ---------- shared helpers for renderers ---------- */
  function xf(q) {
    var t = [];
    if (q.rot) t.push('rotate(' + q.rot.toFixed(2) + ' ' + q.x + ' ' + q.y + ')');
    if (q.rotAt) t.push('rotate(' + q.rotAt[2].toFixed(2) + ' ' + q.rotAt[0] + ' ' + q.rotAt[1] + ')');
    if (q.sagged) t.push('translate(0 ' + q.sagged.toFixed(1) + ')');
    return t.length ? t.join(' ') : undefined;
  }
  function groups(parts) {
    var g = { back: [], lower: [], upper: [], sig: [], fx: [] }, i;
    for (i = 0; i < parts.length; i++) g[parts[i].grp].push(parts[i]);
    return g;
  }
  function anim(v, kind) {
    var c = v.cycle, B = { transformBox: 'view-box', transformOrigin: '108px 200px' };
    function S(o) { for (var k in B) o[k] = o[k] === undefined ? B[k] : o[k]; return o; }
    if (kind === 'bob') return S({ animation: 'ffBob ' + c + 's ease-in-out infinite', '--ffBob': v.bob + 'px' });
    if (kind === 'sway') return S({ animation: 'ffSway ' + (c * 1.35) + 's ease-in-out infinite', transformOrigin: '108px 214px', '--ffSway': v.sway + 'deg' });
    if (kind === 'orbit') return S({ animation: 'ffDrift ' + (c * 2.6) + 's ease-in-out infinite', transformOrigin: '66px 116px' });
    if (kind === 'twinkle') return S({ animation: 'ffTwinkle ' + (c * .9) + 's ease-in-out infinite alternate' });
    if (kind === 'fall') return S({ animation: 'ffFall ' + (c * 1.8) + 's linear infinite' });
    return {};
  }

  /* ---------- 3a. STYLE A — LIVING SIGIL (flat vector, procedural ornament) --- */
  function styleA(key, v, opt) {
    opt = opt || {}; var hi = opt.detail !== 'lo';
    var C = skin(key, v), parts = build(key, v), g = groups(parts), defs = [], nodes = [], uid = 'A' + key + (opt.uid || '');

    function shape(q, i) {
      var col = C[q.tone] || q.tone, a;
      if (q.k === 'e') {
        a = { cx: q.x, cy: q.y, rx: q.rx, ry: q.ry, fill: col, transform: xf(q) };
        if (q.dim) a.opacity = q.dim;
        var node = { t: 'ellipse', a: a, k: uid + i };
        if (!hi || q.rx < 7 || ['eye', 'gold', 'bone', 'shadow', 'muted'].indexOf(q.tone) >= 0) return [node];
        // two-step shading: same form, clipped, offset to lower-right
        defs.push({ t: 'clipPath', a: { id: uid + 'c' + i }, k: 'd' + i, c: [{ t: 'ellipse', a: { cx: q.x, cy: q.y, rx: q.rx, ry: q.ry, transform: xf(q) }, k: 'e' }] });
        return [node, {
          t: 'g', a: { clipPath: 'url(#' + uid + 'c' + i + ')' }, k: uid + 's' + i, c: [{
            t: 'ellipse', k: 'sh',
            a: { cx: q.x + q.rx * .42, cy: q.y + q.ry * .34, rx: q.rx, ry: q.ry, fill: mix(col, PAL.ink, .3), opacity: .8, transform: xf(q) }
          }]
        }];
      }
      a = { d: q.d, transform: xf(q) };
      if (q.fill === false) { a.fill = 'none'; a.stroke = col; a.strokeWidth = q.sw || 2; a.strokeLinecap = q.cap || 'butt'; a.strokeLinejoin = 'round'; }
      else a.fill = col;
      if (q.dim) a.opacity = q.dim;
      return [{ t: 'path', a: a, k: uid + i }];
    }
    function emit(list, key2, style) {
      var kids = [], i, j, s;
      for (i = 0; i < list.length; i++) { s = shape(list[i], key2 + i); for (j = 0; j < s.length; j++) kids.push(s[j]); }
      return { t: 'g', a: (style && hi) ? { style: style } : {}, k: uid + key2, c: kids };
    }

    if (v.aura > .1) nodes.push({
      t: 'ellipse', k: 'aura', a: {
        cx: 108, cy: 140, rx: 100, ry: 116, fill: C.glow, opacity: (v.aura * .07).toFixed(3)
      }
    });
    nodes.push(emit(g.back, 'bk'));
    nodes.push(emit(g.lower, 'lo', anim(v, 'sway')));
    nodes.push(emit(g.upper, 'up', anim(v, 'bob')));
    nodes.push(emit(g.sig, 'sg', key === 'work' ? anim(v, 'orbit') : key === 'finance' ? anim(v, 'bob') : anim(v, 'twinkle')));
    if (g.fx.length) nodes.push(emit(g.fx, 'fx', anim(v, 'fall')));
    return { defs: defs, nodes: nodes, w: 220, h: 240 };
  }

  /* ---------- 3b. STYLE B — INKED CODEX (riso ink, hatching, gold leaf) ------- */
  function wobble(q, rough, r) {
    // ellipse -> hand-drawn closed path
    var n = 16, d = '', i, a, jr = 1 + rough * 2.6;
    for (i = 0; i < n; i++) {
      a = (i / n) * Math.PI * 2;
      var rx = q.rx + (r() - .5) * jr, ry = q.ry + (r() - .5) * jr;
      var x = q.x + Math.cos(a) * rx, y = q.y + Math.sin(a) * ry;
      d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return d + ' Z';
  }
  function hatch(q, angle, spacing, r) {
    var out = [], u, ca = Math.cos(angle), sa = Math.sin(angle);
    for (u = -.94; u < .95; u += spacing) {
      var hl = Math.sqrt(Math.max(0, 1 - u * u)) * (.82 + r() * .18);
      var p1 = [u * q.rx, -hl * q.ry], p2 = [u * q.rx, hl * q.ry];
      function M(p) { return [q.x + p[0] * ca - p[1] * sa, q.y + p[0] * sa + p[1] * ca]; }
      var A = M(p1), B = M(p2);
      out.push('M' + A[0].toFixed(1) + ',' + A[1].toFixed(1) + ' L' + B[0].toFixed(1) + ',' + B[1].toFixed(1));
    }
    return out;
  }
  function styleB(key, v, opt) {
    opt = opt || {}; var hi = opt.detail !== 'lo';
    var C = skin(key, v), parts = build(key, v), g = groups(parts), r = prng(v.seed + key + 'ink'), uid = 'B' + key + (opt.uid || '');
    var defs = [], nodes = [], INK = mix(PAL.ink, '#2B2F3C', .35);

    function shape(q, i) {
      var col = C[q.tone] || q.tone, out = [];
      if (q.tone === 'shadow') return [{ t: 'ellipse', k: uid + i, a: { cx: q.x, cy: q.y, rx: q.rx, ry: q.ry, fill: 'rgba(0,0,0,.3)' } }];
      if (q.k === 'e') {
        var d = wobble(q, v.rough, r);
        var tr = xf(q);
        // wash, offset like a misregistered plate
        out.push({ t: 'path', k: uid + 'w' + i, a: { d: d, fill: col, opacity: .92, transform: (tr ? tr + ' ' : '') + 'translate(-1.2 -1.2)' } });
        if (hi && q.rx > 8 && q.tone !== 'eye') {
          var lines = hatch(q, .78, Math.max(.1, .34 - v.density * .22), r), j;
          for (j = 0; j < lines.length; j++) out.push({
            t: 'path', k: uid + 'h' + i + '_' + j,
            a: { d: lines[j], stroke: INK, strokeWidth: (.5 + v.density * .8).toFixed(2), fill: 'none', opacity: (.14 + v.density * .4).toFixed(2), transform: tr }
          });
        }
        out.push({ t: 'path', k: uid + 'o' + i, a: { d: d, fill: 'none', stroke: INK, strokeWidth: (q.rx > 14 ? 1.7 : 1.1), strokeLinejoin: 'round', transform: tr, opacity: .9 } });
        if (q.tone === 'gold' && v.gold > .4) out.push({ t: 'path', k: uid + 'g' + i, a: { d: d, fill: 'none', stroke: C.gold, strokeWidth: 2.6, opacity: (v.gold * .5).toFixed(2), transform: tr } });
        return out;
      }
      var a = { d: q.d, transform: xf(q) };
      if (q.fill === false) { a.fill = 'none'; a.stroke = col; a.strokeWidth = q.sw || 2; a.strokeLinecap = q.cap || 'round'; }
      else a.fill = col;
      if (q.dim) a.opacity = q.dim;
      out.push({ t: 'path', k: uid + i, a: a });
      if (q.fill !== false && q.rx !== 0) out.push({ t: 'path', k: uid + 'ol' + i, a: { d: q.d, fill: 'none', stroke: INK, strokeWidth: 1.2, transform: xf(q), opacity: .75 } });
      return out;
    }
    function emit(list, key2, style) {
      var kids = [], i, j, s;
      for (i = 0; i < list.length; i++) { s = shape(list[i], key2 + i); for (j = 0; j < s.length; j++) kids.push(s[j]); }
      return { t: 'g', a: (style && hi) ? { style: style } : {}, k: uid + key2, c: kids };
    }
    if (hi) defs.push({
      t: 'filter', a: { id: uid + 'grain', x: '0', y: '0', width: '100%', height: '100%' }, k: 'f', c: [
        { t: 'feTurbulence', k: 'a', a: { type: 'fractalNoise', baseFrequency: '.9', numOctaves: '2', stitchTiles: 'stitch' } },
        { t: 'feColorMatrix', k: 'b', a: { type: 'saturate', values: '0' } }
      ]
    });
    nodes.push(emit(g.back, 'bk'));
    nodes.push(emit(g.lower, 'lo', anim(v, 'sway')));
    nodes.push(emit(g.upper, 'up', anim(v, 'bob')));
    nodes.push(emit(g.sig, 'sg', key === 'work' ? anim(v, 'orbit') : anim(v, 'twinkle')));
    if (g.fx.length) nodes.push(emit(g.fx, 'fx', anim(v, 'fall')));
    if (hi) nodes.push({
      t: 'rect', k: 'grain', a: {
        x: 0, y: 0, width: 220, height: 240, filter: 'url(#' + uid + 'grain)',
        opacity: (.08 + v.density * .12).toFixed(2), pointerEvents: 'none'
      }
    });
    return { defs: defs, nodes: nodes, w: 220, h: 240 };
  }

  /* ---------- 3c. STYLE C — CONSTELLATION FIELD (canvas point cloud) --------- */
  var pathHost = null;
  function samplePath(d, n) {
    try {
      if (!pathHost) {
        pathHost = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pathHost.setAttribute('width', '0'); pathHost.setAttribute('height', '0');
        pathHost.style.position = 'absolute'; pathHost.style.left = '-9999px';
        document.body.appendChild(pathHost);
      }
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d); pathHost.appendChild(el);
      var L = el.getTotalLength(), out = [], i, pt;
      for (i = 0; i < n; i++) { pt = el.getPointAtLength((i / Math.max(1, n - 1)) * L); out.push([pt.x, pt.y]); }
      pathHost.removeChild(el);
      return out;
    } catch (e) { return []; }
  }
  function cloud(key, v, opt) {
    opt = opt || {};
    var budget = opt.budget || 260, C = skin(key, v), parts = build(key, v), r = prng(v.seed + key + 'pt');
    var area = 0, i, j, q, pts = [];
    for (i = 0; i < parts.length; i++) { q = parts[i]; if (q.tone === 'shadow') continue; area += q.k === 'e' ? Math.PI * q.rx * q.ry : 300; }
    for (i = 0; i < parts.length; i++) {
      q = parts[i]; if (q.tone === 'shadow') continue;
      var col = C[q.tone] || q.tone;
      var share = (q.k === 'e' ? Math.PI * q.rx * q.ry : 300) / area;
      var n = Math.max(2, Math.round(budget * share));
      if (q.k === 'e') {
        var ca = Math.cos((q.rot || 0) * Math.PI / 180), sa = Math.sin((q.rot || 0) * Math.PI / 180);
        for (j = 0; j < n; j++) {
          var t = r() * Math.PI * 2, u = Math.sqrt(r());
          var lx = Math.cos(t) * u * q.rx, ly = Math.sin(t) * u * q.ry;
          pts.push({ x: q.x + lx * ca - ly * sa, y: q.y + lx * sa + ly * ca, c: col, r: .7 + r() * 1.5, ph: r() * 6.28, z: q.z, edge: u > .82 });
        }
      } else {
        var sp = samplePath(q.d, n);
        for (j = 0; j < sp.length; j++) pts.push({ x: sp[j][0], y: sp[j][1], c: col, r: .8 + r() * 1.4, ph: r() * 6.28, z: q.z, edge: true });
      }
    }
    // links between near neighbours on the silhouette
    var links = [];
    for (i = 0; i < pts.length; i += 2) {
      if (!pts[i].edge) continue;
      var best = -1, bd = 1e9;
      for (j = 0; j < pts.length; j += 3) {
        if (j === i || !pts[j].edge) continue;
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dd = dx * dx + dy * dy;
        if (dd < bd && dd > 4) { bd = dd; best = j; }
      }
      if (best >= 0 && bd < 300) links.push([i, best]);
    }
    return { pts: pts, links: links, C: C, w: 220, h: 240, v: v };
  }
  function drawCloud(ctx, cl, time, w, h) {
    var v = cl.v, s = Math.min(w / cl.w, h / cl.h), i, p;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate((w - cl.w * s) / 2, (h - cl.h * s) / 2); ctx.scale(s, s);
    var spd = 1 / v.cycle, amp = .8 + v.bob * .55, drift = time * spd;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = .55; ctx.strokeStyle = 'rgba(233,226,208,' + (.05 + v.aura * .1).toFixed(3) + ')';
    ctx.beginPath();
    for (i = 0; i < cl.links.length; i++) {
      var a = cl.pts[cl.links[i][0]], b = cl.pts[cl.links[i][1]];
      ctx.moveTo(a.x + Math.sin(drift + a.ph) * amp, a.y + Math.cos(drift * .8 + a.ph) * amp);
      ctx.lineTo(b.x + Math.sin(drift + b.ph) * amp, b.y + Math.cos(drift * .8 + b.ph) * amp);
    }
    ctx.stroke();
    for (i = 0; i < cl.pts.length; i++) {
      p = cl.pts[i];
      var tw = .55 + .45 * Math.sin(drift * 1.7 + p.ph);
      var x = p.x + Math.sin(drift + p.ph) * amp, y = p.y + Math.cos(drift * .8 + p.ph) * amp + v.droop * .5 * (p.z >= 3 ? 1 : 0);
      ctx.globalAlpha = (.25 + .7 * tw) * (1 - v.fog * .45);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(x, y, p.r * (.7 + .5 * tw), 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  /* ---------- 3d. STYLE D — DEPTH DIORAMA (layered 2.5D planes) -------------- */
  function styleD(key, v, opt) {
    opt = opt || {};
    var A = styleA(key, v, { detail: opt.detail, uid: 'D' + (opt.uid || '') });
    var parts = build(key, v), C = skin(key, v);
    // 5 depth planes from z
    var planes = [[], [], [], [], []], i, q, band;
    for (i = 0; i < parts.length; i++) {
      q = parts[i]; band = q.z <= 1 ? 0 : q.z <= 2 ? 1 : q.z <= 4 ? 2 : q.z <= 7 ? 3 : 4;
      planes[band].push(q);
    }
    return { A: A, planes: planes, C: C, v: v, w: 220, h: 240 };
  }

  /* ---------- motif glyphs (16px, currentColor) ---------- */
  var GLYPHS = {
    constellation: [{ t: 'circle', a: { cx: 3.5, cy: 11.5, r: 1.6, fill: 'currentColor' } }, { t: 'circle', a: { cx: 8.5, cy: 4.5, r: 1.9, fill: 'currentColor' } }, { t: 'circle', a: { cx: 13, cy: 10, r: 1.4, fill: 'currentColor' } }, { t: 'path', a: { d: 'M3.5,11.5 L8.5,4.5 L13,10', stroke: 'currentColor', strokeWidth: 1, fill: 'none', opacity: .55 } }],
    'sigil-ring': [{ t: 'circle', a: { cx: 8, cy: 8, r: 5.2, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, opacity: .4 } }, { t: 'path', a: { d: 'M8,2.8 a5.2,5.2 0 0 1 4.9,3.4', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4 } }],
    peak: [{ t: 'path', a: { d: 'M1.5,13.5 L6.5,4 L9.5,9.2 L11.5,6.2 L14.5,13.5 Z', fill: 'currentColor' } }],
    'rising-line': [{ t: 'path', a: { d: 'M2,13 L6,9 L9,10.5 L14,4.5', stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' } }, { t: 'circle', a: { cx: 14, cy: 4.5, r: 1.6, fill: 'currentColor' } }]
  };

  return {
    PAL: PAL, DOMAINS: DOMAINS, ORDER: ORDER, SIGNALS: SIGNALS, STATES: STATES, PRESETS: PRESETS, GLYPHS: GLYPHS,
    vitals: vitals, build: build, skin: skin, series: series, prng: prng, tone: tone, mix: mix, clamp: clamp,
    styleA: styleA, styleB: styleB, styleD: styleD, cloud: cloud, drawCloud: drawCloud
  };
})();
