# Creature Lab 4 agent implementation contract

This guide describes the implemented browser API in `creature-lab4.js` and the intended app/export contract. It does **not** mean the current Fourfold app, database, email pipeline, or sprite build script has been migrated.

## Runtime API

Load `creature-lab4.js` before use. It installs `window.CreatureLab4` (`L` below):

```ts
type CreatureKey = "squirrel" | "lion" | "bird" | "panda" | "beaver";
type ArtStyle = "faceted" | "ink-spore";
type Detail = "hi" | "lo";

const L = window.CreatureLab4;
```

The five keys are provisional:

| Key | Display character | Lab label |
| --- | --- | --- |
| `squirrel` | Squirrel Summoner | Gourmet Data |
| `lion` | Lion Warrior | Body |
| `bird` | Eagle Scholar | Finance |
| `panda` | Panda Bard | Enjoyment |
| `beaver` | Beaver Engineer | Systems |

`L.DOMAINS` is creature metadata keyed by `CreatureKey`; despite its name, it is **not** the production database-domain registry. `L.ORDER` is the five-key display order.

Useful public members are:

```ts
L.W;                    // 220
L.H;                    // 250
L.DOMAINS;              // creature metadata
L.ORDER;                // five CreatureKey values
L.SIGNALS;
L.STATES;
L.PRESETS;
L.vitals(input);
L.build(creature, vitals, lod);
L.render(creature, vitals, options);
L.renderFaceted(creature, vitals, options);
L.renderInkSpore(creature, vitals, options);
```

Use the shared entry point:

```ts
const output = L.render(creature, vitals, {
  style: "ink-spore", // exact value selects Ink & Spore; otherwise render() falls back to faceted
  detail: "hi",
  uid: "dashboard-lion-ink-radiant-t3",
  facets: 3,          // faceted only; defaults to 3
  grain: true,        // Ink & Spore hi detail only; use false to omit paper grain
});
```

Always validate `style` as the two-value union. A typo silently selects `faceted` in the implemented dispatcher.

The output is a serializable SVG descriptor tree:

```ts
type SvgDescriptor = {
  t: string;                         // SVG tag name
  a?: Record<string, unknown>;       // React-compatible attributes
  k?: string;                        // stable key
  c?: SvgDescriptor[];               // children
};

type RenderOutput = {
  defs: SvgDescriptor[];
  nodes: SvgDescriptor[];
  w: 220;
  h: 250;
};
```

Rendered body groups carry `data-creature`, `data-group`, and `data-surface`. Definition IDs depend on `uid`, so every simultaneously mounted sprite must receive a unique, SVG-ID-safe `uid`.

## Signals, tier, and state

Call `L.vitals()` with all six signals and a stable seed:

| Input | Meaning | Lab range |
| --- | --- | ---: |
| `momentum` | trailing seven-day XP divided by pace | 0–1 |
| `vitality` | 30-day completion rate | 0–1 |
| `volatility` | normalized 14-day daily-score deviation | 0–1 |
| `streak` | consecutive days with a completion | 0–30 |
| `neglect` | days since the domain's last completion | 0–9 |
| `level` | current domain level | 1–10 |

Tier derivation matches the current app:

- Tier I: levels 1–3
- Tier II: levels 4–6
- Tier III: levels 7–10

State precedence is exact and must remain centralized:

```ts
if (neglect >= 5) state = "dormant";
else if (neglect >= 3) state = "slipping";
else if (streak >= 7 && momentum >= 0.62) state = "radiant";
else if (neglect >= 1) state = "drifting";
else state = "steady";
```

Do not infer state from tier. The lion's Radiant-only smirk, for example, depends on `vitals.state`, while muscle, ornament, the beaver workshop field, hatching, spores, pallor, and droop read other derived values. The beaver uses both `toolCount = min(5, 1 + tier + floor(streak / 7))` and `stickCount = min(10, 4 + tier + floor(streak / 4))`; keep those derivations in `vitals()` so runtime and exports agree.

