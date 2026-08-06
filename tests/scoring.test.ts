import assert from "node:assert/strict";
import test from "node:test";
import { domainXpForDate, levelFromXp, rolloverPenaltyPoints, scoreTasks, taskPoints, tierFromLevel, xpByDomain } from "../lib/scoring.ts";

test("difficulty and importance calculate the exact points table", () => {
  assert.equal(taskPoints("easy", "low"), 1);
  assert.equal(taskPoints("medium", "high"), 6);
  assert.equal(taskPoints("hard", "high"), 12);
});

test("planned score and bonus match the specification", () => {
  const score = scoreTasks([
    { points: 12, is_bonus: false, completed_at: "now" },
    { points: 6, is_bonus: false, completed_at: "now" },
    { points: 4, is_bonus: false, completed_at: "now" },
    { points: 2, is_bonus: false, completed_at: null },
    { points: 2, is_bonus: true, completed_at: "now" },
  ]);
  assert.equal(score.total, 100);
  assert.equal(score.plannedPoints, 24);
});

test("bonus-only days score 100 and empty days have no score", () => {
  assert.equal(scoreTasks([{ points: 2, is_bonus: true, completed_at: "now" }]).total, 100);
  assert.equal(scoreTasks([]).total, null);
});

test("levels and visual tiers follow the XP curve", () => {
  assert.equal(levelFromXp(599), 2);
  assert.equal(levelFromXp(600), 3);
  assert.equal(levelFromXp(9000), 10);
  assert.equal(tierFromLevel(3), 1);
  assert.equal(tierFromLevel(4), 2);
  assert.equal(tierFromLevel(7), 3);
});

test("XP aggregation includes the Happy Life path", () => {
  const totals = xpByDomain([
    { domain: "life", points: 6, completed_at: "now" },
    { domain: "work", points: 4, completed_at: "now" },
    { domain: "life", points: 12, completed_at: null },
  ]);
  assert.deepEqual(totals, { work: 40, gourmet: 0, body: 0, finance: 0, life: 60 });
});

test("each overdue day deducts 20 percent of that quest's value", () => {
  assert.equal(rolloverPenaltyPoints(10, 1), 2);
  assert.equal(rolloverPenaltyPoints(10, 2), 4);
  const tasks = [
    { domain: "work" as const, points: 6, completed_at: null, task_date: "2026-08-06", original_task_date: "2026-08-05", rollover_count: 1 },
    { domain: "work" as const, points: 4, completed_at: "now", task_date: "2026-08-06", original_task_date: "2026-08-06", rollover_count: 0 },
  ];
  assert.deepEqual(domainXpForDate(tasks, "work", "2026-08-06"), { xp: 28, grossXp: 40, penaltyXp: 12 });
  assert.equal(tasks[0].points, 6);
});

test("a rolled quest grants its full reward while retaining its separate overdue deduction", () => {
  const tasks = [
    { domain: "life" as const, points: 6, completed_at: "now", task_date: "2026-08-06", original_task_date: "2026-08-05", rollover_count: 1 },
  ];
  assert.deepEqual(domainXpForDate(tasks, "life", "2026-08-06"), { xp: 48, grossXp: 60, penaltyXp: 12 });
});

test("daily quests do not create rollover deductions", () => {
  const tasks = [
    { domain: "body" as const, points: 2, completed_at: null, task_date: "2026-08-06", original_task_date: "2026-08-05", rollover_count: 0 },
    { domain: "body" as const, points: 4, completed_at: "now", task_date: "2026-08-06", original_task_date: "2026-08-06", rollover_count: 0 },
  ];
  assert.equal(domainXpForDate(tasks, "body", "2026-08-06").xp, 40);
});
