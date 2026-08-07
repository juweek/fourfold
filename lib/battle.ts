import type { Domain, Task } from "./types";

export type EnemyTier = 1 | 2 | 3;
export type BattleAtmosphere = "besieged" | "turning" | "ascendant";
export type ArenaCoordinate = { column: number; row: number };
export type TerritoryClaim = { domain: Domain; order: number; sourceTaskId: string | null };
export type ArenaTheme = (typeof ARENA_THEMES)[number];
export type TerrainVariant = (typeof TERRAIN_VARIANTS)[number];
export type Terrain = { variant: TerrainVariant; roll: number };

export const ARENA_THEMES = ["grass", "cinder", "volcano"] as const;
export const TERRAIN_VARIANTS = ["plain", "wild", "bloom", "rough"] as const;
export const ARENA_ELEVATIONS = [0, 1, 2, 3, 4] as const;
export const TERRAIN_ROLLS = 3;

// Weighted draw: open ground dominates so the set-piece tiles stay special.
const TERRAIN_TABLE: TerrainVariant[] = ["plain", "plain", "plain", "plain", "wild", "wild", "bloom", "rough"];

// Tile sprite geometry, in the logical pixels used by scripts/render-tiles.mjs.
// Both files must agree or the art floats off its footprint.
const TILE_FACE = 32;
const TILE_HEADROOM = 8;
const TILE_SKIRT = 10;
const TILE_CLIFF_STEP = 6;

const DOMAINS: Domain[] = ["work", "gourmet", "body", "finance", "life"];
const ARENA_COLUMNS = 13;
const ARENA_ROWS = 9;
const ARENA_DIAGONAL = ARENA_COLUMNS + ARENA_ROWS;
const GRID_DIRECTIONS: ArenaCoordinate[] = [
  { column: 1, row: 0 },
  { column: -1, row: 0 },
  { column: 0, row: 1 },
  { column: 0, row: -1 },
];

export const HERO_TILE: Record<Domain, ArenaCoordinate> = {
  work: { column: 1, row: 2 },
  gourmet: { column: 4, row: 1 },
  body: { column: 11, row: 2 },
  finance: { column: 10, row: 7 },
  life: { column: 2, row: 7 },
};

export const ARENA_TILES = Array.from({ length: ARENA_ROWS }, (_, row) =>
  Array.from({ length: ARENA_COLUMNS }, (_, column) => ({ column, row })),
).flat();

const ARENA_KEYS = new Set(ARENA_TILES.map(arenaKey));
const HERO_KEYS = new Set(Object.values(HERO_TILE).map(arenaKey));

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return Math.abs(result);
}

function neighbors(coordinate: ArenaCoordinate) {
  return GRID_DIRECTIONS
    .map((direction) => ({ column: coordinate.column + direction.column, row: coordinate.row + direction.row }))
    .filter((neighbor) => ARENA_KEYS.has(arenaKey(neighbor)));
}

function tileDistance(a: ArenaCoordinate, b: ArenaCoordinate) {
  return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
}

export function arenaKey({ column, row }: ArenaCoordinate) {
  return `${column}:${row}`;
}

export function enemyTier(points: number): EnemyTier {
  if (points <= 5) return 1;
  if (points <= 10) return 2;
  return 3;
}

export function enemySpritePath(tier: EnemyTier) {
  if (tier === 1) return "/battle/inkling-skirmisher-pixel.png";
  if (tier === 2) return "/battle/burden-raider-pixel.png";
  return "/battle/crown-titan-pixel.png";
}

// Every tile belongs to whichever hero stands nearest, so the board reads as five contiguous
// territories rather than scattered squares. Ties fall to DOMAINS order, which keeps it stable.
const ZONE_BY_TILE = new Map<string, Domain>(ARENA_TILES.map((tile) => {
  let owner = DOMAINS[0];
  let nearest = Infinity;
  for (const domain of DOMAINS) {
    const distance = tileDistance(tile, HERO_TILE[domain]);
    if (distance < nearest) { nearest = distance; owner = domain; }
  }
  return [arenaKey(tile), owner];
}));

export function battleZone(coordinate: ArenaCoordinate) {
  return ZONE_BY_TILE.get(arenaKey(coordinate)) ?? DOMAINS[0];
}

