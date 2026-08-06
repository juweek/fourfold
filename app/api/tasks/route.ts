import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { taskPoints } from "@/lib/scoring";
import { getSettings } from "@/lib/today";
import { nowHHMMInTz, todayInTz } from "@/lib/time";
import type { Difficulty, Domain, Importance } from "@/lib/types";

const domains = new Set(["work", "gourmet", "body", "finance", "life"]);
const difficulties = new Set(["easy", "medium", "hard"]);
const importances = new Set(["low", "medium", "high"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title?.trim() || !domains.has(body.domain) || !difficulties.has(body.difficulty) || !importances.has(body.importance)) {
      return NextResponse.json({ error: "Please complete every task field." }, { status: 400 });
    }
    if (body.action_type !== undefined && body.action_type !== null && body.action_type !== "reach") {
      return NextResponse.json({ error: "That quest action is not supported." }, { status: 400 });
    }
    const settings = await getSettings();
    const today = todayInTz(settings.timezone);
    const taskDate = body.task_date || today;
    const isBonus = taskDate === today && nowHHMMInTz(settings.timezone) > settings.send_time.slice(0, 5);
    const difficulty = body.difficulty as Difficulty;
    const importance = body.importance as Importance;
    const { data, error } = await db().from("tasks").insert({
      title: body.title.trim(),
      domain: body.domain as Domain,
      difficulty,
      importance,
      points: taskPoints(difficulty, importance),
      task_date: taskDate,
      original_task_date: taskDate,
      is_bonus: isBonus,
      action_type: body.action_type === "reach" ? "reach" : null,
    }).select("*").single();
    assertNoError(error);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
