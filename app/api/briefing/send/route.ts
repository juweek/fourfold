import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { sendBriefing } from "@/lib/briefing";

export async function POST() {
  try {
    return NextResponse.json(await sendBriefing());
  } catch (error) {
    return apiError(error);
  }
}