// A day raises one whole territory — sometimes two — so a hero and the foes at their border
// always share a level. Heights stay at 2–3 so the lift clears the board's top margin.
const plateauCache = new Map<string, Map<Domain, number>>();

function raisedPlateaus(battleDate: string) {
  const cached = plateauCache.get(battleDate);
  if (cached) return cached;

  const order = [...DOMAINS].sort((a, b) => hash(`${battleDate}:${a}:plateau`) - hash(`${battleDate}:${b}:plateau`));
  const raised = new Map<Domain, number>();
  for (let index = 0; index < (hash(`${battleDate}:plateau-count`) % 3 === 0 ? 2 : 1); index += 1) {
    raised.set(order[index], 2 + (hash(`${battleDate}:${order[index]}:height`) % 2));
  }
  plateauCache.set(battleDate, raised);
  return raised;
}

export function battleElevation(coordinate: ArenaCoordinate, battleDate = "evergreen") {
  return raisedPlateaus(battleDate).get(battleZone(coordinate)) ?? 0;
}

// A tile face is 200/ARENA_DIAGONAL percent tall, so one cliff step lifts by that same fraction.
const ELEVATION_LIFT = (200 / ARENA_DIAGONAL) * (TILE_CLIFF_STEP / TILE_FACE);

export function arenaPosition(coordinate: ArenaCoordinate, battleDate = "evergreen") {
  const width = 200 / ARENA_DIAGONAL;
  const height = 200 / ARENA_DIAGONAL;
  const centerX = ((coordinate.column - coordinate.row + ARENA_ROWS) / ARENA_DIAGONAL) * 100;
  const centerY = ((coordinate.column + coordinate.row + 1) / ARENA_DIAGONAL) * 100
    - battleElevation(coordinate, battleDate) * ELEVATION_LIFT;
  return { centerX, centerY, x: centerX - width / 2, y: centerY - height / 2, width, height };
}

export function battleTerrain(coordinate: ArenaCoordinate, battleDate = "evergreen"): Terrain {
  return {
    variant: TERRAIN_TABLE[hash(`${battleDate}:${arenaKey(coordinate)}:terrain`) % TERRAIN_TABLE.length],
    roll: hash(`${battleDate}:${arenaKey(coordinate)}:roll`) % TERRAIN_ROLLS,
  };
}

// "lite" collapses the three cosmetic rolls of each terrain down to one. A phone then fetches and
// keeps roughly a third as many tile bitmaps in memory; the field just repeats itself a bit more.
export function tileSpritePath(theme: ArenaTheme, terrain: Terrain, elevation: number, detail: "full" | "lite" = "full") {
  return `/battle/tiles/${theme}/${terrain.variant}-${detail === "lite" ? 0 : terrain.roll}-e${elevation}.png`;
}

// The sprite is taller than its tile footprint: headroom for grass above, soil and cliff below.
export function tileSpriteScale(elevation: number) {
  return (TILE_HEADROOM + TILE_FACE + TILE_SKIRT + elevation * TILE_CLIFF_STEP) / TILE_FACE;
}

export const TILE_SPRITE_RISE = TILE_HEADROOM / TILE_FACE;

