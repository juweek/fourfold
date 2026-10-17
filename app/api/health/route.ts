import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const start = Date.now();
    const result = await db().from("settings").select("id").eq("id", 1).single();
    const duration = Date.now() - start;
    
    if (result.error) {
      console.error("Health check failed:", result.error.message);
      return NextResponse.json(
        { 
          status: "error", 
          database: "unreachable",
          error: "db_query_failed",
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
    console.error("Health check exception:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        error: "db_connection_failed"
      },
      { status: 503 }
    );
  }
}
