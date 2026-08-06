import { DOMAIN_META, DOMAINS } from "./domains";
import { assertNoError, db } from "./db";
import { levelFromXp, scoreTasks, tierFromLevel, xpToReachLevel } from "./scoring";
import { materializeRecurring } from "./recurring";
import { addDays, startOfWeek, todayInTz, weekOfSeason } from "./time";
import type { CreatureState, DomainProgress, Settings, Task } from "./types";

function creatureState(tasks: Pick<Task, "task_date">[], date: string, weekXp: number, paceXp: number): CreatureState {
  const completionDates = new Set(tasks.map((task) => task.task_date));
  const lastDate = [...completionDates].filter((item) => item <= date).sort().at(-1);
  const neglect = lastDate ? Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${lastDate}T12:00:00Z`)) / 86_400_000) : 9;
  let streak = 0;
  while (completionDates.has(addDays(date, -streak))) streak += 1;
  const momentum = weekXp / Math.max(1, paceXp);
  if (neglect >= 5) return "dormant";
  if (neglect >= 3) return "slipping";
  if (streak >= 7 && momentum >= 0.62) return "radiant";
  if (neglect >= 1) return "drifting";
  return "steady";
}

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
    const domainCompleted = completed.filter((task) => task.domain === domain);
    const xp = domainCompleted.reduce((sum, task) => sum + task.points * 10, 0);
    const level = levelFromXp(xp);
    const todayXp = domainCompleted.filter((task) => task.task_date === date).reduce((sum, task) => sum + task.points * 10, 0);
    const weekXp = domainCompleted.filter((task) => task.task_date >= weekStart && task.task_date <= date).reduce((sum, task) => sum + task.points * 10, 0);
    return {
      domain,
      state: creatureState(domainCompleted, date, weekXp, paceXp),
      xp,
      level,
      tier: tierFromLevel(level),
      levelStartXp: xpToReachLevel(level),
      nextLevelXp: level === 10 ? 9000 : xpToReachLevel(level + 1),
      todayXp,
      weekXp,
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
