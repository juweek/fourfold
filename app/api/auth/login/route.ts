import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authToken, verifyPasscode } from "@/lib/auth";
import { apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();
    if (typeof passcode !== "string" || !verifyPasscode(passcode)) {
      return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, authToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
