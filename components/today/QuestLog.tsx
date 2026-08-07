"use client";

import { useMemo, useState, type RefObject } from "react";
import { ArrowUpDown, Copy, Mail, MoreHorizontal, Repeat } from "lucide-react";
import { DOMAIN_META } from "@/lib/domains";
import { sortQuests, type QuestSort } from "@/lib/task-sorting";
import type { Domain, Task } from "@/lib/types";
import { MotifGlyph } from "../MotifGlyph";

const SORT_OPTIONS: { value: QuestSort; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "importance", label: "Importance" },
  { value: "difficulty", label: "Difficulty" },
  { value: "date-newest", label: "Added · newest" },
  { value: "date-oldest", label: "Added · oldest" },
];

function TaskMetaLine({ task }: { task: Task }) {
  return (
    <span style={{ color: DOMAIN_META[task.domain].light }}>
      <MotifGlyph domain={task.domain}/>{DOMAIN_META[task.domain].label}
      {task.action_type === "reach" && <><i>·</i><Mail size={10}/> Reach</>}
    </span>
  );
}

export function QuestLog({
  tasks,
  filter,
  pendingTaskIds,
  menuFor,
  confirmDelete,
  listRef,
  onToggle,
  onAct,
  onEdit,
  onDuplicate,
  onMakeDaily,
  onDelete,
  onMenuChange,
  onConfirmDelete,
}: {
  tasks: Task[];
  filter: "all" | Domain;
  pendingTaskIds: Set<string>;
  menuFor: string | null;
  confirmDelete: string | null;
  listRef: RefObject<HTMLElement | null>;
  onToggle: (task: Task) => void;
  onAct: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onMakeDaily: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMenuChange: (taskId: string | null) => void;
  onConfirmDelete: (taskId: string | null) => void;
}) {
  const [sort, setSort] = useState<QuestSort>("default");
  const sortedTasks = useMemo(() => sortQuests(tasks, sort), [sort, tasks]);
  const openCount = tasks.filter((task) => !task.completed_at).length;

  return (
    <section className="task-list card" aria-label="Today's quests" ref={listRef}>
      <div className="card-title-row">
        <div><span className="eyebrow">Quest log</span><h2>{filter === "all" ? "Today" : DOMAIN_META[filter].label}</h2></div>
        <div className="quest-list-tools">
          <label className="quest-sort"><ArrowUpDown size={13}/><select value={sort} onChange={(event) => setSort(event.target.value as QuestSort)} aria-label="Sort quests">{SORT_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
          <span>{openCount} open</span>
        </div>
      </div>
      <div className="task-list-scroll">
        {sortedTasks.length ? sortedTasks.map((task, index) => {
          const previous = sortedTasks[index - 1];
          const bonusHeading = task.is_bonus && !previous?.is_bonus;
          const pending = pendingTaskIds.has(task.id);
          return (
            <div key={task.id}>
              {bonusHeading && <div className="bonus-divider"><span>Bonus</span></div>}
              <div className={`task-row ${task.completed_at ? "completed" : ""} ${pending ? "pending" : ""}`} aria-busy={pending}>
                <button className="quest-check" onClick={() => task.action_type === "reach" ? onAct(task) : onToggle(task)} disabled={pending || Boolean(task.action_type && task.completed_at)} aria-label={task.action_type === "reach" ? (task.completed_at ? `Email sent for ${task.title}` : `Open email action for ${task.title}`) : (task.completed_at ? `Mark ${task.title} incomplete` : `Complete ${task.title}`)}><span/></button>
                {task.action_type === "reach" ? <button type="button" className="task-main task-action-trigger" onClick={() => onAct(task)} disabled={pending || Boolean(task.completed_at)} aria-label={`Open email action for ${task.title}`}><strong>{task.title}</strong><TaskMetaLine task={task}/></button> : <div className="task-main"><strong>{task.title}</strong><TaskMetaLine task={task}/></div>}
                <span className="task-chip">{task.difficulty[0].toUpperCase()} · {task.importance[0].toUpperCase()}</span>
                <span className="points-badge">{task.points}</span>
                <div className="task-menu">
                  <button className="icon-button small" disabled={pending} onClick={() => { onMenuChange(menuFor === task.id ? null : task.id); onConfirmDelete(null); }} aria-label={`Options for ${task.title}`}><MoreHorizontal size={17}/></button>
                  {menuFor === task.id && <div className="menu-popover"><button onClick={() => { onEdit(task); onMenuChange(null); }}>Edit</button><button onClick={() => onDuplicate(task)}><Copy size={13}/>Duplicate</button><button onClick={() => onMakeDaily(task)}><Repeat size={13}/>Make daily</button><button className="danger" onClick={() => confirmDelete === task.id ? onDelete(task) : onConfirmDelete(task.id)}>{confirmDelete === task.id ? "Delete?" : "Delete"}</button></div>}
                </div>
              </div>
            </div>
          );
        }) : <div className="empty-state"><span>✦</span><h3>No quests today.</h3><p>Add one above, or draw from the Task Bank.</p><a className="ghost-button" href="/bank">Open Task Bank</a></div>}
      </div>
    </section>
  );
}
