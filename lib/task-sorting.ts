import type { Difficulty, Importance, Task } from "./types";

export type QuestSort = "default" | "importance" | "date-newest" | "date-oldest" | "difficulty";

const importanceRank: Record<Importance, number> = { low: 1, medium: 2, high: 3 };
const difficultyRank: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

function compareCreatedAt(a: Task, b: Task, newestFirst = false) {
  const result = a.created_at.localeCompare(b.created_at);
  return newestFirst ? -result : result;
}

function compareWithinGroup(a: Task, b: Task, sort: QuestSort) {
  if (sort === "importance") return importanceRank[b.importance] - importanceRank[a.importance] || compareCreatedAt(a, b);
  if (sort === "difficulty") return difficultyRank[b.difficulty] - difficultyRank[a.difficulty] || compareCreatedAt(a, b);
  return compareCreatedAt(a, b, sort === "date-newest");
}

export function sortQuests(tasks: Task[], sort: QuestSort) {
  return tasks.slice().sort((a, b) => (
    Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at))
    || Number(a.is_bonus) - Number(b.is_bonus)
    || compareWithinGroup(a, b, sort)
  ));
}
