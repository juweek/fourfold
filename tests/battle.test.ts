import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { ARENA_ELEVATIONS, ARENA_THEMES, ARENA_TILES, HERO_TILE, TERRAIN_ROLLS, TERRAIN_VARIANTS, arenaKey, battleZone, arenaPosition, battleAtmosphere, battleElevation, battleEnemyPlacements, battleProgress, battleTerrain, battleTerritory, enemyTier, tileSpritePath } from "../lib/battle.ts";
import type { Domain, Task } from "../lib/types.ts";

function quest(id: string, points: number, completed = false, domain: Domain = "work"): Task {
  return {
    id,
    title: id,
    domain,
    difficulty: "medium",
    importance: "medium",
    points,
    task_date: "2026-08-07",
    original_task_date: "2026-08-07",
    rollover_count: 0,
    is_bonus: false,
    completed_at: completed ? "2026-08-07T12:00:00Z" : null,
    archived_at: null,
    action_type: null,
    created_at: "2026-08-07T10:00:00Z",
  };
}

test("enemy silhouettes scale with quest points", () => {
  assert.equal(enemyTier(1), 1);
  assert.equal(enemyTier(5), 1);
  assert.equal(enemyTier(6), 2);
  assert.equal(enemyTier(10), 2);
  assert.equal(enemyTier(12), 3);
});

test("battle progress is point-weighted and determines the board atmosphere", () => {
  const progress = battleProgress([quest("small", 2, true), quest("boss", 12)]);
  assert.deepEqual(progress, { totalPoints: 14, earnedPoints: 2, openCount: 1, openPoints: 12, progress: 14 });
  assert.equal(battleAtmosphere(progress.progress), "besieged");
  assert.equal(battleAtmosphere(45), "turning");
  assert.equal(battleAtmosphere(80), "ascendant");
});

test("completed point values deterministically capture one adjacent territory tile each", () => {
  const tasks = [quest("ari-five", 5, true, "body"), quest("ari-ten", 10, true, "body")];
  const territory = battleTerritory(tasks, "2026-08-07");
  assert.equal(territory.claimedByDomain.body, 15);
  assert.equal(territory.taskClaims.get("ari-five"), 5);
  assert.equal(territory.taskClaims.get("ari-ten"), 10);
  assert.deepEqual(battleTerritory(tasks, "2026-08-07").claimedByDomain, territory.claimedByDomain);
});

test("open enemies occupy unique dark tiles just outside captured territory", () => {
  const tasks = [quest("ari-win", 10, true, "body"), quest("ari-foe", 12, false, "body"), quest("pax-foe", 4, false, "life")];
  const territory = battleTerritory(tasks, "2026-08-07");
  const placements = battleEnemyPlacements(tasks, territory, "2026-08-07");
  const ari = placements.get("ari-foe");
  const pax = placements.get("pax-foe");
  assert.ok(ari && pax);
  assert.notEqual(arenaKey(ari), arenaKey(pax));
  assert.equal(territory.claims.has(arenaKey(ari)), false);
  assert.ok(ARENA_TILES.some((tile) => arenaKey(tile) === arenaKey(ari)));
  const position = arenaPosition(ari, "2026-08-07");
  assert.ok(position.centerX > 0 && position.centerX < 100);
  assert.ok(position.centerY > 0 && position.centerY < 100);
});

test("the projected square map is rectangular and its terrain is seeded by date", () => {
  assert.equal(ARENA_TILES.length, 117);
  assert.ok(ARENA_TILES.every((tile) => Number.isInteger(tile.column) && Number.isInteger(tile.row)));
  const firstDay = ARENA_TILES.map((tile) => battleTerrain(tile, "2026-08-07"));
  const secondDay = ARENA_TILES.map((tile) => battleTerrain(tile, "2026-08-08"));
  assert.notDeepEqual(firstDay, secondDay);
  assert.ok(firstDay.every((terrain) => TERRAIN_VARIANTS.includes(terrain.variant) && terrain.roll < TERRAIN_ROLLS));
  // Open ground should dominate, or the field turns into wall-to-wall set pieces.
  assert.ok(firstDay.filter((terrain) => terrain.variant === "plain").length > ARENA_TILES.length / 3);
});

test("elevation stays inside the range the tile art was rendered for", () => {
  const dates = Array.from({ length: 60 }, (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`);
  for (const date of dates) {
    for (const tile of ARENA_TILES) {
      assert.ok((ARENA_ELEVATIONS as readonly number[]).includes(battleElevation(tile, date)));
    }
  }
});

// Guards the coupling between lib/battle.ts and scripts/render-tiles.mjs: a new variant, roll or
// elevation without a re-render would leave the board showing empty tiles.
test("every tile the board can ask for has rendered pixel art on disk", () => {
  const missing: string[] = [];
  for (const theme of ARENA_THEMES) {
    for (const variant of TERRAIN_VARIANTS) {
      for (let roll = 0; roll < TERRAIN_ROLLS; roll += 1) {
        for (const elevation of ARENA_ELEVATIONS) {
          const sprite = tileSpritePath(theme, { variant, roll }, elevation);
          if (!existsSync(new URL(`../public${sprite}`, import.meta.url))) missing.push(sprite);
        }
      }
    }
  }
  assert.deepEqual(missing, []);
});

const DOMAIN_LIST: Domain[] = ["work", "gourmet", "body", "finance", "life"];
const DATES = Array.from({ length: 40 }, (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`);

test("a day raises one or two whole territories, never scattered squares", () => {
  const counts = new Set<number>();
  for (const date of DATES) {
    const raised = DOMAIN_LIST.filter((domain) => battleElevation(HERO_TILE[domain], date) > 0);
    counts.add(raised.length);
    // Every tile in a territory sits at exactly the height of that territory's hero.
    for (const tile of ARENA_TILES) {
      assert.equal(battleElevation(tile, date), battleElevation(HERO_TILE[battleZone(tile)], date));
    }
  }
  assert.deepEqual([...counts].sort(), [1, 2]);
});

test("each hero owns a contiguous plateau that its own quests fall onto", () => {
  for (const domain of DOMAIN_LIST) {
    assert.equal(battleZone(HERO_TILE[domain]), domain, `${domain} must stand in its own zone`);
  }
  // A raised territory has to be worth climbing, and every domain gets a turn across a season.
  const lifted = new Set(DATES.flatMap((date) => DOMAIN_LIST.filter((domain) => battleElevation(HERO_TILE[domain], date) > 0)));
  assert.deepEqual([...lifted].sort(), [...DOMAIN_LIST].sort());
  const heights = new Set(DATES.map((date) => Math.max(...DOMAIN_LIST.map((domain) => battleElevation(HERO_TILE[domain], date)))));
  assert.ok([...heights].every((height) => height >= 2 && height <= 3));
});

test("a quest's enemy lands on the same plateau as the hero it threatens", () => {
  const tasks = DOMAIN_LIST.flatMap((domain) => [quest(`${domain}-done`, 6, true, domain), quest(`${domain}-open`, 7, false, domain)]);
  for (const date of DATES.slice(0, 12)) {
    const placements = battleEnemyPlacements(tasks, battleTerritory(tasks, date), date);
    for (const domain of DOMAIN_LIST) {
      const placement = placements.get(`${domain}-open`);
      assert.ok(placement);
      assert.equal(battleElevation(placement, date), battleElevation(HERO_TILE[domain], date), `${domain} on ${date}`);
    }
  }
});
