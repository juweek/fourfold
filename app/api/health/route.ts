import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const start = Date.now();
    const result = await db().from("settings").select("id").eq("id", 1).single();
    const duration = Date.now() - start;
    
    if (result.error) {
      const errorMsg = result.error.message;
      console.error("Health check failed:", errorMsg);
      return NextResponse.json(
        { 
          status: "error", 
          database: "unreachable",
          error: errorMsg,
          responseTime: duration
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json({
      status: "ok",
      database: "connected",
      responseTime: duration
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check exception:", errorMsg);
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        error: errorMsg
      },
      { status: 503 }
    );
  }
}
