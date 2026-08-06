"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, History, MoreHorizontal, Plane, RefreshCw, Repeat } from "lucide-react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Difficulty, Domain, DomainProgress, Importance, Score, Settings, Task } from "@/lib/types";
import { CreaturePortrait } from "./CreaturePortrait";
import { GardenScene } from "./GardenScene";
import { HistoryModal } from "./HistoryModal";
import { MotifGlyph } from "./MotifGlyph";
import { PillSelector } from "./PillSelector";
import { ScoreRing } from "./ScoreRing";
import { TaskSheet } from "./TaskSheet";
import { completedTaskValues, RadarChart } from "./RadarChart";

type TodayData = {
  date: string;
  week: number;
  settings: Settings;
  tasks: Task[];
  score: Score;
  progress: DomainProgress[];
  seasonProgress: number;
};

const difficultyOptions = ["easy", "medium", "hard"].map((value) => ({ value: value as Difficulty, label: value[0].toUpperCase() + value.slice(1) }));
const importanceOptions = ["low", "medium", "high"].map((value) => ({ value: value as Importance, label: value[0].toUpperCase() + value.slice(1) }));

function progressPercent(item: DomainProgress) {
  if (item.level === 10) return 100;
  return Math.max(0, Math.min(100, ((item.xp - item.levelStartXp) / (item.nextLevelXp - item.levelStartXp)) * 100));
}

