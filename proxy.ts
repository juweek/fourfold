import { NextRequest, NextResponse } from "next/server";

async function expectedToken(passcode: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("fourfold-v1"));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/auth/") || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }
  const passcode = process.env.APP_PASSCODE;
  const valid = passcode && request.cookies.get("ff_auth")?.value === (await expectedToken(passcode));
  if (valid) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|characters/|sprites/|og.png).*)"],
};
