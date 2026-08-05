import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const output = path.join(root, "public", "characters");
const svgOutput = path.join(root, "public", "sprites");
const creatures = [
  ["panda", "panda-spellcaster.svg"],
  ["squirrel", "squirrel-summoner.svg"],
  ["lion", "lion-warrior.svg"],
  ["bird", "bird-scholar.svg"],
];

await fs.mkdir(output, { recursive: true });
await fs.mkdir(svgOutput, { recursive: true });

function atTier(svg, tier) {
  return svg.replace(/<g([^>]*data-tier="([23])"[^>]*)>/g, (match, attrs, layer) => {
    if (Number(layer) <= tier) return match;
    return `<g${attrs} style="display:none">`;
  });
}

const buffers = new Map();
for (const [creature, filename] of creatures) {
  const svg = await fs.readFile(path.join(root, filename), "utf8");
  await fs.writeFile(path.join(svgOutput, filename), svg);
  for (const tier of [1, 2, 3]) {
    const buffer = await sharp(Buffer.from(atTier(svg, tier)))
      .resize({ width: 440, height: 480, fit: "contain" })
      .png()
      .toBuffer();
    buffers.set(`${creature}-${tier}`, buffer);
    await fs.writeFile(path.join(output, `${creature}-tier-${tier}.png`), buffer);
  }
}

const party = await sharp({
  create: { width: 880, height: 520, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: await sharp(buffers.get("bird-1")).resize({ width: 292 }).toBuffer(), left: 292, top: 0 },
    { input: await sharp(buffers.get("squirrel-1")).resize({ width: 205 }).toBuffer(), left: 72, top: 275 },
    { input: await sharp(buffers.get("panda-1")).resize({ width: 338 }).toBuffer(), left: 205, top: 160 },
    { input: await sharp(buffers.get("lion-1")).resize({ width: 290 }).toBuffer(), left: 510, top: 218 },
  ])
  .png()
  .toBuffer();

await fs.writeFile(path.join(output, "party.png"), party);
