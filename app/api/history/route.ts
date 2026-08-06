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
    const historyStart = [SEASON_START, addDays(today, -29)].sort()[0];
    const [{ data, error }, todayData] = await Promise.all([
      db().from("tasks").select("*").gte("task_date", historyStart).lte("task_date", today).order("task_date"),
      getTodayData(),
    ]);
    assertNoError(error);
    const tasks = (data ?? []) as Task[];
    const summarizeDay = (date: string) => {
      const dayTasks = tasks.filter((task) => task.task_date === date);
      const score = scoreTasks(dayTasks);
      const domains = Object.fromEntries(DOMAINS.map((domain) => {
        const domainTasks = dayTasks.filter((task) => task.domain === domain);
        return [domain, {
          score: scoreTasks(domainTasks).total,
          xp: domainTasks.filter((task) => task.completed_at).reduce((sum, task) => sum + task.points * 10, 0),
          completedTasks: domainTasks.filter((task) => task.completed_at).length,
        }];
      }));
      return { date, future: date > today, score: score.total, plannedPoints: score.plannedPoints, earnedPoints: score.earnedPlannedPoints + score.earnedBonusPoints, domains };
    };
    const totalDays = SEASON_WEEKS * 7;
    const days = Array.from({ length: totalDays }, (_, index) => summarizeDay(addDays(SEASON_START, index)));
    const recentDays = Array.from({ length: 30 }, (_, index) => summarizeDay(addDays(today, index - 29)));
    const weekly = Array.from({ length: SEASON_WEEKS }, (_, index) => {
      const weekDays = days.slice(index * 7, index * 7 + 7).filter((day) => !day.future);
      const average = (values: (number | null)[]) => {
        const present = values.filter((value): value is number => value !== null);
        return present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
      };
      const domainScores = Object.fromEntries(DOMAINS.map((domain) => [domain, average(weekDays.map((day) => (day.domains as unknown as Record<Domain, { score: number | null }>)[domain].score))]));
      return { week: index + 1, party: average(weekDays.map((day) => day.score)), ...domainScores };
    });
    const monthKeys: string[] = [];
    const monthCursor = new Date(`${SEASON_START.slice(0, 7)}-01T12:00:00Z`);
    const finalMonth = today.slice(0, 7);
    while (monthCursor.toISOString().slice(0, 7) <= finalMonth) {
      monthKeys.push(monthCursor.toISOString().slice(0, 7));
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
    }
    const months = monthKeys.map((month) => {
      const monthTasks = tasks.filter((task) => task.task_date.startsWith(month) && task.completed_at);
      const domains = Object.fromEntries(DOMAINS.map((domain) => [domain, monthTasks.filter((task) => task.domain === domain).length]));
      return { month, completedTasks: monthTasks.length, domains };
    });
    return NextResponse.json({ days, recentDays, months, weekly, progress: todayData.progress, today });
  } catch (error) {
    return apiError(error);
  }
}
