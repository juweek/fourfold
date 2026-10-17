import { DOMAIN_META, DOMAINS } from "./domains";
import { assertNoError, db } from "./db";
import { dailyCreatureState, WEEKLY_PACE_XP } from "./progress";
import { domainXpForDate, levelFromXp, rolloverPenaltyPoints, scoreTasks, tierFromLevel, xpToReachLevel } from "./scoring";
import { materializeRecurring } from "./recurring";
import { archiveCompletedTasks, rolloverOpenTasks } from "./rollover";
import { addDays, startOfWeek, todayInTz, weekOfSeason } from "./time";
import type { DomainProgress, Settings, Task } from "./types";
import { withTimeout } from "./fetch-utils";

export async function getSettings() {
  try {
    const result: any = await withTimeout(
      db().from("settings").select("*").eq("id", 1).single(),
      8000,
      "Database query timeout while fetching settings"
    );
    assertNoError(result.error);
    return result.data as unknown as Settings;
  } catch (error) {
    console.error("getSettings error:", error);
    throw new Error("Failed to fetch settings from database. Check DATABASE_URL and Supabase connection.");
  }
}

export async function getTodayData() {
  const settings = await getSettings();
  const date = todayInTz(settings.timezone);
  
  try {
    await withTimeout(
      Promise.all([rolloverOpenTasks(date), archiveCompletedTasks(date)]),
      10000,
      "Timeout during rollover operations"
    );
    
    await withTimeout(
      materializeRecurring(date),
      8000,
      "Timeout during recurring task materialization"
    );
    
    const [todayResult, allTasksResult] = await withTimeout(
      Promise.all([
        db().from("tasks").select("*").eq("task_date", date).order("created_at", { ascending: true }),
        db().from("tasks").select("domain,points,completed_at,task_date,original_task_date,rollover_count"),
      ]),
      10000,
      "Timeout while fetching tasks from database"
    );
    
    assertNoError(todayResult.error);
    assertNoError(allTasksResult.error);
    const tasks = (todayResult.data ?? []) as Task[];
    const allTasks = (allTasksResult.data ?? []) as Pick<Task, "domain" | "points" | "completed_at" | "task_date" | "original_task_date" | "rollover_count">[];
    const completed = allTasks.filter((task) => task.completed_at);
    const weekStart = startOfWeek(date);
    const paceXp = WEEKLY_PACE_XP;
    const progress: DomainProgress[] = DOMAINS.map((domain) => {
      const domainCompleted = completed.filter((task) => task.domain === domain);
      const grossXp = domainCompleted.reduce((sum, task) => sum + task.points * 10, 0);
      const penaltyXp = allTasks.filter((task) => task.domain === domain)
        .reduce((sum, task) => sum + rolloverPenaltyPoints(task.points, task.rollover_count) * 10, 0);
      const xp = Math.max(0, Number((grossXp - penaltyXp).toFixed(2)));
      const level = levelFromXp(xp);
      const todayXp = domainXpForDate(allTasks, domain, date);
      const weekDates: string[] = [];
      for (let cursor = weekStart; cursor <= date; cursor = addDays(cursor, 1)) weekDates.push(cursor);
      const weekXp = weekDates.reduce((sum, day) => sum + domainXpForDate(allTasks, domain, day).xp, 0);
      return {
        domain,
        state: dailyCreatureState(todayXp.xp, paceXp),
        xp,
        level,
        tier: tierFromLevel(level),
        levelStartXp: xpToReachLevel(level),
        nextLevelXp: level === 10 ? 9000 : xpToReachLevel(level + 1),
        todayXp: todayXp.xp,
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
  } catch (error) {
    console.error("getTodayData error:", error);
    throw new Error("Failed to load today's data. Database connection issue or timeout.");
  }
}
