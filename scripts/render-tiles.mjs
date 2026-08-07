// Renders the isometric arena tiles as real pixel art instead of stacked CSS gradients.
// One PNG per theme/variant/roll/elevation; the board just points a CSS variable at them.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TILE_W = 64;        // logical pixels across the diamond
const TILE_H = 32;        // logical pixels tall — a true 2:1 isometric face
const HEADROOM = 8;       // transparent room above the plane for grass, stems and shards
const SKIRT = 10;         // soil band every tile stands on
const CLIFF_STEP = 6;     // extra soil per elevation level
const ELEVATIONS = [0, 1, 2, 3, 4];
const VARIANTS = ["plain", "wild", "bloom", "rough"];
const ROLLS = 3;          // hand-free variety so repeated tiles never line up
const SCALE = 2;          // nearest-neighbour export so the art stays crisp on retina

const ROWS = Array.from({ length: TILE_H }, (_, y) => {
  const half = (y < TILE_H / 2 ? y + 1 : TILE_H - y) * 2;
  return [TILE_W / 2 - half, TILE_W / 2 + half - 1];
});
const BOTTOM = Array.from({ length: TILE_W }, (_, x) => {
  for (let y = TILE_H - 1; y >= 0; y -= 1) if (x >= ROWS[y][0] && x <= ROWS[y][1]) return y;
  return -1;
});

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const ramp = (...hexes) => hexes.map(rgb);
const shade = (list, level) => list[Math.max(0, Math.min(list.length - 1, Math.round(level * (list.length - 1))))];

