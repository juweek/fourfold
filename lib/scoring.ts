import { DIFFICULTY_POINTS, DOMAINS, IMPORTANCE_MULTIPLIER } from "./domains.ts";
import { daysBetween } from "./time.ts";
import type { Difficulty, Domain, Importance, Score, Task } from "./types.ts";

export function taskPoints(difficulty: Difficulty, importance: Importance) {
  return DIFFICULTY_POINTS[difficulty] * IMPORTANCE_MULTIPLIER[importance];
}

type XpTask = Pick<Task, "domain" | "points" | "completed_at" | "task_date" | "original_task_date" | "rollover_count">;

export function rolloverPenaltyPoints(taskPoints: number, overdueDays: number) {
  const penaltyDays = Math.max(0, Math.floor(overdueDays) - 1);
  return Number((taskPoints * 0.2 * penaltyDays).toFixed(2));
}

export function taskHasRolloverPenaltyOnDate(task: XpTask, date: string) {
  const overdueDays = daysBetween(task.original_task_date, date);
  if (task.rollover_count < 2 || overdueDays < 2 || task.task_date < date) return false;
  return overdueDays <= task.rollover_count;
}

export function domainXpForDate(tasks: XpTask[], domain: Domain, date: string) {
  const completed = tasks.filter((task) => task.domain === domain && task.completed_at && task.task_date === date);
  const grossXp = completed.reduce((sum, task) => sum + task.points * 10, 0);
  const penalized = tasks.filter((task) => task.domain === domain && taskHasRolloverPenaltyOnDate(task, date));
  const penaltyXp = Number((penalized.reduce((sum, task) => sum + task.points * 0.2, 0) * 10).toFixed(2));
  return { xp: Number((grossXp - penaltyXp).toFixed(2)), grossXp, penaltyXp };
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

type CompletedPointTask = Pick<Task, "domain" | "points" | "completed_at">;

function completedValuesByDomain(tasks: CompletedPointTask[], multiplier: number) {
  const totals = Object.fromEntries(DOMAINS.map((domain) => [domain, 0])) as Record<Domain, number>;
  for (const task of tasks) {
    if (task.completed_at) totals[task.domain] += task.points * multiplier;
  }
  return totals;
}

export function xpByDomain(tasks: CompletedPointTask[]) {
  return completedValuesByDomain(tasks, 10);
}

export function completedPointsByDomain(tasks: CompletedPointTask[]) {
  return completedValuesByDomain(tasks, 1);
}
