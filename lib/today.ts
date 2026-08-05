import { DOMAIN_META, DOMAINS } from "./domains";
import { assertNoError, db } from "./db";
import { levelFromXp, scoreTasks, tierFromLevel, xpToReachLevel } from "./scoring";
import { materializeRecurring } from "./recurring";
import { startOfWeek, todayInTz, weekOfSeason } from "./time";
import type { DomainProgress, Settings, Task } from "./types";

export async function getSettings() {
  const { data, error } = await db().from("settings").select("*").eq("id", 1).single();
  assertNoError(error);
  return data as unknown as Settings;
}

export async function getTodayData() {
  const settings = await getSettings();
  const date = todayInTz(settings.timezone);
  await materializeRecurring(date);
  const [todayResult, completedResult] = await Promise.all([
    db().from("tasks").select("*").eq("task_date", date).order("created_at", { ascending: true }),
    db().from("tasks").select("domain,points,completed_at,task_date").not("completed_at", "is", null),
  ]);
  assertNoError(todayResult.error);
  assertNoError(completedResult.error);
  const tasks = (todayResult.data ?? []) as Task[];
  const completed = (completedResult.data ?? []) as Pick<Task, "domain" | "points" | "completed_at" | "task_date">[];
  const weekStart = startOfWeek(date);
  const paceXp = 350;
  const progress: DomainProgress[] = DOMAINS.map((domain) => {
    const xp = completed.filter((task) => task.domain === domain).reduce((sum, task) => sum + task.points * 10, 0);
    const level = levelFromXp(xp);
    return {
      domain,
      xp,
      level,
      tier: tierFromLevel(level),
      levelStartXp: xpToReachLevel(level),
      nextLevelXp: level === 10 ? 9000 : xpToReachLevel(level + 1),
      todayXp: completed.filter((task) => task.domain === domain && task.task_date === date).reduce((sum, task) => sum + task.points * 10, 0),
      weekXp: completed.filter((task) => task.domain === domain && task.task_date >= weekStart && task.task_date <= date).reduce((sum, task) => sum + task.points * 10, 0),
      paceXp,
    };
  });
  return {
    date,
    week: weekOfSeason(date),
    settings,
    tasks,
    score: scoreTasks(tasks),
    progress,
    seasonProgress: Math.min(100, progress.reduce((sum, item) => sum + item.xp, 0) / 360),
    party: DOMAINS.map((domain) => ({ domain, ...DOMAIN_META[domain] })),
  };
}