function seedOf(text) {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smoothed value noise — gives clustered blotches rather than television static.
function valueNoise(seed) {
  const at = (x, y) => {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const fx = smooth(x - gx);
    const fy = smooth(y - gy);
    const top = at(gx, gy) * (1 - fx) + at(gx + 1, gy) * fx;
    const bottom = at(gx, gy + 1) * (1 - fx) + at(gx + 1, gy + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
}

class Pixels {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  index(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return (y * this.width + x) * 4;
  }
  set(x, y, color, alpha = 255) {
    const i = this.index(Math.round(x), Math.round(y));
    if (i < 0) return;
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = alpha;
  }
  // Only tints pixels that already exist, so shadows never bleed outside the tile silhouette.
  blend(x, y, color, amount) {
    const i = this.index(Math.round(x), Math.round(y));
    if (i < 0 || this.data[i + 3] === 0) return;
    for (let channel = 0; channel < 3; channel += 1) {
      this.data[i + channel] = Math.round(this.data[i + channel] + (color[channel] - this.data[i + channel]) * amount);
    }
  }
}

function pickInside(random, inset = 4) {
  const y = inset + Math.floor(random() * (TILE_H - inset * 2));
  const [x0, x1] = ROWS[y];
  const low = x0 + inset * 2;
  const high = x1 - inset * 2;
  const x = high <= low ? Math.round((x0 + x1) / 2) : low + Math.floor(random() * (high - low + 1));
  return { x, y };
}

const THEMES = {
  grass: {
    ground: ramp("#25491f", "#325e28", "#407733", "#50903e", "#63aa4c", "#7dc560"),
    blade: ramp("#2b5322", "#4d8b3a", "#93d16b"),
    soil: ramp("#2b1e13", "#3c2a1a", "#4f3723", "#64462c", "#7a5636"),
    floor: ramp("#493928", "#5b4832", "#6d583e", "#7e674a", "#8f7656"),
    stone: ramp("#5b5f5a", "#767a72", "#93978c"),
    petals: ramp("#f6ead0", "#f5d15a", "#f0a3c6", "#cfe0f7"),
    pollen: rgb("#f8e07a"),
    outline: rgb("#13210f"),
    lip: rgb("#2f5a26"),
    texture: "ticks",
    contrast: 0.85,
    features: { plain: [], wild: ["tallgrass"], bloom: ["flowers", "blades"], rough: ["stones", "fringe"] },
    backdrop: "#14251a",
    bed: "#1b3122",
  },
  cinder: {
    ground: ramp("#1d0e12", "#2b1319", "#3a1820", "#4b2028", "#5d2932", "#71353e"),
    blade: ramp("#20101b", "#4a2029", "#8d4a3f"),
    soil: ramp("#1b0d11", "#271217", "#33181e", "#402026", "#4d282e"),
    floor: ramp("#241d21", "#322a2d", "#3f3639", "#4c4245", "#584d50"),
    stone: ramp("#3d3438", "#544a4d", "#6d6165"),
    petals: ramp("#ff7a45", "#ffb066", "#ffd79a", "#ff6030"),
    pollen: rgb("#ffe0a8"),
    outline: rgb("#0c0508"),
    lip: rgb("#2a1218"),
    texture: "grit",
    contrast: 1.5,
    features: { plain: [], wild: ["shards"], bloom: ["sparks"], rough: ["stones", "fringe"] },
    backdrop: "#150a0e",
    bed: "#241016",
  },
  volcano: {
    ground: ramp("#151318", "#201c21", "#2b262b", "#373035", "#443c40", "#534a4d"),
    blade: ramp("#100e12", "#2a2429", "#6b5f62"),
    soil: ramp("#17100f", "#221614", "#2d1c19", "#38231f", "#432a25"),
    floor: ramp("#241c1a", "#312724", "#3e322e", "#4a3d38", "#564842"),
    stone: ramp("#332c2f", "#4a4145", "#635659"),
    petals: ramp("#ff4a12", "#ff8f2e", "#ffd16a", "#ff6a1c"),
    pollen: rgb("#ffe9a8"),
    outline: rgb("#080606"),
    lip: rgb("#1d1a1e"),
    texture: "grit",
    contrast: 1.6,
    features: { plain: ["veins"], wild: ["shards"], bloom: ["sparks", "veins"], rough: ["stones", "fringe"] },
    backdrop: "#120b0a",
    bed: "#1f100c",
  },
};

// Fine per-pixel detail laid over the base wash — this is what stops the face reading as camouflage.
const TEXTURES = {
  // Short blade ticks, the trick that makes flat green read as grass.
  ticks(px, theme, random, palette) {
    for (let y = 0; y < TILE_H; y += 1) {
      const [x0, x1] = ROWS[y];
      for (let x = x0; x <= x1; x += 1) {
        if (random() > 0.16) continue;
        const light = random() < 0.6;
        const color = light ? palette[palette.length - 1] : palette[0];
        px.blend(x, HEADROOM + y, color, light ? 0.85 : 0.6);
        px.blend(x + (random() < 0.5 ? 1 : -1), HEADROOM + y - 1, color, light ? 0.6 : 0.4);
      }
    }
  },
  grit(px, theme, random, palette) {
    for (let y = 0; y < TILE_H; y += 1) {
      const [x0, x1] = ROWS[y];
      for (let x = x0; x <= x1; x += 1) {
        if (random() > 0.2) continue;
        px.blend(x, HEADROOM + y, random() < 0.5 ? palette[palette.length - 1] : palette[0], 0.45);
      }
    }
  },
};

function paintFace(px, theme, variant, random, noise) {
  const palette = variant === "rough" ? theme.floor : theme.ground;
  for (let y = 0; y < TILE_H; y += 1) {
    const [x0, x1] = ROWS[y];
    for (let x = x0; x <= x1; x += 1) {
      // y is doubled in the noise lookup because the isometric face is vertically squashed.
      let level = noise(x * 0.19, y * 0.38) * 0.6 + noise(x * 0.52 + 37, y * 1.04 + 37) * 0.4;
      level = 0.5 + (level - 0.5) * theme.contrast + (0.42 - y / TILE_H) * 0.18;
      px.set(x, HEADROOM + y, shade(palette, level));
    }
  }

  TEXTURES[variant === "rough" ? "grit" : theme.texture](px, theme, random, palette);

  // Light sits upper-left: the far rim catches it, the near rim becomes the crease before the cliff.
  for (let y = 0; y < TILE_H; y += 1) {
    const [x0, x1] = ROWS[y];
    const far = y < TILE_H / 2;
    const edge = far ? palette[palette.length - 1] : palette[0];
    const inner = far ? palette[palette.length - 2] : palette[1];
    for (const x of [x0, x1]) px.set(x, HEADROOM + y, edge);
    for (const x of [x0 + 1, x1 - 1]) px.set(x, HEADROOM + y, inner);
  }
}

function paintSkirt(px, theme, random, noise, depth) {
  for (let x = 0; x < TILE_W; x += 1) {
    const base = BOTTOM[x];
    if (base < 0) continue;
    const lit = x >= TILE_W / 2;
    for (let step = 0; step < depth; step += 1) {
      const y = HEADROOM + base + 1 + step;
      let level = noise(x * 0.3 + 91, (base + step) * 0.46 + 91) * 0.62 + random() * 0.38;
      level = lit ? level * 0.55 + 0.34 : level * 0.46 + 0.05;
      if ((step + Math.floor(x / 2)) % 5 === 0) level -= 0.14;                 // horizontal strata
      px.set(x, y, shade(theme.soil, level));
      if (step < 2) px.set(x, y, step === 0 ? theme.lip : shade(theme.soil, level + 0.18));
    }
    px.set(x, HEADROOM + base + depth, theme.outline);                          // grounded base line
  }

  // The near corner is the closest vertical edge, so it reads brightest.
  for (let step = 1; step < depth - 1; step += 1) {
    px.blend(TILE_W / 2, HEADROOM + TILE_H - 1 + step, shade(theme.soil, 1), 0.4);
    px.blend(TILE_W / 2 - 1, HEADROOM + TILE_H - 1 + step, shade(theme.soil, 0), 0.35);
  }
}

const FEATURES = {
  // A dense patch that fills most of the face — the tile you actually walk into.
  tallgrass(px, theme, random) {
    const stalks = [];
    for (let index = 0; index < 26; index += 1) {
      const spot = pickInside(random, 4);
      stalks.push({ ...spot, height: Math.min(5 + Math.floor(random() * 5), spot.y + HEADROOM - 1) });
    }
    for (const stalk of stalks.sort((a, b) => a.y - b.y)) {
      for (let x = stalk.x - 2; x <= stalk.x + 2; x += 1) px.blend(x, HEADROOM + stalk.y + 1, theme.blade[0], 0.5);
      const lean = random() < 0.4 ? 0 : random() < 0.5 ? -1 : 1;
      for (let tip = 0; tip < stalk.height; tip += 1) {
        const color = tip > stalk.height - 2 ? theme.blade[2] : tip > stalk.height * 0.4 ? theme.blade[1] : theme.blade[0];
        const x = stalk.x + Math.round((tip / stalk.height) * lean);
        px.set(x, HEADROOM + stalk.y - tip, color);
        if (tip > 0 && tip < stalk.height - 1) px.set(x + 1, HEADROOM + stalk.y - tip, theme.blade[0]);
      }
    }
  },
  blades(px, theme, random) {
    const clumps = Array.from({ length: 5 + Math.floor(random() * 4) }, () => pickInside(random, 5));
    for (const clump of clumps.sort((a, b) => a.y - b.y)) {
      for (let x = clump.x - 3; x <= clump.x + 3; x += 1) px.blend(x, HEADROOM + clump.y + 1, theme.blade[0], 0.4);
      const blades = 3 + Math.floor(random() * 3);
      for (let index = 0; index < blades; index += 1) {
        const originX = clump.x + index - Math.floor(blades / 2);
        const height = Math.min(4 + Math.floor(random() * 5), clump.y + HEADROOM - 1);
        const lean = random() < 0.45 ? 0 : random() < 0.5 ? -1 : 1;
        for (let tip = 0; tip < height; tip += 1) {
          const color = tip > height - 2 ? theme.blade[2] : tip > height * 0.45 ? theme.blade[1] : theme.blade[0];
          px.set(originX + Math.round((tip / height) * lean), HEADROOM + clump.y - tip, color);
        }
      }
    }
  },
  flowers(px, theme, random) {
    for (let index = 0; index < 4 + Math.floor(random() * 4); index += 1) {
      const spot = pickInside(random, 6);
      const petal = theme.petals[Math.floor(random() * theme.petals.length)];
      const stem = 2 + Math.floor(random() * 2);
      for (let tip = 0; tip < stem; tip += 1) px.set(spot.x, HEADROOM + spot.y - tip, theme.blade[0]);
      const head = HEADROOM + spot.y - stem;
      px.set(spot.x, head - 1, petal);
      px.set(spot.x - 1, head, petal);
      px.set(spot.x + 1, head, petal);
      px.set(spot.x, head + 1, petal);
      px.set(spot.x, head, theme.pollen);
    }
  },
  shards(px, theme, random) {
    const shards = Array.from({ length: 3 + Math.floor(random() * 3) }, () => pickInside(random, 6));
    for (const shard of shards.sort((a, b) => a.y - b.y)) {
      const height = Math.min(4 + Math.floor(random() * 5), shard.y + HEADROOM - 1);
      for (let tip = 0; tip < height; tip += 1) {
        const width = Math.max(0, Math.round((1 - tip / height) * 2.2));
        for (let offset = -width; offset <= width; offset += 1) {
          const level = offset < 0 ? 0.75 : offset > 0 ? 0.1 : 0.42;
          px.set(shard.x + offset, HEADROOM + shard.y - tip, shade(theme.stone, level));
        }
      }
      for (let x = shard.x - 3; x <= shard.x + 3; x += 1) px.blend(x, HEADROOM + shard.y + 1, theme.outline, 0.42);
    }
  },
  sparks(px, theme, random) {
    for (let index = 0; index < 5 + Math.floor(random() * 4); index += 1) {
      const spot = pickInside(random, 5);
      const core = theme.petals[Math.floor(random() * theme.petals.length)];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) px.blend(spot.x + dx, HEADROOM + spot.y + dy, core, 0.45);
      px.set(spot.x, HEADROOM + spot.y, theme.pollen);
    }
  },
  veins(px, theme, random) {
    for (let index = 0; index < 2 + Math.floor(random() * 2); index += 1) {
      let spot = pickInside(random, 5);
      const heat = theme.petals[Math.floor(random() * 2)];
      for (let step = 0; step < 8 + Math.floor(random() * 10); step += 1) {
        px.blend(spot.x, HEADROOM + spot.y, heat, 0.75);
        px.blend(spot.x, HEADROOM + spot.y - 1, heat, 0.22);
        spot = { x: spot.x + (random() < 0.5 ? 1 : 2), y: spot.y + (random() < 0.62 ? 0 : random() < 0.5 ? 1 : -1) };
        if (spot.y < 1 || spot.y >= TILE_H) break;
      }
    }
  },
  stones(px, theme, random) {
    for (let index = 0; index < 3 + Math.floor(random() * 4); index += 1) {
      const spot = pickInside(random, 6);
      const width = 1 + Math.floor(random() * 2);
      for (let dy = -1; dy <= 1; dy += 1) {
        const span = dy === 0 ? width : width - 1;
        for (let dx = -span; dx <= span; dx += 1) {
          px.set(spot.x + dx, HEADROOM + spot.y + dy, shade(theme.stone, dy < 0 ? 0.95 : dy > 0 ? 0.1 : 0.55));
        }
      }
    }
  },
  // Grass creeping back over a worn floor tile, so paths never look stamped on.
  fringe(px, theme, random) {
    for (let y = 0; y < TILE_H; y += 1) {
      const [x0, x1] = ROWS[y];
      for (const x of [x0, x1, x0 + 1, x1 - 1]) {
        if (random() < 0.62) px.blend(x, HEADROOM + y, shade(theme.ground, y < TILE_H / 2 ? 0.8 : 0.25), 0.72);
      }
    }
    for (let index = 0; index < 2 + Math.floor(random() * 2); index += 1) {
      const y = 6 + Math.floor(random() * (TILE_H - 12));
      const [x0, x1] = ROWS[y];
      const x = random() < 0.5 ? x0 + 2 : x1 - 2;
      for (let tip = 0; tip < 2 + Math.floor(random() * 3); tip += 1) {
        px.set(x, HEADROOM + y - tip, tip > 1 ? theme.blade[2] : theme.blade[1]);
      }
    }
  },
};

function renderTile(themeId, variant, roll, elevation) {
  const theme = THEMES[themeId];
  const depth = SKIRT + elevation * CLIFF_STEP;
  const px = new Pixels(TILE_W, HEADROOM + TILE_H + depth);
  const seed = seedOf(`${themeId}:${variant}:${roll}:${elevation}`);
  const random = rng(seed);
  const noise = valueNoise(seed);

  paintFace(px, theme, variant, random, noise);
  paintSkirt(px, theme, random, noise, depth);
  for (const feature of theme.features[variant]) FEATURES[feature](px, theme, random);

  return sharp(Buffer.from(px.data), { raw: { width: px.width, height: px.height, channels: 4 } })
    .resize(px.width * SCALE, px.height * SCALE, { kernel: "nearest" })
    .png({ palette: true, compressionLevel: 9, effort: 10 })
    .toBuffer();
}

export async function renderArenaTiles(root = process.cwd()) {
  const written = [];
  for (const themeId of Object.keys(THEMES)) {
    const directory = path.join(root, "public", "battle", "tiles", themeId);
    await fs.rm(directory, { recursive: true, force: true });
    await fs.mkdir(directory, { recursive: true });
    for (const variant of VARIANTS) {
      for (let roll = 0; roll < ROLLS; roll += 1) {
        for (const elevation of ELEVATIONS) {
          const file = path.join(directory, `${variant}-${roll}-e${elevation}.png`);
          await fs.writeFile(file, await renderTile(themeId, variant, roll, elevation));
          written.push(file);
        }
      }
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const written = await renderArenaTiles();
  console.log(`rendered ${written.length} arena tiles`);
}
