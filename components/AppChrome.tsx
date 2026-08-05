"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <><Navigation />{children}</>;
}
