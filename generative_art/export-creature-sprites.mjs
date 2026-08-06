import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const artRoot = path.dirname(scriptPath);
const workspace = path.dirname(artRoot);
const exportsRoot = path.join(artRoot, "exports");

globalThis.window = globalThis.window || {};
await import(new URL("./creature-lab4.js?export=1", import.meta.url).href);

const Lab = globalThis.window.CreatureLab4;
if (!Lab) throw new Error("CreatureLab4 did not register on window");

const SURFACES = ["faceted", "ink-spore"];
const SURFACE_LABELS = {
  faceted: "Faceted",
  "ink-spore": "Ink & Spore",
};
const STATE_ORDER = ["radiant", "steady", "drifting", "slipping", "dormant"];
const GENERATED_BY = "generative_art/export-creature-sprites.mjs";

const XML_ATTR = {
  className: "class",
  clipPath: "clip-path",
  fillRule: "fill-rule",
  pointerEvents: "pointer-events",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeWidth: "stroke-width",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function attributeName(name) {
  return XML_ATTR[name] || name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function attributes(input = {}) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => {
      if (name === "style" && typeof value === "object") {
        const css = Object.entries(value)
          .map(([property, entry]) => `${attributeName(property)}:${entry}`)
          .join(";");
        return ` style="${escapeXml(css)}"`;
      }
      return ` ${attributeName(name)}="${escapeXml(value)}"`;
    })
    .join("");
}

function nodeToXml(node) {
  const children = (node.c || []).map(nodeToXml).join("");
  return `<${node.t}${attributes(node.a)}>${children}</${node.t}>`;
}

function titleFor(key) {
  return Lab.DOMAINS[key]?.name || key;
}

function exportPolicy(surface) {
  if (surface === "ink-spore") {
    return { grain: false, reason: "preserve clean transparent sprite bounds" };
  }
  return { facets: 3 };
}

function motionStyle(key, state) {
  const flapDuration = {
    radiant: "1.15s",
    steady: "1.4s",
    drifting: "1.9s",
    slipping: "2.5s",
    dormant: "3.4s",
  }[state] || "1.4s";
  const tailDuration = {
    radiant: "3.2s",
    steady: "3.8s",
    drifting: "4.8s",
    slipping: "5.8s",
    dormant: "7s",
  }[state] || "3.8s";

  if (key === "bird") {
    return `<style>
[data-group="wingL"],[data-group="wingR"]{transform-box:view-box;will-change:transform;animation-duration:${flapDuration};animation-timing-function:ease-in-out;animation-iteration-count:infinite}
[data-group="wingL"]{transform-origin:108px 152px;animation-name:ff-wing-left}
[data-group="wingR"]{transform-origin:108px 152px;animation-name:ff-wing-right}
:root:target [data-group="wingL"],:root:target [data-group="wingR"]{animation-play-state:paused}
@keyframes ff-wing-left{0%,100%{transform:rotate(-2deg) scaleY(1)}50%{transform:rotate(7deg) scaleY(.94)}}
@keyframes ff-wing-right{0%,100%{transform:rotate(2deg) scaleY(1)}50%{transform:rotate(-7deg) scaleY(.94)}}
@media (prefers-reduced-motion:reduce){[data-group="wingL"],[data-group="wingR"]{animation:none}}
</style>`;
  }

  if (key === "squirrel") {
    return `<style>
[data-group="tail"]{transform-box:view-box;transform-origin:138px 212px;will-change:transform;animation:ff-tail-sway ${tailDuration} ease-in-out infinite}
:root:target [data-group="tail"]{animation-play-state:paused}
@keyframes ff-tail-sway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(3deg)}}
@media (prefers-reduced-motion:reduce){[data-group="tail"]{animation:none}}
</style>`;
  }

  return "";
}

function svgDocument({ surface, key, state, detail, vitals, output }) {
  const tier = vitals.tier;
  const titleId = `title-${surface}-${key}-${state}-${detail}`;
  const descId = `desc-${surface}-${key}-${state}-${detail}`;
  const defs = output.defs.length ? `<defs>${output.defs.map(nodeToXml).join("")}</defs>` : "";
  const motion = motionStyle(key, state);
  const motionTarget = motion ? ' id="motion-paused"' : "";
  const metadata = {
    creature: key,
    name: titleFor(key),
    surface,
    state,
    detail,
    tier,
    seed: vitals.seed,
    inputs: vitals.input,
  };
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg${motionTarget} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${output.w} ${output.h}" width="${output.w}" height="${output.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${titleId} ${descId}" data-creature="${key}" data-surface="${surface}" data-state="${state}" data-tier="${tier}" data-detail="${detail}">`,
    `<title id="${titleId}">${escapeXml(titleFor(key))} — ${escapeXml(state)} ${escapeXml(SURFACE_LABELS[surface])}</title>`,
    `<desc id="${descId}">Fourfold generative creature sprite. Fixed 220 by 250 viewBox; transparent background.</desc>`,
    `<metadata>${escapeXml(JSON.stringify(metadata))}</metadata>`,
    motion,
    defs,
    output.nodes.map(nodeToXml).join(""),
    "</svg>",
    "",
  ].join("\n");
}

