import type { Domain, Task } from "./types";

export type EnemyTier = 1 | 2 | 3;
export type BattleAtmosphere = "besieged" | "turning" | "ascendant";
export type ArenaCoordinate = { column: number; row: number };
export type TerritoryClaim = { domain: Domain; order: number; sourceTaskId: string | null };

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

export function battleElevation(coordinate: ArenaCoordinate, battleDate = "evergreen") {
  const roll = hash(`${battleDate}:${arenaKey(coordinate)}:elevation`) % 23;
  if (roll === 0) return 2;
  if (roll < 6) return 1;
  return 0;
}

export function arenaPosition(coordinate: ArenaCoordinate, battleDate = "evergreen") {
  const width = 200 / ARENA_DIAGONAL;
  const height = 200 / ARENA_DIAGONAL;
  const centerX = ((coordinate.column - coordinate.row + ARENA_ROWS) / ARENA_DIAGONAL) * 100;
  const centerY = ((coordinate.column + coordinate.row + 1) / ARENA_DIAGONAL) * 100
    - battleElevation(coordinate, battleDate) * 1.05;
  return { centerX, centerY, x: centerX - width / 2, y: centerY - height / 2, width, height };
}

export function battleTerrain(coordinate: ArenaCoordinate, battleDate = "evergreen") {
  return ["cinder", "iron", "crater", "fracture"][hash(`${battleDate}:${arenaKey(coordinate)}:terrain`) % 4];
}

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

    candidates.sort((a, b) => {
      const frontierA = Math.min(...domainTiles.map((tile) => tileDistance(a, tile)));
      const frontierB = Math.min(...domainTiles.map((tile) => tileDistance(b, tile)));
      const scoreA = frontierA * 100 + tileDistance(a, HERO_TILE[task.domain]) * 4 + (hash(`${battleDate}:${task.id}:${arenaKey(a)}`) % 100) / 100;
      const scoreB = frontierB * 100 + tileDistance(b, HERO_TILE[task.domain]) * 4 + (hash(`${battleDate}:${task.id}:${arenaKey(b)}`) % 100) / 100;
      return scoreA - scoreB;
    });

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
