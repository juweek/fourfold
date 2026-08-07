// Opens the battle board in a plain browser tab with stand-in quests, so tile art and board layout
// can be judged without signing into the app. Geometry comes straight from lib/battle.ts and the
// styling from app/globals.css, so what you see here is what the real board renders.
//
//   npm run preview:arena -- [grass|cinder|volcano] [full|lite]
//
// then open the .arena-preview.html it writes.
import fs from "node:fs/promises";
import {
  ARENA_TILES, HERO_TILE, TILE_SPRITE_RISE, arenaKey, arenaPosition, battleElevation,
  battleEnemyPlacements, battleTerrain, battleTerritory, enemySpritePath, enemyTier, tileSpritePath, tileSpriteScale,
} from "../lib/battle.ts";
import { DOMAIN_META, DOMAINS } from "../lib/domains.ts";

const theme = process.argv[2] ?? "grass";
const detail = process.argv[3] === "lite" ? "lite" : "full";
const date = new Date().toISOString().slice(0, 10);
const HERO_SIZE = { work: "9.4%", gourmet: "7%", body: "11.7%", finance: "9.2%", life: "11%" };
const HERO_SPRITE = {
  work: "/battle/heroes/vesper-beaver-pixel.png", gourmet: "/battle/heroes/moss-squirrel-pixel.png",
  body: "/battle/heroes/ari-lion-pixel.png", finance: "/battle/heroes/aurelia-bird-pixel.png",
  life: "/battle/heroes/pax-panda-pixel.png",
};

const task = (id, points, completed, domain) => ({
  id, title: id, domain, difficulty: "medium", importance: "medium", points,
  task_date: date, original_task_date: date, rollover_count: 0, is_bonus: false,
  completed_at: completed ? `${date}T12:00:00Z` : null, archived_at: null, action_type: null,
  created_at: `${date}T10:00:00Z`,
});
const tasks = [
  task("w1", 9, true, "work"), task("g1", 7, true, "gourmet"), task("b1", 12, true, "body"),
  task("f1", 5, true, "finance"), task("l1", 8, true, "life"), task("w2", 4, true, "work"),
  task("open-1", 3, false, "work"), task("open-2", 8, false, "gourmet"), task("open-3", 14, false, "body"),
  task("open-4", 6, false, "finance"), task("open-5", 2, false, "life"), task("open-6", 11, false, "work"),
];

const territory = battleTerritory(tasks, date);
const placements = battleEnemyPlacements(tasks, territory, date);
const enemyTiles = new Set([...placements.values()].map(arenaKey));
const heroOwners = new Map(Object.entries(HERO_TILE).map(([domain, tile]) => [arenaKey(tile), domain]));

const tiles = ARENA_TILES.map((tile) => {
  const position = arenaPosition(tile, date);
  const elevation = battleElevation(tile, date);
  const terrain = battleTerrain(tile, date);
  const key = arenaKey(tile);
  const claim = territory.claims.get(key);
  const heroOwner = heroOwners.get(key);
  const isEnemy = enemyTiles.has(key);
  const meta = claim?.domain ?? heroOwner ? DOMAIN_META[claim?.domain ?? heroOwner] : null;
  const classes = ["arena-tile", `terrain-${terrain.variant}`, `elevation-${elevation}`,
    claim && "is-claimed", isEnemy && "is-enemy", heroOwner && "is-hero"].filter(Boolean).join(" ");
  const style = [
    `left:${position.x}%`, `top:${position.y}%`, `width:${position.width}%`, `height:${position.height}%`,
    `z-index:${5 + (tile.column + tile.row) * 2 + elevation * 2}`,
    `--tile-sprite:url('${tileSpritePath(theme, terrain, elevation, detail)}')`,
    `--tile-scale:${tileSpriteScale(elevation)}`, `--tile-rise:${-TILE_SPRITE_RISE * 100}%`,
    `--claim-order:${claim?.order ?? 0}`,
    ...(meta ? [`--domain:${meta.color}`, `--domain-light:${meta.light}`] : []),
  ].join(";");
  return `<i class="${classes}" style="${style}">${claim || heroOwner || isEnemy ? '<i class="tile-marker"></i>' : ""}</i>`;
}).join("");

const enemies = [...placements.entries()].map(([id, placement]) => {
  const source = tasks.find((item) => item.id === id);
  const tier = enemyTier(source.points);
  const position = arenaPosition(placement, date);
  const meta = DOMAIN_META[source.domain];
  return `<span class="battle-piece enemy-miniature enemy-tier-${tier}" style="left:${position.centerX}%;top:${position.centerY}%;--domain:${meta.color};--domain-light:${meta.light};--piece-delay:${placement.delay}s;--piece-flip:${placement.mirrored ? -1 : 1};z-index:${150 + (placement.column + placement.row) * 3 + tier}">
    <i class="miniature-base"></i><img src="${enemySpritePath(tier)}" alt=""><b class="enemy-points">${source.points}</b></span>`;
}).join("");

const heroes = DOMAINS.map((domain, index) => {
  const tile = HERO_TILE[domain];
  const position = arenaPosition(tile, date);
  const meta = DOMAIN_META[domain];
  return `<span class="battle-piece hero-miniature hero-${domain}" data-state="steady" style="left:${position.centerX}%;top:${position.centerY}%;--domain:${meta.color};--domain-light:${meta.light};--hero-size:${HERO_SIZE[domain]};--resolve:64%;--piece-delay:${-index * 0.55}s;z-index:${230 + (tile.column + tile.row) * 3}">
    <i class="miniature-base"></i><img class="hero-sprite-pixel" src="${HERO_SPRITE[domain]}" alt="">
    <span class="hero-plate"><b>${meta.name}</b><small>Battle ready</small></span>
    <span class="hero-resolve"><i></i></span></span>`;
}).join("");

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Arena preview · ${theme} · ${detail}</title>
<link rel="stylesheet" href="app/globals.css">
<style>body{margin:0;background:#12141A}.wrap{padding:26px}</style></head>
<body><div class="wrap"><section class="battle-map atmosphere-turning arena-theme-${theme}">
<div class="battle-grid-viewport"><div class="arena-perspective"><div class="isometric-board territory-arena">
<div class="arena-bed"></div>${tiles}<div class="arena-heart"><i></i><b>IV</b></div>${enemies}${heroes}
</div></div></div></section></div></body></html>`;
// file:// has no server root, and url() inside a custom property resolves against the stylesheet
// rather than the document, so rewrite the app's absolute asset paths to absolute file:// URLs.
const assets = `file://${process.cwd()}/public/battle/`;
await fs.writeFile(".arena-preview.html", page.replaceAll("/battle/", assets));
console.log(`file://${process.cwd()}/.arena-preview.html · ${theme} · ${detail} · ${date}`);