function surfaceManifest(surface) {
  return {
    schemaVersion: 1,
    generatedBy: GENERATED_BY,
    engine: "generative_art/creature-lab4.js",
    surface,
    surfaceLabel: SURFACE_LABELS[surface],
    viewBox: [0, 0, Lab.W, Lab.H],
    aspectRatio: Lab.W / Lab.H,
    detailPolicy: { high: "display width > 90px", low: "display width <= 90px" },
    exportPolicy: exportPolicy(surface),
    stateOrder: STATE_ORDER,
    creatureOrder: [...Lab.ORDER],
    svgCount: Lab.ORDER.length * (STATE_ORDER.length + 1),
    creatures: {},
  };
}

function renderOptions(surface, detail, uid) {
  return {
    style: surface,
    detail,
    facets: 3,
    grain: false,
    uid,
  };
}

async function exportSurface(surface) {
  const outputRoot = path.join(exportsRoot, surface);
  const manifest = surfaceManifest(surface);
  await fs.mkdir(outputRoot, { recursive: true });

  for (const key of Lab.ORDER) {
    const creatureDir = path.join(outputRoot, key);
    await fs.mkdir(creatureDir, { recursive: true });
    const files = {};

    for (const state of STATE_ORDER) {
      const inputs = { ...Lab.PRESETS[state], seed: `fourfold-r4|${key}|${state}` };
      const vitals = Lab.vitals(inputs);
      const output = Lab.render(
        key,
        vitals,
        renderOptions(surface, "hi", `export-${surface}-${key}-${state}-hi`),
      );
      const relative = `${key}/${state}.svg`;
      await fs.writeFile(
        path.join(outputRoot, relative),
        svgDocument({ surface, key, state, detail: "hi", vitals, output }),
      );
      files[state] = relative;
    }

    const cardInputs = { ...Lab.PRESETS.radiant, seed: `fourfold-r4|${key}|card` };
    const cardVitals = Lab.vitals(cardInputs);
    const cardOutput = Lab.render(
      key,
      cardVitals,
      renderOptions(surface, "lo", `export-${surface}-${key}-card-lo`),
    );
    const cardRelative = `${key}/card.svg`;
    await fs.writeFile(
      path.join(outputRoot, cardRelative),
      svgDocument({ surface, key, state: "radiant", detail: "lo", vitals: cardVitals, output: cardOutput }),
    );
    files.card = cardRelative;

    manifest.creatures[key] = {
      name: Lab.DOMAINS[key].name,
      domain: Lab.DOMAINS[key].domain,
      signature: Lab.DOMAINS[key].sig,
      files,
    };
  }

  await fs.writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

function rootManifest(surfaceManifests) {
  const surfaces = Object.keys(surfaceManifests);
  const svgCount = surfaces.reduce((total, surface) => total + surfaceManifests[surface].svgCount, 0);
  return {
    schemaVersion: 1,
    generatedBy: GENERATED_BY,
    engine: "generative_art/creature-lab4.js",
    viewBox: [0, 0, Lab.W, Lab.H],
    aspectRatio: Lab.W / Lab.H,
    detailPolicy: { high: "display width > 90px", low: "display width <= 90px" },
    surfaces,
    surfaceLabels: Object.fromEntries(surfaces.map((surface) => [surface, SURFACE_LABELS[surface]])),
    stateOrder: STATE_ORDER,
    creatureOrder: [...Lab.ORDER],
    pathTemplates: {
      state: "{surface}/{creature}/{state}.svg",
      card: "{surface}/{creature}/card.svg",
    },
    seedTemplates: {
      state: "fourfold-r4|{creature}|{state}",
      card: "fourfold-r4|{creature}|card",
    },
    counts: {
      surfaces: surfaces.length,
      creatures: Lab.ORDER.length,
      namedStates: STATE_ORDER.length,
      filesPerCreaturePerSurface: STATE_ORDER.length + 1,
      svg: svgCount,
    },
    manifests: Object.fromEntries(surfaces.map((surface) => [surface, `${surface}/manifest.json`])),
  };
}

export async function exportCreatureSprites({
  surfaces = SURFACES,
  writeRootManifest = surfaces.length === SURFACES.length,
} = {}) {
  const requested = [...new Set(surfaces)];
  for (const surface of requested) {
    if (!SURFACES.includes(surface)) throw new Error(`Unsupported creature surface: ${surface}`);
  }

  const manifests = {};
  for (const surface of requested) manifests[surface] = await exportSurface(surface);

  if (writeRootManifest) {
    await fs.mkdir(exportsRoot, { recursive: true });
    await fs.writeFile(
      path.join(exportsRoot, "manifest.json"),
      `${JSON.stringify(rootManifest(manifests), null, 2)}\n`,
    );
  }

  return {
    surfaces: requested,
    svgCount: requested.reduce((total, surface) => total + manifests[surface].svgCount, 0),
    outputRoot: path.relative(workspace, exportsRoot),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const result = await exportCreatureSprites();
  console.log(`Exported ${result.svgCount} SVGs across ${result.surfaces.length} surfaces to ${result.outputRoot}`);
}
