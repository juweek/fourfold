import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Domain } from "@/lib/types";

export type RadarValues = Record<Domain, number>;

function polar(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / DOMAINS.length;
  return [110 + Math.cos(angle) * radius, 110 + Math.sin(angle) * radius] as const;
}

function pointsAt(radius: number) {
  return DOMAINS.map((_, index) => polar(index, radius).join(",")).join(" ");
}

export function RadarChart({ values, label, compact = false, maxValue }: { values: RadarValues; label: string; compact?: boolean; maxValue?: number }) {
  const observedMax = Math.max(...DOMAINS.map((domain) => values[domain]));
  const max = Math.max(1, maxValue ?? observedMax);
  const radius = compact ? 67 : 72;
  const valuePoints = DOMAINS.map((domain, index) => polar(index, radius * values[domain] / max));
  const total = DOMAINS.reduce((sum, domain) => sum + values[domain], 0);

  return (
    <svg className={`radar ${compact ? "radar-compact" : ""}`} viewBox="0 0 220 220" role="img" aria-label={`${label}: ${total} completed point${total === 1 ? "" : "s"}`}>
      {[.25, .5, .75, 1].map((scale) => <polygon key={scale} points={pointsAt(radius * scale)} fill="none" stroke="rgba(233,226,208,.1)" />)}
      {DOMAINS.map((domain, index) => { const [x, y] = polar(index, radius); return <line key={domain} x1="110" y1="110" x2={x} y2={y} stroke="rgba(233,226,208,.07)" />; })}
      <polygon points={valuePoints.map((point) => point.join(",")).join(" ")} fill="rgba(217,164,65,.18)" stroke="#D9A441" strokeWidth="2" />
      {valuePoints.map(([x, y], index) => <circle key={DOMAINS[index]} cx={x} cy={y} r={compact ? 2.5 : 3.5} fill={DOMAIN_META[DOMAINS[index]].color} />)}
      {!compact && DOMAINS.map((domain, index) => {
        const [x, y] = polar(index, radius + 20);
        return <text key={domain} x={x} y={y + 3} textAnchor={x < 96 ? "end" : x > 124 ? "start" : "middle"}>{DOMAIN_META[domain].label}</text>;
      })}
      {total === 0 && <text className="radar-empty" x="110" y="113" textAnchor="middle">No points</text>}
    </svg>
  );
}
