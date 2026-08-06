import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "A contact needs a name." }, { status: 400 });
    if (body.email && !/^\S+@\S+\.\S+$/.test(body.email.trim())) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
    const { data, error } = await db().from("contacts").update({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      note: body.note?.trim() || null,
      domain: body.domain,
    }).eq("id", id).select("*").single();
    assertNoError(error);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await db().from("contacts").delete().eq("id", id);
    assertNoError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