`L.PRESETS` supplies deterministic signal bundles for visual studies. When exporting every state at every tier, override the preset's level after spreading it:

```ts
const levelForTier = { 1: 1, 2: 4, 3: 7 } as const;
const vitals = L.vitals({
  ...L.PRESETS[state],
  level: levelForTier[tier],
  seed: `fourfold:${season}:${creature}:${state}:t${tier}`,
});
```

The current snapshot exporter does not emit that full state-by-tier matrix. It emits one preset-derived tier per state; use the pattern above only when the product needs state and tier as independent asset axes.

## Determinism and IDs

- Never use `Math.random()` for production or exported art.
- Build `seed` from stable product data, such as season plus domain/member identity. The engine appends the creature key internally.
- Keep the same seed, signals, tier, and creature when switching surfaces; only `style` should change.
- `uid` prevents `<defs>` collisions and does not control visual randomness. Make it unique per rendered instance or standalone export, deterministic, and limited to letters, digits, hyphens, and underscores.
- Re-rendering with identical inputs must produce identical descriptor trees and standalone SVG bytes after stable serialization.

## Detail policy and dimensions

The viewBox is always `0 0 220 250`. Preserve the `220:250` aspect ratio; do not reuse the old app's `220:240` height calculation.

Ink & Spore intentionally omits descriptor parts tagged `feature: "eye-detail"` (iris shading, glow bands and tiny glints) while retaining sclera, iris, pupil, lid and expression brow. Faceted renders the complete eye descriptor set. Keep that filter in the surface renderer rather than forking creature anatomy.

## Beaver Draft 3 restoration contract

The implemented beaver intentionally restores the earlier broad, belly-up draft rather than the later grounded-feet revision. An implementation agent should preserve these visual invariants:

| Feature | Required implementation |
| --- | --- |
| Silhouette | Large horizontal body centered near `(119,176)`, paddle tail on the left, one hind paw raised at the upper right, and one hind foot resting at the lower right. |
| Face | Left-facing head, twin incisors, two brass-framed goggles, and studious brows. Ink & Spore still uses the global simplified-eye filter. |
| Gyroscope | Two open brass orbital paths over the belly. Do **not** add the former filled cyan/teal charge disk, bright center disk, or cyan glow at `(133,156)`. |
| Gauge | Separate boiler gauge near `(145,194)`; its needle angle reads `vitality`. |
| Tools | Loose tool paths use `toolCount`; they are signature detail and may reduce to two at low detail. |
| Sticks | Procedural twig geometry uses `stickCount`, is emitted into the shared `back` group before the body, and must remain visible in both Faceted and Ink & Spore. Low detail keeps at most five sticks. |
| Surface switch | Both surfaces consume the same `build()` result and seed. Do not duplicate or independently reposition beaver anatomy inside a renderer. |

The removed cyan belly core is distinct from the beaver's teal palette, goggle lenses, global spores, and gauge needle. Those accents can remain; the prohibited feature is the filled/glowing disk inside the brass gyroscope.

Use the implemented display policy:

```ts
const detail: Detail = width > 90 ? "hi" : "lo";
const height = Math.round(width * L.H / L.W);
```

- `hi`: hero, garden, and History art. It includes full anatomy density; faceted bands and seam light; or Ink & Spore hatching, rim ink, glows, aura, full spores, and optional grain.
- `lo`: cards and compact email art at 90px or below. It reduces anatomy, removes hatching/grain/glow-heavy effects, uses a lighter outline, and caps ambient spores.
- At exactly 90px the current rule selects `lo`; 96px selects `hi`.
- The engine emits no animation. If the app wraps a sprite in an optional idle transform, it must honor `prefers-reduced-motion`.

## React descriptor rendering

This is the minimal client-side bridge. In Next.js, load the browser script before mounting this component or convert the same API to an importable module; do not access `window` during server rendering.

