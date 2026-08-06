import { DOMAIN_META, DOMAINS } from "./domains";
import { assertNoError, db } from "./db";
import { domainXpForDate, levelFromXp, scoreTasks, tierFromLevel, xpToReachLevel } from "./scoring";
import { materializeRecurring } from "./recurring";
import { archiveCompletedTasks, rolloverOpenTasks } from "./rollover";
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
  await Promise.all([rolloverOpenTasks(date), archiveCompletedTasks(date)]);
  await materializeRecurring(date);
  const [todayResult, allTasksResult] = await Promise.all([
    db().from("tasks").select("*").eq("task_date", date).order("created_at", { ascending: true }),
    db().from("tasks").select("domain,points,completed_at,task_date,original_task_date,rollover_count"),
  ]);
  assertNoError(todayResult.error);
  assertNoError(allTasksResult.error);
  const tasks = (todayResult.data ?? []) as Task[];
  const allTasks = (allTasksResult.data ?? []) as Pick<Task, "domain" | "points" | "completed_at" | "task_date" | "original_task_date" | "rollover_count">[];
  const completed = allTasks.filter((task) => task.completed_at);
  const weekStart = startOfWeek(date);
  const paceXp = 350;
  const progress: DomainProgress[] = DOMAINS.map((domain) => {
    const domainCompleted = completed.filter((task) => task.domain === domain);
    const completionDates = [...new Set(domainCompleted.map((task) => task.task_date))];
    const xp = completionDates.reduce((sum, completionDate) => sum + domainXpForDate(allTasks, domain, completionDate).xp, 0);
    const level = levelFromXp(xp);
    const todayXp = domainXpForDate(allTasks, domain, date);
    const weekXp = completionDates.filter((completionDate) => completionDate >= weekStart && completionDate <= date)
      .reduce((sum, completionDate) => sum + domainXpForDate(allTasks, domain, completionDate).xp, 0);
    return {
      domain,
      state: todayXp.grossXp === 0 ? "resting" : creatureState(domainCompleted, date, weekXp, paceXp),
      xp,
      level,
      tier: tierFromLevel(level),
      levelStartXp: xpToReachLevel(level),
      nextLevelXp: level === 10 ? 9000 : xpToReachLevel(level + 1),
      todayXp: todayXp.xp,
      todayGrossXp: todayXp.grossXp,
      todayPenaltyPercent: todayXp.penaltyPercent,
      overdueQuests: todayXp.overdueQuests,
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
