import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { taskPoints } from "@/lib/scoring";
import type { Difficulty, Importance } from "@/lib/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of ["title", "domain", "difficulty", "importance", "task_date"] as const) {
      if (body[field] !== undefined) updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
    if (body.complete !== undefined) updates.completed_at = body.complete ? new Date().toISOString() : null;
    if (body.difficulty || body.importance) {
      const { data: current, error: currentError } = await db().from("tasks").select("difficulty,importance").eq("id", id).single();
      assertNoError(currentError);
      updates.points = taskPoints((body.difficulty ?? current.difficulty) as Difficulty, (body.importance ?? current.importance) as Importance);
    }
    const { data, error } = await db().from("tasks").update(updates).eq("id", id).select("*").single();
    assertNoError(error);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await db().from("tasks").delete().eq("id", id);
    assertNoError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