```tsx
import React from "react";

type Descriptor = {
  t: string;
  a?: Record<string, unknown>;
  k?: string;
  c?: Descriptor[];
};

function descriptorToNode(d: Descriptor, index: number): React.ReactNode {
  return React.createElement(
    d.t,
    { ...(d.a ?? {}), key: d.k ?? index },
    d.c?.map(descriptorToNode),
  );
}

function CreatureSvg({ creature, style, signals, width, uid }) {
  const L = window.CreatureLab4;
  const vitals = L.vitals({ ...signals, seed: signals.seed });
  const output = L.render(creature, vitals, {
    style,
    detail: width > 90 ? "hi" : "lo",
    facets: 3,
    grain: style === "ink-spore",
    uid,
  });

  return (
    <svg
      viewBox={`0 0 ${output.w} ${output.h}`}
      width={width}
      height={Math.round(width * output.h / output.w)}
      role="img"
      aria-label={L.DOMAINS[creature].name}
    >
      {output.defs.length > 0 && <defs>{output.defs.map(descriptorToNode)}</defs>}
      {output.nodes.map(descriptorToNode)}
    </svg>
  );
}
```

## Style switching

For a visual-only preference, store `"faceted" | "ink-spore"` in component state and optionally `localStorage`. Re-render the same creature with the same signals and seed:

```ts
const [artStyle, setArtStyle] = useState<ArtStyle>("ink-spore");

function chooseArtStyle(value: string) {
  if (value === "faceted" || value === "ink-spore") {
    setArtStyle(value);
    localStorage.setItem("ff_art_style", value);
  }
}
```

If email and server-rendered surfaces must match this setting, it needs a persisted server setting and API/schema work. That work is not implemented. With pre-rendered assets, switching can instead be a path change using the contract below.

## Export and publish paths

`CreatureLab4` itself only produces descriptors. The generalized Node exporter materializes matching Faceted and Ink & Spore review sets:

```sh
npm run sprites:creature-lab
# equivalent: node generative_art/export-creature-sprites.mjs
```

It writes 60 standalone SVGs, two surface manifests, and one root index:

```text
generative_art/exports/manifest.json
generative_art/exports/{surface}/manifest.json
generative_art/exports/{surface}/{creature}/radiant.svg
generative_art/exports/{surface}/{creature}/steady.svg
generative_art/exports/{surface}/{creature}/drifting.svg
generative_art/exports/{surface}/{creature}/slipping.svg
generative_art/exports/{surface}/{creature}/dormant.svg
generative_art/exports/{surface}/{creature}/card.svg
```

`{surface}` is exactly `faceted` or `ink-spore`. Each surface contains five creatures × six files: five named-state `hi` SVGs plus one Radiant Tier III `lo` card. Both surfaces use identical input presets and seeds, so a path-only surface switch preserves pose, state and tier. Ink exports deliberately omit optional full-surface grain to preserve clean transparent bounds; Faceted exports use three facet bands. The root manifest is the authoritative cross-surface index, while each surface manifest contains creature metadata and relative file paths.

The compatibility command below refreshes only the 30 Ink & Spore files and its surface manifest; it intentionally does not replace the two-surface root index:

```sh
npm run sprites:ink-spore
```

The exporter is a snapshot matrix, not a substitute for the runtime signal space. It uses each named preset's built-in level/tier. If the product needs state and tier as independent axes, extend the script to emit that explicit matrix instead of inventing filenames at runtime.

Each standalone SVG includes `xmlns="http://www.w3.org/2000/svg"`, `viewBox="0 0 220 250"`, accessible title/description, embedded JSON metadata, transparent bounds, semantic group attributes, and collision-free IDs.

Publishing into the app remains separate work. Preserve the same relative structure:

```text
public/sprites/{style}/{creature}/{state}.svg
public/sprites/{style}/{creature}/card.svg
public/characters/{style}/{creature}/{state}.png
public/characters/{style}/{creature}/card.png
```

Then pre-rendered web selection is:

