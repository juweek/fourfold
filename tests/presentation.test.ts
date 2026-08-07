import assert from "node:assert/strict";
import test from "node:test";
import { dailyCreatureState, dailyXpPercent } from "../lib/progress.ts";
import { sortQuests } from "../lib/task-sorting.ts";
import type { Task } from "../lib/types.ts";

function quest(overrides: Partial<Task> & Pick<Task, "id">): Task {
  const { id, ...rest } = overrides;
  return {
    id,
    title: id,
    domain: "work",
    difficulty: "medium",
    importance: "medium",
    points: 4,
    task_date: "2026-08-07",
    original_task_date: "2026-08-07",
    rollover_count: 0,
    is_bonus: false,
    completed_at: null,
    archived_at: null,
    action_type: null,
    created_at: "2026-08-07T12:00:00Z",
    ...rest,
  };
}

test("daily creature state follows net XP and lets a deficit override completed work", () => {
  assert.equal(dailyCreatureState(-30), "dormant");
  assert.equal(dailyCreatureState(-1), "slipping");
  assert.equal(dailyCreatureState(0), "resting");
  assert.equal(dailyCreatureState(10), "drifting");
  assert.equal(dailyCreatureState(50), "steady");
  assert.equal(dailyCreatureState(75), "radiant");
  assert.equal(dailyXpPercent(-10), 0);
  assert.equal(dailyXpPercent(50), 100);
});

test("quest sorts preserve open and bonus groups while ranking their contents", () => {
  const tasks = [
    quest({ id: "old-low", importance: "low", created_at: "2026-08-07T10:00:00Z" }),
    quest({ id: "new-high", importance: "high", difficulty: "hard", created_at: "2026-08-07T14:00:00Z" }),
    quest({ id: "bonus", importance: "high", is_bonus: true, created_at: "2026-08-07T15:00:00Z" }),
    quest({ id: "done", importance: "high", completed_at: "2026-08-07T16:00:00Z", created_at: "2026-08-07T09:00:00Z" }),
  ];

  assert.deepEqual(sortQuests(tasks, "importance").map((task) => task.id), ["new-high", "old-low", "bonus", "done"]);
  assert.deepEqual(sortQuests(tasks, "date-newest").map((task) => task.id), ["new-high", "old-low", "bonus", "done"]);
  assert.deepEqual(tasks.map((task) => task.id), ["old-low", "new-high", "bonus", "done"]);
});
