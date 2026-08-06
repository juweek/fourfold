import type { Domain } from "@/lib/types";

export function MotifGlyph({ domain, size = 16 }: { domain: Domain; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true };
  if (domain === "work") {
    return (
      <svg {...common}><path d="M2.5 11.5 6 4l4 6 3.5-6" stroke="currentColor" strokeWidth="1"/><circle cx="2.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="6" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="13.5" cy="4" r="1.5" fill="currentColor"/></svg>
    );
  }
  if (domain === "gourmet") {
    return (
      <svg {...common}><circle cx="8" cy="8" r="5.4" stroke="currentColor"/><path d="M8 1.4v3M14.6 8h-3M8 14.6v-3M1.4 8h3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/></svg>
    );
  }
  if (domain === "body") {
    return (
      <svg {...common}><path d="m1.5 13 4.1-7 2.2 3.1L10.5 3l4 10h-13Z" fill="currentColor"/><path d="m8.1 8.4 2.3-4.9 1.2 3.1" stroke="#12141A" strokeWidth="1" opacity=".55"/></svg>
    );
  }
  if (domain === "life") {
    return (
      <svg {...common}><path d="M8 13.2S2.2 9.6 2.2 5.8c0-2.5 3.2-3.5 5.8-.6 2.6-2.9 5.8-1.9 5.8.6 0 3.8-5.8 7.4-5.8 7.4Z" fill="currentColor"/><path d="m8 1 .6 1.5L10 3l-1.4.5L8 5l-.6-1.5L6 3l1.4-.5L8 1Z" fill="#12141A" opacity=".55"/></svg>
    );
  }
  return (
    <svg {...common}><path d="M2 12.5h12M3.5 11l3-3 2.2 1.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 4h3v3" stroke="currentColor" strokeWidth="1.5"/></svg>
  );
}
