import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";

export async function GET() {
  try {
    const { data, error } = await db().from("templates").select("*").order("created_at");
    assertNoError(error);
    return NextResponse.json(data ?? []);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: "A template needs a title." }, { status: 400 });
    const { data, error } = await db().from("templates").insert({
      title: body.title.trim(),
      domain: body.domain,
      difficulty: body.difficulty,
      importance: body.importance,
      recurrence: body.recurrence ?? "none",
    }).select("*").single();
    assertNoError(error);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
