import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "ff_auth";

export function authToken(passcode = process.env.APP_PASSCODE ?? "") {
  return createHmac("sha256", passcode).update("fourfold-v1").digest("hex");
}

export function verifyPasscode(value: string) {
  const configured = process.env.APP_PASSCODE;
  if (!configured || value.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(configured));
}
