import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import type { Task } from "@/lib/types";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await db().from("tasks").select("*").eq("id", id).single();
    assertNoError(error);
    const task = data as Task;
    const templateFields = {
      title: task.title,
      domain: task.domain,
      difficulty: task.difficulty,
      importance: task.importance,
      recurrence: "daily",
    };

    let templateId = task.template_id;
    if (templateId) {
      const { error: updateError } = await db().from("templates").update(templateFields).eq("id", templateId);
      assertNoError(updateError);
    } else {
      const { data: template, error: insertError } = await db().from("templates").insert(templateFields).select("id").single();
      assertNoError(insertError);
      templateId = template.id;
      const { error: linkError } = await db().from("tasks").update({ template_id: templateId }).eq("id", id);
      assertNoError(linkError);
    }

    return NextResponse.json({ ok: true, templateId });
  } catch (error) {
    return apiError(error);
  }
}
