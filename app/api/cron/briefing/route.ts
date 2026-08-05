import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { sendBriefing } from "@/lib/briefing";
import { assertNoError, db } from "@/lib/db";
import { getSettings } from "@/lib/today";
import { nowHHMMInTz, todayInTz } from "@/lib/time";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getSettings();
    const today = todayInTz(settings.timezone);
    if (!settings.auto_send || settings.last_sent_date === today || nowHHMMInTz(settings.timezone) < settings.send_time.slice(0, 5)) {
      return new NextResponse(null, { status: 204 });
    }
    const result = await sendBriefing({ scheduled: true });
    const { error } = await db().from("settings").update({ last_sent_date: today }).eq("id", 1);
    assertNoError(error);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
