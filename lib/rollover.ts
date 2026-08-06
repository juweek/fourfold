import { assertNoError, db } from "./db";
import type { Task } from "./types";

type RolloverCandidate = Task & { templates: { recurrence: string } | null };

function daysBetween(from: string, to: string) {
  return Math.max(0, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000));
}

export async function rolloverOpenTasks(date: string) {
  const { data, error } = await db()
    .from("tasks")
    .select("*,templates(recurrence)")
    .lt("task_date", date)
    .is("completed_at", null);
  assertNoError(error);

  const candidates = ((data ?? []) as unknown as RolloverCandidate[]).filter((task) => task.templates?.recurrence !== "daily");
  await Promise.all(candidates.map(async (task) => {
    const originalDate = task.original_task_date || task.task_date;
    const overdueDays = daysBetween(originalDate, date);
    const { error: updateError } = await db().from("tasks").update({
      task_date: date,
      original_task_date: originalDate,
      rollover_count: overdueDays,
      is_bonus: false,
    }).eq("id", task.id).is("completed_at", null);
    assertNoError(updateError);
  }));
  return candidates.length;
}

export async function archiveCompletedTasks(date: string) {
  const threshold = new Date(`${date}T00:00:00Z`);
  threshold.setUTCDate(threshold.getUTCDate() - 3);
  const { error } = await db().from("tasks").update({ archived_at: new Date().toISOString() })
    .not("completed_at", "is", null)
    .lt("completed_at", threshold.toISOString())
    .is("archived_at", null);
  assertNoError(error);
}
