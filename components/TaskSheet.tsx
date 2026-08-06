"use client";

import { useEffect, useState } from "react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Difficulty, Domain, Importance, Task, TaskActionType } from "@/lib/types";
import { MotifGlyph } from "./MotifGlyph";
import { PillSelector } from "./PillSelector";

export function TaskSheet({ task, onClose, onSaved, onDeleted }: { task: Task; onClose: () => void; onSaved: (task: Task) => void; onDeleted: (id: string) => void }) {
  const [form, setForm] = useState<{ title: string; domain: Domain; difficulty: Difficulty; importance: Importance; task_date: string; action_type: TaskActionType | null }>({
    title: task.title,
    domain: task.domain,
    difficulty: task.difficulty,
    importance: task.importance,
    task_date: task.task_date,
    action_type: task.action_type,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not save.");
      onSaved(await response.json() as Task);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete the task.");
      onDeleted(task.id);
    } catch {
      setError("Could not delete the task.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="sheet" onSubmit={save} aria-label="Edit task">
        <div className="sheet-handle" />
        <div className="sheet-header"><div><span className="eyebrow">Quest details</span><h2>Edit task</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        <label className="field"><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required autoFocus /></label>
        <div className="field"><span>Domain</span><PillSelector value={form.domain} label="Domain" onChange={(domain: Domain) => setForm({ ...form, domain })} options={DOMAINS.map((domain) => ({ value: domain, label: DOMAIN_META[domain].label, icon: <MotifGlyph domain={domain} /> }))} /></div>
        <div className="field"><span>Difficulty</span><PillSelector value={form.difficulty} label="Difficulty" onChange={(difficulty: Difficulty) => setForm({ ...form, difficulty })} options={["easy", "medium", "hard"].map((value) => ({ value: value as Difficulty, label: value[0].toUpperCase() + value.slice(1) }))} /></div>
        <div className="field"><span>Importance</span><PillSelector value={form.importance} label="Importance" onChange={(importance: Importance) => setForm({ ...form, importance })} options={["low", "medium", "high"].map((value) => ({ value: value as Importance, label: value[0].toUpperCase() + value.slice(1) }))} /></div>
        <label className="field"><span>Real-world action</span><select value={form.action_type ?? ""} onChange={(event) => setForm({ ...form, action_type: event.target.value ? event.target.value as TaskActionType : null })}><option value="">No attached action</option><option value="reach">Reach · send an email</option></select><small>Action quests open a focused tool when you click their title.</small></label>
        <label className="field"><span>Date</span><input type="date" value={form.task_date} onChange={(event) => setForm({ ...form, task_date: event.target.value })} required /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="sheet-actions"><button type="button" className="danger-button" onClick={remove} disabled={saving}>Delete</button><span/><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save"}</button></div>
      </form>
    </div>
  );
}
