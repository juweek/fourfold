import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { getSettings } from "@/lib/today";

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = {
      recipient_email: body.recipient_email,
      send_time: body.send_time,
      timezone: body.timezone,
      auto_send: Boolean(body.auto_send),
    };
    const { data, error } = await db().from("settings").update(updates).eq("id", 1).select("*").single();
    assertNoError(error);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
