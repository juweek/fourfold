import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getTodayData } from "@/lib/today";

export async function GET() {
  try {
    return NextResponse.json(await getTodayData());
  } catch (error) {
    return apiError(error);
  }
}
