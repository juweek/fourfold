"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Domain, DomainProgress } from "@/lib/types";
import { GardenScene } from "./GardenScene";
import { MotifGlyph } from "./MotifGlyph";

type HistoryDay = { date: string; future: boolean; score: number | null; plannedPoints: number; earnedPoints: number; domains: Record<Domain, { score: number | null; xp: number }> };
type Weekly = { week: number; party: number | null } & Record<Domain, number | null>;
type HistoryData = { days: HistoryDay[]; weekly: Weekly[]; progress: DomainProgress[]; today: string };

function heatColor(value: number | null, future: boolean, domain?: Domain) {
  if (future) return "rgba(233,226,208,.025)";
  if (value === null || value === 0) return "rgba(139,144,160,.12)";
  const meta = domain ? DOMAIN_META[domain] : null;
  if (value >= 100) return meta?.light ?? "#F2CD7E";
  if (value >= 65) return meta?.color ?? "#D9A441";
  return meta?.dark ?? "#765922";
}

function Heatmap({ days, domain, compact = false }: { days: HistoryDay[]; domain?: Domain; compact?: boolean }) {
  return (
    <div className={`heatmap ${compact ? "heatmap-compact" : ""}`} aria-label={`${domain ? DOMAIN_META[domain].name : "Party"} season heatmap`}>
      {days.map((day) => {
        const value = domain ? day.domains[domain].score : day.score;
        return <i key={day.date} title={`${day.date}: ${value === null ? "—" : `${value}%`}`} style={{ background: heatColor(value, day.future, domain) }} />;
      })}
    </div>
  );
}

function TrendChart({ weekly }: { weekly: Weekly[] }) {
  const width = 760, height = 235, left = 34, top = 18, chartWidth = 704, chartHeight = 176;
  const series = [
    { key: "party", label: "Party", color: "#E9E2D0", width: 3 },
    ...DOMAINS.map((domain) => ({ key: domain, label: DOMAIN_META[domain].name, color: DOMAIN_META[domain].color, width: 2 })),
  ];
  const point = (index: number, value: number) => `${left + (index / 25) * chartWidth},${top + chartHeight - (Math.min(110, value) / 110) * chartHeight}`;
  return (
    <div className="trend-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly score trend for the party and each creature">
        {[0, 50, 100].map((value) => { const y = top + chartHeight - (value / 110) * chartHeight; return <g key={value}><line x1={left} y1={y} x2={left + chartWidth} y2={y} stroke="rgba(233,226,208,.08)"/><text x="2" y={y + 4} fill="#8B90A0" fontSize="10">{value}%</text></g>; })}
        {series.map((item) => {
          const points = weekly.map((week, index) => ({ index, value: week[item.key as keyof Weekly] as number | null })).filter((entry): entry is { index: number; value: number } => entry.value !== null);
          return <g key={item.key}><polyline points={points.map((entry) => point(entry.index, entry.value)).join(" ")} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" opacity={item.key === "party" ? 1 : .88}/>{points.filter((entry) => entry.value >= 100).map((entry) => <circle key={entry.index} cx={point(entry.index, entry.value).split(",")[0]} cy={point(entry.index, entry.value).split(",")[1]} r={item.key === "party" ? 3.2 : 2.2} fill={item.color}/>)}</g>;
        })}
        <text x={left} y="224" fill="#8B90A0" fontSize="10">W1</text><text x={left + chartWidth - 18} y="224" fill="#8B90A0" fontSize="10">W26</text>
      </svg>
      <div className="trend-legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }}/>{item.label}</span>)}</div>
    </div>
  );
}

function Radar({ progress }: { progress: DomainProgress[] }) {
  const level = (domain: Domain) => progress.find((item) => item.domain === domain)?.level ?? 1;
  const radarDomains: Domain[] = ["work", "finance", "body", "gourmet"];
  const values = radarDomains.map(level);
  const center = 100, radius = 72;
  const points = [[100, center - radius * values[0] / 10], [center + radius * values[1] / 10, 100], [100, center + radius * values[2] / 10], [center - radius * values[3] / 10, 100]];
  return (
    <svg className="radar" viewBox="0 0 200 200" role="img" aria-label="Party balance by member level">
      {[.25,.5,.75,1].map((scale) => <polygon key={scale} points={`100,${100-radius*scale} ${100+radius*scale},100 100,${100+radius*scale} ${100-radius*scale},100`} fill="none" stroke="rgba(233,226,208,.09)" />)}
      <polygon points={points.map((entry) => entry.join(",")).join(" ")} fill="rgba(217,164,65,.15)" stroke="#D9A441" strokeWidth="2"/>
      {points.map(([x,y], index) => <circle key={index} cx={x} cy={y} r="4" fill={DOMAIN_META[radarDomains[index]].color}/>) }
      <text x="100" y="12" textAnchor="middle">Vesper</text><text x="193" y="103" textAnchor="end">Aurelia</text><text x="100" y="196" textAnchor="middle">Ari</text><text x="7" y="103">Moss</text>
    </svg>
  );
}

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/history").then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); return response.json(); }).then(setData).catch((reason) => setError(reason.message));
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const pastDays = useMemo(() => data?.days.filter((day) => !day.future && (day.plannedPoints > 0 || day.earnedPoints > 0)).slice(-14).reverse() ?? [], [data]);
  return (
    <div className="history-overlay" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div className="history-modal">
        <button className="history-close icon-button" onClick={onClose} aria-label="Close history"><X size={20}/></button>
        <div className="history-heading"><span className="eyebrow">Season I · The long arc</span><h1 id="history-title">Party history</h1><p>Every completed quest leaves a mark on the garden.</p></div>
        {error && <div className="error-state">{error}</div>}
        {!data && !error && <div className="history-loading"><div/><div/><div/></div>}
        {data && <>
          <GardenScene progress={data.progress} expanded />
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Season heatmap</span><h2>The party</h2></div></div><Heatmap days={data.days}/></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Member heatmaps</span><h2>Four paths</h2></div></div><div className="member-heatmaps">{DOMAINS.map((domain) => <div key={domain}><h3 style={{ color: DOMAIN_META[domain].light }}><MotifGlyph domain={domain}/>{DOMAIN_META[domain].name}</h3><Heatmap days={data.days} domain={domain} compact/></div>)}</div></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Season trend</span><h2>Party + creature lines</h2></div><p>Weekly average score</p></div><TrendChart weekly={data.weekly}/></section>
          <section className="history-section radar-section"><div><span className="eyebrow">Party balance</span><h2>Current levels</h2><p>A fuller diamond means the four paths are advancing together.</p></div><Radar progress={data.progress}/></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Recent record</span><h2>Day by day</h2></div></div>{pastDays.length ? <div className="day-list">{pastDays.map((day) => <div key={day.date}><time>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time><span>{day.earnedPoints} / {day.plannedPoints} pts</span><strong>{day.score === null ? "—" : `${day.score}%`}</strong></div>)}</div> : <p className="empty-copy">Your story starts today.</p>}</section>
        </>}
      </div>
    </div>
  );
}
