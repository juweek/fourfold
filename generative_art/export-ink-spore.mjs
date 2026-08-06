import { exportCreatureSprites } from "./export-creature-sprites.mjs";

const result = await exportCreatureSprites({
  surfaces: ["ink-spore"],
  writeRootManifest: false,
});

console.log(`Exported ${result.svgCount} Ink & Spore SVGs via the shared creature exporter`);