```ts
const spriteUrl = compact
  ? `/sprites/${style}/${creature}/card.svg`
  : `/sprites/${style}/${creature}/${state}.svg`;
```

Both review surfaces now exist under `generative_art/exports/`, but publishing them into `public/` remains separate work. The existing root SVGs, production `public/sprites` layout, tier PNG renderer, `CreaturePortrait` union, and party compositor still follow the old four-creature contract.

## Email and PNG fallback

Do not rely on inline or remote SVG behavior in email clients. Rasterize the exact exported SVG with Sharp (or an equivalent deterministic renderer) and publish the matching PNG path above.

- Render compact member art from `card.svg`, or directly from the same `lo` descriptor, at 2× the intended email width.
- Generate separate party PNGs for each supported style rather than recoloring one raster. A reasonable target is `public/characters/{style}/party.png` until party state/tier requirements are finalized.
- Preserve transparency and the `220:250` aspect ratio for individual creatures.
- If the style preference remains client-only, email must use a documented default style. If email must follow the user's switch, persist the setting server-side first.

## Four-versus-five-domain decision

The production app currently has four database domains and maps Work to a panda. Lab 4 has five art keys and labels Panda as Enjoyment and Beaver as Systems. No fifth-domain database migration has been completed.

Recommended staging choices, in order:

1. Keep `beaver` provisional and unbound: export and review it, but do not put it into task/domain calculations yet.
2. If a four-member product cast is required, make Beaver the Work replacement and keep Panda as an unbound/optional party character until Enjoyment is explicitly approved.
3. Only add Enjoyment or Systems as a fifth product domain after an explicit migration covering database constraints, TypeScript unions, API validation, scoring/history, motifs, garden layout, radar, email grouping, and existing records.

Do not use the display labels in `L.DOMAINS[*].domain` as database keys, and do not claim the app supports five domains until that migration ships.

## Agent acceptance checklist

- [ ] Load `creature-lab4.js` once and verify `window.CreatureLab4` before rendering.
- [ ] Restrict creature, style, detail, state, and tier to the documented unions.
- [ ] Render all five keys in both styles without exceptions.
- [ ] Verify all five preset states and both details for all five creatures in both runtime styles. If the product needs independent state-by-tier assets, extend the exporter and verify all 15 combinations per creature/style.
- [ ] Assert the exact state precedence and tier thresholds above.
- [ ] Use stable seeds; two identical runs must serialize identically.
- [ ] Give every mounted/exported sprite a unique, safe `uid`; verify there are no duplicate SVG definition IDs.
- [ ] Place `<defs>` before `nodes` and preserve `viewBox="0 0 220 250"` plus the `220:250` aspect ratio.
- [ ] Use `hi` only above 90px and `lo` at 90px or below; inspect at 42, 56, 96, and hero size.
- [ ] Confirm a style switch changes only the surface, not pose, signals, seed, state, tier, or silhouette.
- [ ] Confirm the lion is fierce in both styles and only smirks when Radiant.
- [ ] Confirm the panda reads larger than the lion, uses gold/brown over pink, and its gourd is larger than its lute.
- [ ] Confirm the restored Beaver Draft 3 reads as a broad belly-up recline with left paddle tail, raised upper-right paw, twin goggles/incisors, open brass gyroscope, separate vitality gauge, loose tools, and readable sticks in both styles at 56px.
- [ ] Confirm the beaver gyroscope contains no filled cyan/teal core disk and no cyan core glow in either runtime surface or exported SVG.
- [ ] Confirm Ink & Spore omits decorative eye layers for all five creatures while Faceted retains them and both surfaces preserve expression.
- [ ] Check transparent bounds, no clipping, semantic `data-group` attributes, and no unexpected animation.
- [ ] Run `npm run sprites:creature-lab`; verify 60 SVGs, the root index and both surface manifests, then generate and smoke-test matching email PNGs.
- [ ] Document the selected four-versus-five-domain policy before changing app domain mappings or database constraints.
