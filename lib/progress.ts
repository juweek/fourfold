import type { CreatureState } from "./types";

export const WEEKLY_PACE_XP = 350;

export function dailyPaceXp(weeklyPaceXp = WEEKLY_PACE_XP) {
  return weeklyPaceXp / 7;
}

export function dailyCreatureState(todayXp: number, weeklyPaceXp = WEEKLY_PACE_XP): CreatureState {
  const target = dailyPaceXp(weeklyPaceXp);

  if (todayXp <= -target / 2) return "dormant";
  if (todayXp < 0) return "slipping";
  if (todayXp === 0) return "resting";
  if (todayXp < target) return "drifting";
  if (todayXp < target * 1.5) return "steady";
  return "radiant";
}

export function dailyXpPercent(todayXp: number, weeklyPaceXp = WEEKLY_PACE_XP) {
  return Math.max(0, Math.min(100, (todayXp / dailyPaceXp(weeklyPaceXp)) * 100));
}

export function weeklyXpPercent(weekXp: number, paceXp: number) {
  return Math.max(0, Math.min(100, (weekXp / Math.max(1, paceXp)) * 100));
}
