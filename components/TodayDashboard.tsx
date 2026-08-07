"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Plane, RefreshCw } from "lucide-react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import { completedPointsByDomain, scoreTasks } from "@/lib/scoring";
import type { Difficulty, Domain, Importance, Task, TodaySnapshot } from "@/lib/types";
import { GardenScene } from "./GardenScene";
import { HistoryModal } from "./HistoryModal";
import { MotifGlyph } from "./MotifGlyph";
import { PillSelector } from "./PillSelector";
import { ScoreRing } from "./ScoreRing";
import { TaskSheet } from "./TaskSheet";
import { RadarChart } from "./RadarChart";
import { ReachActionModal } from "./ReachActionModal";
import { CharacterProgressCard } from "./today/CharacterProgressCard";
import { QuestLog } from "./today/QuestLog";

const difficultyOptions = ["easy", "medium", "hard"].map((value) => ({ value: value as Difficulty, label: value[0].toUpperCase() + value.slice(1) }));
const importanceOptions = ["low", "medium", "high"].map((value) => ({ value: value as Importance, label: value[0].toUpperCase() + value.slice(1) }));

function withTasks(current: TodaySnapshot, tasks: Task[]): TodaySnapshot {
  return { ...current, tasks, score: scoreTasks(tasks) };
}