export function battleTerritory(tasks: Task[], battleDate = "evergreen") {
  const claims = new Map<string, TerritoryClaim>();
  const claimedByDomain = Object.fromEntries(DOMAINS.map((domain) => [domain, 0])) as Record<Domain, number>;
  const taskClaims = new Map<string, number>();

  for (const domain of DOMAINS) claims.set(arenaKey(HERO_TILE[domain]), { domain, order: -1, sourceTaskId: null });

  let claimOrder = 0;
  const completedTasks = tasks
    .filter((task) => task.completed_at)
    .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? "") || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  for (const task of completedTasks) {
    let awarded = 0;
    for (let point = 0; point < task.points; point += 1) {
      const frontier = new Map<string, ArenaCoordinate>();
      for (const [key, claim] of claims) {
        if (claim.domain !== task.domain) continue;
        const [column, row] = key.split(":").map(Number);
        for (const neighbor of neighbors({ column, row })) {
          const neighborKey = arenaKey(neighbor);
          if (!claims.has(neighborKey)) frontier.set(neighborKey, neighbor);
        }
      }

      const candidates = frontier.size
        ? [...frontier.values()]
        : ARENA_TILES.filter((tile) => !claims.has(arenaKey(tile)));
      if (!candidates.length) break;

      const seed = HERO_TILE[task.domain];
      candidates.sort((a, b) => {
        const friendlyA = neighbors(a).filter((tile) => claims.get(arenaKey(tile))?.domain === task.domain).length;
        const friendlyB = neighbors(b).filter((tile) => claims.get(arenaKey(tile))?.domain === task.domain).length;
        const scoreA = tileDistance(a, seed) * 20 - friendlyA * 7 + (hash(`${battleDate}:${task.id}:${point}:${arenaKey(a)}`) % 100) / 100;
        const scoreB = tileDistance(b, seed) * 20 - friendlyB * 7 + (hash(`${battleDate}:${task.id}:${point}:${arenaKey(b)}`) % 100) / 100;
        return scoreA - scoreB;
      });

      claims.set(arenaKey(candidates[0]), { domain: task.domain, order: claimOrder++, sourceTaskId: task.id });
      claimedByDomain[task.domain] += 1;
      awarded += 1;
    }
    taskClaims.set(task.id, awarded);
  }

  return { claims, claimedByDomain, taskClaims, claimedTotal: Object.values(claimedByDomain).reduce((sum, count) => sum + count, 0) };
}

export function battleEnemyPlacements(tasks: Task[], territory: ReturnType<typeof battleTerritory>, battleDate = "evergreen") {
  const used = new Set<string>();
  const placements = new Map<string, ArenaCoordinate & { delay: number; mirrored: boolean }>();
  const openTasks = tasks
    .filter((task) => !task.completed_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  for (const task of openTasks) {
    const domainTiles = [...territory.claims.entries()]
      .filter(([, claim]) => claim.domain === task.domain)
      .map(([key]) => {
        const [column, row] = key.split(":").map(Number);
        return { column, row };
      });
    let candidates = ARENA_TILES.filter((tile) => {
      const key = arenaKey(tile);
      const insideHeroRing = Object.values(HERO_TILE).some((hero) => tileDistance(tile, hero) <= 1);
      return !territory.claims.has(key) && !used.has(key) && !insideHeroRing;
    });
    if (!candidates.length) candidates = ARENA_TILES.filter((tile) => !HERO_KEYS.has(arenaKey(tile)) && !used.has(arenaKey(tile)));
    if (!candidates.length) break;

    // Staying inside the domain's own zone outranks everything else: it is what keeps a quest's
    // enemy on the same plateau as the hero it threatens.
    const score = (tile: ArenaCoordinate) =>
      (battleZone(tile) === task.domain ? 0 : 100000)
      + Math.min(...domainTiles.map((claimed) => tileDistance(tile, claimed))) * 100
      + tileDistance(tile, HERO_TILE[task.domain]) * 4
      + (hash(`${battleDate}:${task.id}:${arenaKey(tile)}`) % 100) / 100;
    candidates.sort((a, b) => score(a) - score(b));

    const coordinate = candidates[0];
    const seed = hash(`${battleDate}:${task.id}`);
    used.add(arenaKey(coordinate));
    placements.set(task.id, { ...coordinate, delay: -((seed % 24) / 10), mirrored: seed % 2 === 0 });
  }

  return placements;
}

export function battleProgress(tasks: Task[], domain?: Domain) {
  const relevant = domain ? tasks.filter((task) => task.domain === domain) : tasks;
  const totalPoints = relevant.reduce((sum, task) => sum + task.points, 0);
  const earnedPoints = relevant.filter((task) => task.completed_at).reduce((sum, task) => sum + task.points, 0);
  const openTasks = relevant.filter((task) => !task.completed_at);
  return {
    totalPoints,
    earnedPoints,
    openCount: openTasks.length,
    openPoints: openTasks.reduce((sum, task) => sum + task.points, 0),
    progress: totalPoints ? Math.min(100, Math.round((earnedPoints / totalPoints) * 100)) : 0,
  };
}

export function battleAtmosphere(progress: number): BattleAtmosphere {
  if (progress >= 70) return "ascendant";
  if (progress >= 30) return "turning";
  return "besieged";
}
