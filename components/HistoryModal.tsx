"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Domain, DomainProgress } from "@/lib/types";
import { GardenScene } from "./GardenScene";
import { MotifGlyph } from "./MotifGlyph";
import { RadarChart } from "./RadarChart";

type DomainDay = { score: number | null; xp: number; completedTasks: number };
type HistoryDay = { date: string; future: boolean; score: number | null; plannedPoints: number; earnedPoints: number; domains: Record<Domain, DomainDay> };
type Weekly = { week: number; party: number | null } & Record<Domain, number | null>;
type HistoryMonth = { month: string; completedTasks: number; domains: Record<Domain, number> };
type HistoryData = { days: HistoryDay[]; recentDays: HistoryDay[]; months: HistoryMonth[]; weekly: Weekly[]; progress: DomainProgress[]; today: string };

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

function dayRadarValues(day: HistoryDay) {
  return Object.fromEntries(DOMAINS.map((domain) => [domain, day.domains[domain].completedTasks])) as Record<Domain, number>;
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
  const pastDays = useMemo(() => data?.recentDays.filter((day) => day.plannedPoints > 0 || day.earnedPoints > 0).slice().reverse() ?? [], [data]);
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
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Member heatmaps</span><h2>Five paths</h2></div></div><div className="member-heatmaps">{DOMAINS.map((domain) => <div key={domain}><h3 style={{ color: DOMAIN_META[domain].light }}><MotifGlyph domain={domain}/>{DOMAIN_META[domain].name}</h3><Heatmap days={data.days} domain={domain} compact/></div>)}</div></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Season trend</span><h2>Party + creature lines</h2></div><p>Weekly average score</p></div><TrendChart weekly={data.weekly}/></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Daily balance</span><h2>Last 30 days</h2></div><p>Completed tasks by path</p></div><div className="radar-grid daily-radar-grid">{data.recentDays.slice().reverse().map((day) => {
            const label = new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return <article className="radar-history-card" key={day.date}><time>{label}</time><RadarChart values={dayRadarValues(day)} label={day.date} compact/><span>{Object.values(day.domains).reduce((sum, domain) => sum + domain.completedTasks, 0)} done</span></article>;
          })}</div></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Monthly balance</span><h2>Month totals</h2></div><p>Every completed task in the month</p></div><div className="radar-grid monthly-radar-grid">{data.months.slice().reverse().map((month) => {
            const label = new Date(`${month.month}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return <article className="radar-history-card monthly" key={month.month}><h3>{label}</h3><RadarChart values={month.domains} label={label}/><span>{month.completedTasks} completed</span></article>;
          })}</div></section>
          <section className="history-section"><div className="section-heading"><div><span className="eyebrow">Recent record</span><h2>Day by day</h2></div></div>{pastDays.length ? <div className="day-list">{pastDays.map((day) => <div key={day.date}><time>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time><span>{day.earnedPoints} / {day.plannedPoints} pts</span><strong>{day.score === null ? "—" : `${day.score}%`}</strong></div>)}</div> : <p className="empty-copy">Your story starts today.</p>}</section>
        </>}
      </div>
    </div>
  );
}
