import { DIFFICULTY_POINTS, IMPORTANCE_MULTIPLIER } from "./domains.ts";
import type { Difficulty, Domain, Importance, Score, Task } from "./types.ts";

export function taskPoints(difficulty: Difficulty, importance: Importance) {
  return DIFFICULTY_POINTS[difficulty] * IMPORTANCE_MULTIPLIER[importance];
}

export function scoreTasks(tasks: Pick<Task, "points" | "is_bonus" | "completed_at">[]): Score {
  const planned = tasks.filter((task) => !task.is_bonus);
  const plannedPoints = planned.reduce((sum, task) => sum + task.points, 0);
  const earnedPlannedPoints = planned
    .filter((task) => task.completed_at)
    .reduce((sum, task) => sum + task.points, 0);
  const earnedBonusPoints = tasks
    .filter((task) => task.is_bonus && task.completed_at)
    .reduce((sum, task) => sum + task.points, 0);

  if (plannedPoints === 0) {
    return {
      plannedPoints,
      earnedPlannedPoints,
      earnedBonusPoints,
      base: earnedBonusPoints > 0 ? 100 : 0,
      bonus: 0,
      total: earnedBonusPoints > 0 ? 100 : null,
    };
  }

  const base = Math.min(100, (100 * earnedPlannedPoints) / plannedPoints);
  const bonus = Math.min(10, (100 * earnedBonusPoints) / plannedPoints);
  return {
    plannedPoints,
    earnedPlannedPoints,
    earnedBonusPoints,
    base,
    bonus,
    total: Math.round(base + bonus),
  };
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (level < 10 && xp >= xpToReachLevel(level + 1)) level += 1;
  return level;
}

export function xpToReachLevel(level: number) {
  return 100 * level * (level - 1);
}

export function tierFromLevel(level: number): 1 | 2 | 3 {
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  return 1;
}

export function xpByDomain(tasks: Pick<Task, "domain" | "points" | "completed_at">[]) {
  return tasks.reduce<Record<Domain, number>>(
    (totals, task) => {
      if (task.completed_at) totals[task.domain] += task.points * 10;
      return totals;
    },
    { work: 0, gourmet: 0, body: 0, finance: 0, life: 0 },
  );
}
