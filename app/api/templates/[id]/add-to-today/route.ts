import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { taskPoints } from "@/lib/scoring";
import { getSettings } from "@/lib/today";
import { nowHHMMInTz, todayInTz } from "@/lib/time";
import type { Template } from "@/lib/types";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [{ data: template, error }, settings] = await Promise.all([
      db().from("templates").select("*").eq("id", id).single(),
      getSettings(),
    ]);
    assertNoError(error);
    const item = template as unknown as Template;
    const today = todayInTz(settings.timezone);
    const { data, error: insertError } = await db().from("tasks").insert({
      title: item.title,
      domain: item.domain,
      difficulty: item.difficulty,
      importance: item.importance,
      points: taskPoints(item.difficulty, item.importance),
      task_date: today,
      original_task_date: today,
      is_bonus: nowHHMMInTz(settings.timezone) > settings.send_time.slice(0, 5),
      template_id: item.id,
    }).select("*").single();
    assertNoError(insertError);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
