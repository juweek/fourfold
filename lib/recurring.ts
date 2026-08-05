import { taskPoints } from "./scoring";
import { assertNoError, db } from "./db";
import type { Template } from "./types";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function recurrenceMatches(recurrence: string, date: string) {
  if (recurrence === "daily") return true;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (recurrence === "weekdays") return day >= 1 && day <= 5;
  return recurrence === DAY_NAMES[day];
}

export async function materializeRecurring(date: string) {
  const { data: templates, error } = await db().from("templates").select("*").neq("recurrence", "none");
  assertNoError(error);
  const matches = ((templates ?? []) as Template[]).filter((template) => recurrenceMatches(template.recurrence, date));
  if (!matches.length) return;
  const { data: existing, error: existingError } = await db()
    .from("tasks")
    .select("template_id")
    .eq("task_date", date)
    .in("template_id", matches.map((item) => item.id));
  assertNoError(existingError);
  const existingIds = new Set((existing ?? []).map((item: { template_id: string }) => item.template_id));
  const rows = matches.filter((item) => !existingIds.has(item.id)).map((template) => ({
    title: template.title,
    domain: template.domain,
    difficulty: template.difficulty,
    importance: template.importance,
    points: taskPoints(template.difficulty, template.importance),
    task_date: date,
    is_bonus: false,
    template_id: template.id,
  }));
  if (rows.length) {
    const { error: insertError } = await db().from("tasks").insert(rows);
    assertNoError(insertError);
  }
}
