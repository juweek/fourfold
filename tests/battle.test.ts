import assert from "node:assert/strict";
import test from "node:test";
import { ARENA_TILES, arenaKey, arenaPosition, battleAtmosphere, battleEnemyPlacements, battleProgress, battleTerrain, battleTerritory, enemyTier } from "../lib/battle.ts";
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
});
