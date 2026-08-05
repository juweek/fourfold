import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { DOMAINS, SEASON_START, SEASON_WEEKS } from "@/lib/domains";
import { assertNoError, db } from "@/lib/db";
import { scoreTasks } from "@/lib/scoring";
import { getSettings, getTodayData } from "@/lib/today";
import { addDays, todayInTz } from "@/lib/time";
import type { Domain, Task } from "@/lib/types";

export async function GET() {
  try {
    const settings = await getSettings();
    const today = todayInTz(settings.timezone);
    const [{ data, error }, todayData] = await Promise.all([
      db().from("tasks").select("*").gte("task_date", SEASON_START).lte("task_date", today).order("task_date"),
      getTodayData(),
    ]);
    assertNoError(error);
    const tasks = (data ?? []) as Task[];
    const totalDays = SEASON_WEEKS * 7;
    const days = Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(SEASON_START, index);
      const dayTasks = tasks.filter((task) => task.task_date === date);
      const score = scoreTasks(dayTasks);
      const domains = Object.fromEntries(DOMAINS.map((domain) => {
        const domainTasks = dayTasks.filter((task) => task.domain === domain);
        return [domain, {
          score: scoreTasks(domainTasks).total,
          xp: domainTasks.filter((task) => task.completed_at).reduce((sum, task) => sum + task.points * 10, 0),
        }];
      }));
      return { date, future: date > today, score: score.total, plannedPoints: score.plannedPoints, earnedPoints: score.earnedPlannedPoints + score.earnedBonusPoints, domains };
    });
    const weekly = Array.from({ length: SEASON_WEEKS }, (_, index) => {
      const weekDays = days.slice(index * 7, index * 7 + 7).filter((day) => !day.future);
      const average = (values: (number | null)[]) => {
        const present = values.filter((value): value is number => value !== null);
        return present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
      };
      const domainScores = Object.fromEntries(DOMAINS.map((domain) => [domain, average(weekDays.map((day) => (day.domains as unknown as Record<Domain, { score: number | null }>)[domain].score))]));
      return { week: index + 1, party: average(weekDays.map((day) => day.score)), ...domainScores };
    });
    return NextResponse.json({ days, weekly, progress: todayData.progress, today });
  } catch (error) {
    return apiError(error);
  }
}
