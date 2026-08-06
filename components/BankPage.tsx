"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Contact, Difficulty, Domain, Importance, Template } from "@/lib/types";
import { MotifGlyph } from "./MotifGlyph";
import { PillSelector } from "./PillSelector";

const blankTemplate = { title: "", domain: "work" as Domain, difficulty: "medium" as Difficulty, importance: "medium" as Importance, recurrence: "none" };
const blankContact = { name: "", email: "", note: "", domain: "work" as Domain };

export function BankPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [templateForm, setTemplateForm] = useState(blankTemplate);
  const [contactForm, setContactForm] = useState(blankContact);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const [templateResponse, contactResponse] = await Promise.all([fetch("/api/templates"), fetch("/api/contacts")]);
      if (!templateResponse.ok || !contactResponse.ok) throw new Error("The Task Bank could not be opened.");
      setTemplates(await templateResponse.json()); setContacts(await contactResponse.json());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load the Task Bank."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3000); return () => clearTimeout(id); }, [toast]);

  function openTemplate(item?: Template) {
    setEditingTemplate(item?.id ?? null);
    setTemplateForm(item ? { title: item.title, domain: item.domain, difficulty: item.difficulty, importance: item.importance, recurrence: item.recurrence } : blankTemplate);
    setTemplateOpen(true);
  }
  function openContact(item?: Contact) {
    setEditingContact(item?.id ?? null);
    setContactForm(item ? { name: item.name, email: item.email ?? "", note: item.note ?? "", domain: item.domain } : blankContact);
    setContactOpen(true);
  }
  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(editingTemplate ? `/api/templates/${editingTemplate}` : "/api/templates", { method: editingTemplate ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(templateForm) });
    if (!response.ok) { setToast((await response.json()).error ?? "Could not save template."); return; }
    setTemplateOpen(false); setToast(editingTemplate ? "Template updated." : "Template created."); load();
  }
  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(editingContact ? `/api/contacts/${editingContact}` : "/api/contacts", { method: editingContact ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contactForm) });
    if (!response.ok) { setToast((await response.json()).error ?? "Could not save contact."); return; }
    setContactOpen(false); setToast(editingContact ? "Contact updated." : "Contact added."); load();
  }
  async function action(url: string, message: string) {
    const response = await fetch(url, { method: "POST" });
    setToast(response.ok ? message : ((await response.json()).error ?? "That action failed."));
  }
  async function remove(kind: "templates" | "contacts", id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    const response = await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
    if (response.ok) { setToast(kind === "templates" ? "Template deleted." : "Contact deleted."); setConfirmDelete(null); load(); }
  }

  return (
    <main className="page-shell bank-page">
      <div className="page-heading"><div><span className="eyebrow">Reusable quests</span><h1>Task Bank</h1><p>Prepare recurring rituals and keep important people within reach.</p></div></div>
      {error && <div className="error-state"><p>{error}</p><button className="ghost-button" onClick={load}><RefreshCw size={15}/> Retry</button></div>}
      {loading && !error ? <div className="bank-skeleton"><div/><div/></div> : <div className="bank-grid">
        <section className="bank-section card">
          <div className="card-title-row"><div><span className="eyebrow">Prepared rituals</span><h2>Templates</h2></div><button className="primary-button compact" onClick={() => openTemplate()}><Plus size={15}/> New template</button></div>
          <div className="bank-list">{templates.length ? templates.map((item) => <div className="bank-row" key={item.id}>
            <div className="bank-icon" style={{ color: DOMAIN_META[item.domain].light }}><MotifGlyph domain={item.domain} size={20}/></div>
            <div><strong>{item.title}</strong><span>{DOMAIN_META[item.domain].label} · {item.difficulty[0].toUpperCase()} · {item.importance[0].toUpperCase()}</span></div>
            <span className="recurrence-tag">{item.recurrence === "none" ? "One-off" : item.recurrence}</span>
            <button className="ghost-button compact" onClick={() => action(`/api/templates/${item.id}/add-to-today`, "Quest added to today.")}>Add to Today</button>
            <div className="row-actions"><button onClick={() => openTemplate(item)}>Edit</button><button className="danger" onClick={() => remove("templates", item.id)}>{confirmDelete === item.id ? "Delete?" : "Delete"}</button></div>
          </div>) : <div className="empty-state small"><Sparkles/><h3>No templates yet.</h3><p>Save a quest once, then call it back whenever you need it.</p></div>}</div>
        </section>
        <section className="bank-section card">
          <div className="card-title-row"><div><span className="eyebrow">Outreach</span><h2>Contacts</h2></div><button className="primary-button compact" onClick={() => openContact()}><Plus size={15}/> New contact</button></div>
          <div className="bank-list">{contacts.length ? contacts.map((item) => <div className="bank-row contact-row" key={item.id}>
            <div className="contact-monogram" style={{ background: `${DOMAIN_META[item.domain].color}22`, color: DOMAIN_META[item.domain].light }}>{item.name.slice(0, 1).toUpperCase()}</div>
            <div><strong>{item.name}</strong><span>{item.email || "Email needed"}{item.note ? ` · ${item.note}` : ""}</span><small>Last reached: {item.last_reached ? new Date(item.last_reached).toLocaleDateString() : "never"}</small></div>
            <button className="ghost-button compact" onClick={() => action(`/api/contacts/${item.id}/generate`, `Outreach quest created for ${item.name}.`)}>Generate task</button>
            <div className="row-actions"><button onClick={() => openContact(item)}>Edit</button><button className="danger" onClick={() => remove("contacts", item.id)}>{confirmDelete === item.id ? "Delete?" : "Delete"}</button></div>
          </div>) : <div className="empty-state small"><Sparkles/><h3>No contacts yet.</h3><p>Add someone you want to reach with intention.</p></div>}</div>
        </section>
      </div>}
      {templateOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setTemplateOpen(false)}><form className="sheet" onSubmit={saveTemplate}><div className="sheet-handle"/><div className="sheet-header"><div><span className="eyebrow">Task Bank</span><h2>{editingTemplate ? "Edit template" : "New template"}</h2></div><button type="button" className="icon-button" onClick={() => setTemplateOpen(false)}>×</button></div><label className="field"><span>Title</span><input value={templateForm.title} onChange={(event) => setTemplateForm({ ...templateForm, title: event.target.value })} autoFocus required/></label><div className="field"><span>Domain</span><PillSelector value={templateForm.domain} label="Template domain" onChange={(domain: Domain) => setTemplateForm({ ...templateForm, domain })} options={DOMAINS.map((domain) => ({ value: domain, label: DOMAIN_META[domain].label, icon: <MotifGlyph domain={domain}/> }))}/></div><div className="field"><span>Difficulty</span><PillSelector value={templateForm.difficulty} label="Difficulty" onChange={(difficulty: Difficulty) => setTemplateForm({ ...templateForm, difficulty })} options={["easy","medium","hard"].map((value) => ({ value: value as Difficulty, label: value }))}/></div><div className="field"><span>Importance</span><PillSelector value={templateForm.importance} label="Importance" onChange={(importance: Importance) => setTemplateForm({ ...templateForm, importance })} options={["low","medium","high"].map((value) => ({ value: value as Importance, label: value }))}/></div><label className="field"><span>Recurrence</span><select value={templateForm.recurrence} onChange={(event) => setTemplateForm({ ...templateForm, recurrence: event.target.value })}><option value="none">None</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option>{["mon","tue","wed","thu","fri","sat","sun"].map((day) => <option value={day} key={day}>Weekly on {day[0].toUpperCase()+day.slice(1)}</option>)}</select></label><div className="sheet-actions"><span/><button type="button" className="ghost-button" onClick={() => setTemplateOpen(false)}>Cancel</button><button className="primary-button">Save</button></div></form></div>}
      {contactOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setContactOpen(false)}><form className="sheet" onSubmit={saveContact}><div className="sheet-handle"/><div className="sheet-header"><div><span className="eyebrow">Outreach</span><h2>{editingContact ? "Edit contact" : "New contact"}</h2></div><button type="button" className="icon-button" onClick={() => setContactOpen(false)}>×</button></div><label className="field"><span>Name</span><input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} autoFocus required/></label><label className="field"><span>Email</span><input type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} placeholder="name@company.com"/></label><label className="field"><span>Context</span><textarea value={contactForm.note} onChange={(event) => setContactForm({ ...contactForm, note: event.target.value })} rows={4} placeholder="What they do, where you met, and why now is a good time to reach out."/></label><div className="field"><span>Domain</span><PillSelector value={contactForm.domain} label="Contact domain" onChange={(domain: Domain) => setContactForm({ ...contactForm, domain })} options={DOMAINS.map((domain) => ({ value: domain, label: DOMAIN_META[domain].label, icon: <MotifGlyph domain={domain}/> }))}/></div><div className="sheet-actions"><span/><button type="button" className="ghost-button" onClick={() => setContactOpen(false)}>Cancel</button><button className="primary-button">Save</button></div></form></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
