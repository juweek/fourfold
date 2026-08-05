import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { getSettings } from "@/lib/today";
import { nowHHMMInTz, todayInTz } from "@/lib/time";
import type { Contact } from "@/lib/types";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [{ data: contact, error }, settings] = await Promise.all([
      db().from("contacts").select("*").eq("id", id).single(),
      getSettings(),
    ]);
    assertNoError(error);
    const item = contact as unknown as Contact;
    const today = todayInTz(settings.timezone);
    const { data, error: insertError } = await db().from("tasks").insert({
      title: `Reach out to ${item.name}`,
      domain: item.domain,
      difficulty: "easy",
      importance: "medium",
      points: 2,
      task_date: today,
      is_bonus: nowHHMMInTz(settings.timezone) > settings.send_time.slice(0, 5),
      contact_id: item.id,
    }).select("*").single();
    assertNoError(insertError);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