export function TodayDashboard() {
  const [data, setData] = useState<TodaySnapshot | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Domain>("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [acting, setActing] = useState<Task | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [toast, setToast] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());
  const taskListRef = useRef<HTMLElement>(null);
  const pendingTaskIdsRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<number | null>(null);
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

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    const refreshWhenIdle = () => {
      if (pendingTaskIdsRef.current.size > 0) {
        refreshTimerRef.current = window.setTimeout(refreshWhenIdle, 250);
        return;
      }
      refreshTimerRef.current = null;
      void load();
    };
    refreshTimerRef.current = window.setTimeout(refreshWhenIdle, 700);
  }, [load]);

  function setTaskPending(id: string, pending: boolean) {
    if (pending) pendingTaskIdsRef.current.add(id);
    else pendingTaskIdsRef.current.delete(id);
    setPendingTaskIds(new Set(pendingTaskIdsRef.current));
  }

  function replaceLocalTask(task: Task) {
    setData((current) => current ? withTasks(current, current.tasks.map((item) => item.id === task.id ? task : item)) : current);
  }

  function removeLocalTask(id: string) {
    setData((current) => current ? withTasks(current, current.tasks.filter((item) => item.id !== id)) : current);
  }

  function appendLocalTask(task: Task) {
    setData((current) => current ? withTasks(current, current.tasks.some((item) => item.id === task.id) ? current.tasks : [...current.tasks, task]) : current);
  }

  useEffect(() => { load(); const saved = window.localStorage.getItem("ff_last_domain") as Domain | null; if (saved && DOMAINS.includes(saved)) setQuick((value) => ({ ...value, domain: saved })); }, [load]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timeout); }, [toast]);
  useEffect(() => () => { if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current); }, []);

  const visibleTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) => filter === "all" || task.domain === filter);
  }, [data, filter]);

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!quick.title.trim()) return;
    const draft = { ...quick, title: quick.title.trim() };
    setAdding(true);
    setQuick((current) => ({ ...current, title: "" }));
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not add task.");
      const created = await response.json() as Task;
      appendLocalTask(created);
      window.localStorage.setItem("ff_last_domain", draft.domain);
      setToast("Quest added to today.");
      scheduleRefresh();
    } catch (reason) {
      setQuick((current) => current.title ? current : { ...draft });
      setToast(reason instanceof Error ? reason.message : "Could not add task.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleTask(task: Task) {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    const completing = !task.completed_at;
    const optimistic = { ...task, completed_at: completing ? new Date().toISOString() : null };
    setTaskPending(task.id, true);
    replaceLocalTask(optimistic);
    if (completing) { setPulse(true); window.setTimeout(() => setPulse(false), 200); }
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complete: completing }) });
      if (!response.ok) throw new Error("Could not update the quest.");
      replaceLocalTask(await response.json() as Task);
      scheduleRefresh();
    } catch {
      replaceLocalTask(task);
      setToast("Could not update the quest.");
    } finally {
      setTaskPending(task.id, false);
    }
  }

  async function deleteTask(task: Task) {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    setTaskPending(task.id, true);
    setMenuFor(null); setConfirmDelete(null); removeLocalTask(task.id);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete the quest.");
      setToast("Quest deleted.");
      scheduleRefresh();
    } catch {
      appendLocalTask(task);
      setToast("Could not delete the quest.");
    } finally {
      setTaskPending(task.id, false);
    }
  }

  async function duplicateTask(task: Task) {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    setTaskPending(task.id, true);
    setMenuFor(null);
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: task.title, domain: task.domain, difficulty: task.difficulty, importance: task.importance, action_type: task.action_type }) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not duplicate the quest.");
      appendLocalTask(await response.json() as Task);
      setToast("Quest duplicated for today.");
      scheduleRefresh();
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Could not duplicate the quest.");
    } finally {
      setTaskPending(task.id, false);
    }
  }

  async function makeDaily(task: Task) {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    setTaskPending(task.id, true);
    setMenuFor(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/daily`, { method: "POST" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not make this quest daily.");
      setToast("Daily quest enabled. It will appear once each day.");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "Could not make this quest daily.");
    } finally {
      setTaskPending(task.id, false);
    }
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
  const taskInteractionActive = Boolean(menuFor || editing || acting);
  return (
    <main className={`page-shell today-page ${taskInteractionActive ? "task-interaction-active" : ""}`}>
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

          <QuestLog
            tasks={visibleTasks}
            filter={filter}
            pendingTaskIds={pendingTaskIds}
            menuFor={menuFor}
            confirmDelete={confirmDelete}
            listRef={taskListRef}
            onToggle={toggleTask}
            onAct={setActing}
            onEdit={setEditing}
            onDuplicate={duplicateTask}
            onMakeDaily={makeDaily}
            onDelete={deleteTask}
            onMenuChange={setMenuFor}
            onConfirmDelete={setConfirmDelete}
          />
        </section>

        <aside className="party-column">
          <section className="score-card card">
            <ScoreRing score={data.score} pulse={pulse}/>
            <div><span className="eyebrow">Today&apos;s score</span><h2>{earned} / {data.score.plannedPoints} pts</h2><p>{data.score.earnedBonusPoints ? `+${data.score.earnedBonusPoints} bonus · ` : ""}{openTasks.length} quests remain</p></div>
          </section>
          <GardenScene progress={data.progress} paused={taskInteractionActive} activeDomain={filter === "all" ? undefined : filter} onSelectDomain={filterFromCharacter}/>
          <section className="today-radar-card card"><div><span className="eyebrow">Today&apos;s balance</span><h2>Points earned</h2><p>Completed points across the five paths.</p></div><RadarChart values={completedPointsByDomain(data.tasks)} label="Today" /></section>
          <div className="character-grid">
            {data.progress.map((item) => <CharacterProgressCard progress={item} active={filter === item.domain} paused={taskInteractionActive} onSelect={filterFromCharacter} key={item.domain}/>)}
          </div>
        </aside>
      </div>
      {editing && (
        <TaskSheet
          task={editing}
          onClose={() => setEditing(null)}
          onSaved={(task) => { replaceLocalTask(task); setEditing(null); setToast("Quest updated."); scheduleRefresh(); }}
          onDeleted={(id) => { removeLocalTask(id); setEditing(null); setToast("Quest deleted."); scheduleRefresh(); }}
        />
      )}
      {acting && (
        <ReachActionModal
          task={acting}
          senderEmail={data.settings.outreach_sender_email}
          onClose={() => setActing(null)}
          onSent={({ task, recipient }) => {
            replaceLocalTask(task);
            setActing(null);
            setPulse(true);
            window.setTimeout(() => setPulse(false), 200);
            setToast(`Email sent to ${recipient.name}. Quest complete · +${task.points} pts.`);
            scheduleRefresh();
          }}
        />
      )}
      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)}/>} 
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
