import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import type { Contact } from "@/lib/types";

export async function GET() {
  try {
    const [{ data: contacts, error }, { data: tasks, error: taskError }] = await Promise.all([
      db().from("contacts").select("*").order("created_at"),
      db().from("tasks").select("contact_id,completed_at").not("contact_id", "is", null).not("completed_at", "is", null),
    ]);
    assertNoError(error);
    assertNoError(taskError);
    const result = ((contacts ?? []) as Contact[]).map((contact) => ({
      ...contact,
      last_reached: (tasks ?? []).filter((task: { contact_id: string }) => task.contact_id === contact.id).map((task: { completed_at: string }) => task.completed_at).sort().at(-1) ?? null,
    }));
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "A contact needs a name." }, { status: 400 });
    if (body.email && !/^\S+@\S+\.\S+$/.test(body.email.trim())) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    const { data, error } = await db().from("contacts").insert({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      note: body.note?.trim() || null,
      domain: body.domain ?? "work",
    }).select("*").single();
    assertNoError(error);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