export function TodayDashboard() {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Domain>("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [toast, setToast] = useState("");
  const [adding, setAdding] = useState(false);
  const taskListRef = useRef<HTMLElement>(null);
  const [quick, setQuick] = useState<{ title: string; domain: Domain; difficulty: Difficulty; importance: Importance }>({ title: "", domain: "work", difficulty: "medium", importance: "medium" });

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/today", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not load today.");
      setData(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load today.");
    }
  }, []);

  useEffect(() => { load(); const saved = window.localStorage.getItem("ff_last_domain") as Domain | null; if (saved && DOMAINS.includes(saved)) setQuick((value) => ({ ...value, domain: saved })); }, [load]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timeout); }, [toast]);

  const visibleTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) => filter === "all" || task.domain === filter).sort((a, b) => Number(a.completed_at !== null) - Number(b.completed_at !== null) || Number(a.is_bonus) - Number(b.is_bonus));
  }, [data, filter]);

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!quick.title.trim()) return;
    setAdding(true);
    const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(quick) });
    setAdding(false);
    if (!response.ok) { setToast((await response.json()).error ?? "Could not add task."); return; }
    window.localStorage.setItem("ff_last_domain", quick.domain);
    setQuick({ ...quick, title: "" });
    setToast("Quest added to today.");
    await load();
  }

  async function toggleTask(task: Task) {
    const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complete: !task.completed_at }) });
    if (!response.ok) { setToast("Could not update the quest."); return; }
    setPulse(true); window.setTimeout(() => setPulse(false), 200);
    await load();
  }

  async function deleteTask(id: string) {
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!response.ok) { setToast("Could not delete the quest."); return; }
    setMenuFor(null); setConfirmDelete(null); setToast("Quest deleted."); await load();
  }

  async function duplicateTask(task: Task) {
    const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: task.title, domain: task.domain, difficulty: task.difficulty, importance: task.importance }) });
    if (!response.ok) { setToast((await response.json()).error ?? "Could not duplicate the quest."); return; }
    setMenuFor(null); setToast("Quest duplicated for today."); await load();
  }

  async function makeDaily(task: Task) {
    const response = await fetch(`/api/tasks/${task.id}/daily`, { method: "POST" });
    if (!response.ok) { setToast((await response.json()).error ?? "Could not make this quest daily."); return; }
    setMenuFor(null); setToast("Daily quest enabled. It will appear once each day.");
  }

  function filterFromCharacter(domain: Domain) {
    setFilter((current) => current === domain ? "all" : domain);
    window.requestAnimationFrame(() => taskListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function sendBriefing() {
    setSending(true);
    const response = await fetch("/api/briefing/send", { method: "POST" });
    setSending(false);
    if (!response.ok) { setToast((await response.json()).error ?? "Briefing failed."); return; }
    const result = await response.json();
    setToast(`Briefing sent to ${result.recipient}.`);
    await load();
  }

  if (error) return <main className="page-shell"><div className="error-state"><p>{error}</p><button className="ghost-button" onClick={load}><RefreshCw size={15}/> Retry</button></div></main>;
  if (!data) return <main className="page-shell"><div className="today-skeleton"><div/><div/><div/><div/></div></main>;

  const openTasks = data.tasks.filter((task) => !task.completed_at);
  const earned = data.score.earnedPlannedPoints + data.score.earnedBonusPoints;
  return (
    <main className="page-shell today-page">
      <div className="page-heading today-heading">
        <div><span className="eyebrow">Week {data.week} of 26</span><h1>{new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h1></div>
        <div className="heading-actions"><button className="ghost-button" onClick={() => setHistoryOpen(true)}><History size={16}/> History</button><button className="icon-button" onClick={sendBriefing} disabled={sending} aria-label="Send briefing">{sending ? <span className="spinner"/> : <Plane size={17}/>}</button></div>
      </div>

      <div className="today-layout">
        <section className="tasks-column">
          <form className="quick-add card" onSubmit={addTask}>
            <label><span className="eyebrow">Quick add</span><input placeholder="Name the next quest…" value={quick.title} onChange={(event) => setQuick({ ...quick, title: event.target.value })} aria-label="Task title" /></label>
            <PillSelector value={quick.domain} label="Task domain" onChange={(domain: Domain) => setQuick({ ...quick, domain })} options={DOMAINS.map((domain) => ({ value: domain, label: DOMAIN_META[domain].label, icon: <MotifGlyph domain={domain}/> }))}/>
            <div className="quick-options"><PillSelector value={quick.difficulty} label="Task difficulty" onChange={(difficulty: Difficulty) => setQuick({ ...quick, difficulty })} options={difficultyOptions}/><PillSelector value={quick.importance} label="Task importance" onChange={(importance: Importance) => setQuick({ ...quick, importance })} options={importanceOptions}/></div>
            <button className="primary-button" disabled={adding}>{adding ? "Adding…" : "Add quest"}</button>
          </form>

          <div className="task-filter-row">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All · {openTasks.length}</button>
            {DOMAINS.map((domain) => <button key={domain} className={filter === domain ? "active" : ""} onClick={() => setFilter(domain)} style={{ color: filter === domain ? DOMAIN_META[domain].light : undefined }}><MotifGlyph domain={domain}/><span>{DOMAIN_META[domain].label}</span> · {openTasks.filter((task) => task.domain === domain).length}</button>)}
          </div>

          <section className="task-list card" aria-label="Today's quests" ref={taskListRef}>
            <div className="card-title-row"><div><span className="eyebrow">Quest log</span><h2>{filter === "all" ? "Today" : DOMAIN_META[filter].label}</h2></div><span>{visibleTasks.filter((task) => !task.completed_at).length} open</span></div>
            <div className="task-list-scroll">{visibleTasks.length ? visibleTasks.map((task, index) => {
              const previous = visibleTasks[index - 1];
              const bonusHeading = task.is_bonus && !previous?.is_bonus;
              return <div key={task.id}>{bonusHeading && <div className="bonus-divider"><span>Bonus</span></div>}<div className={`task-row ${task.completed_at ? "completed" : ""}`}>
                <button className="quest-check" onClick={() => toggleTask(task)} aria-label={task.completed_at ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}><span/></button>
                <div className="task-main"><strong>{task.title}</strong><span style={{ color: DOMAIN_META[task.domain].light }}><MotifGlyph domain={task.domain}/>{DOMAIN_META[task.domain].label}</span></div>
                <span className="task-chip">{task.difficulty[0].toUpperCase()} · {task.importance[0].toUpperCase()}</span>
                <span className="points-badge">{task.points}</span>
                <div className="task-menu"><button className="icon-button small" onClick={() => { setMenuFor(menuFor === task.id ? null : task.id); setConfirmDelete(null); }} aria-label={`Options for ${task.title}`}><MoreHorizontal size={17}/></button>{menuFor === task.id && <div className="menu-popover"><button onClick={() => { setEditing(task); setMenuFor(null); }}>Edit</button><button onClick={() => duplicateTask(task)}><Copy size={13}/>Duplicate</button><button onClick={() => makeDaily(task)}><Repeat size={13}/>Make daily</button><button className="danger" onClick={() => confirmDelete === task.id ? deleteTask(task.id) : setConfirmDelete(task.id)}>{confirmDelete === task.id ? "Delete?" : "Delete"}</button></div>}</div>
              </div></div>;
            }) : <div className="empty-state"><span>✦</span><h3>No quests today.</h3><p>Add one above, or draw from the Task Bank.</p><a className="ghost-button" href="/bank">Open Task Bank</a></div>}</div>
          </section>
        </section>

        <aside className="party-column">
          <section className="score-card card">
            <ScoreRing score={data.score} pulse={pulse}/>
            <div><span className="eyebrow">Today&apos;s score</span><h2>{earned} / {data.score.plannedPoints} pts</h2><p>{data.score.earnedBonusPoints ? `+${data.score.earnedBonusPoints} bonus · ` : ""}{openTasks.length} quests remain</p></div>
          </section>
          <GardenScene progress={data.progress}/>
          <section className="today-radar-card card"><div><span className="eyebrow">Today&apos;s balance</span><h2>Tasks done</h2><p>Completed quests across the five paths.</p></div><RadarChart values={completedTaskValues(data.tasks)} label="Today" /></section>
          <div className="character-grid">
            {data.progress.map((item) => {
              const meta = DOMAIN_META[item.domain];
              const spriteWidth = item.domain === "gourmet" ? 44 : item.domain === "life" ? 76 : item.domain === "work" ? 64 : 58;
              return <button type="button" className={`character-card card ${filter === item.domain ? "active" : ""}`} key={item.domain} style={{ "--domain": meta.color, "--domain-light": meta.light } as React.CSSProperties} onClick={() => filterFromCharacter(item.domain)} aria-pressed={filter === item.domain} aria-label={`Filter quests by ${meta.label}`}>
                <CreaturePortrait creature={meta.creature} state={item.state} width={spriteWidth}/>
                <div className="character-info"><div><h3>{meta.name}</h3><span>{meta.className}</span></div><b>Lv {item.level}</b><div className="xp-track"><i style={{ width: `${progressPercent(item)}%` }}/></div><small>{item.xp} / {item.nextLevelXp} XP</small></div>
                <div className="micro-progress"><span>T <b>+{item.todayXp}</b><i><em style={{ width: `${Math.min(100, item.todayXp / 1.2)}%` }}/></i></span><span>W <b>+{item.weekXp}</b><i><em style={{ width: `${Math.min(100, item.weekXp / item.paceXp * 100)}%` }}/></i></span></div>
              </button>;
            })}
          </div>
        </aside>
      </div>
      {editing && <TaskSheet task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setToast("Quest updated."); load(); }} onDeleted={() => { setEditing(null); setToast("Quest deleted."); load(); }}/>} 
      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)}/>} 
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
