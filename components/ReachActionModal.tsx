"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import type { Contact, Task } from "@/lib/types";

type ReachResult = {
  task: Task;
  recipient: { id: string; name: string; email: string };
};

export function ReachActionModal({
  task,
  senderEmail,
  onClose,
  onSent,
}: {
  task: Task;
  senderEmail: string;
  onClose: () => void;
  onSent: (result: ReachResult) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState(task.contact_id ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/contacts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not load potential clients.");
        return response.json() as Promise<Contact[]>;
      })
      .then((items) => {
        if (!active) return;
        const reachable = items.filter((contact) => contact.email);
        setContacts(reachable);
        setContactId((current) => reachable.some((contact) => contact.id === current) ? current : (reachable[0]?.id ?? ""));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Could not load potential clients."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && !sending && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, sending]);

  const selected = useMemo(() => contacts.find((contact) => contact.id === contactId) ?? null, [contacts, contactId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}/actions/reach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selected.id, subject, message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The email could not be sent.");
      onSent(result as ReachResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The email could not be sent.");
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <form className="sheet reach-sheet" onSubmit={send} aria-label={`Complete ${task.title} by email`}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div><span className="eyebrow">Quest action · Reach</span><h2>Send the message</h2><p>{task.title}</p></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={sending} aria-label="Close">×</button>
        </div>

        {loading ? <div className="reach-loading"><span className="spinner"/> Gathering your contacts…</div> : contacts.length ? <>
          <div className="reach-recipient-row">
            <label className="field"><span>To</span><select value={contactId} onChange={(event) => setContactId(event.target.value)} disabled={sending}>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} · {contact.email}</option>)}</select></label>
            <div className="reach-from"><span>From</span><strong><Mail size={13}/>{senderEmail}</strong></div>
          </div>
          <aside className={`reach-context ${selected?.note ? "" : "empty"}`}><span>Context</span><p>{selected?.note || `No context has been added for ${selected?.name ?? "this contact"} yet.`}</p></aside>
          <label className="field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required disabled={sending} placeholder="A clear reason to open this email" /></label>
          <label className="field reach-message"><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={20000} rows={10} required disabled={sending} autoFocus placeholder={`Write to ${selected?.name ?? "your contact"}…`} /></label>
        </> : <div className="reach-empty"><Mail size={22}/><h3>No email-ready contacts yet</h3><p>Add an email address to a potential client in the Task Bank, then come back to this quest.</p><a className="ghost-button" href="/bank">Open Task Bank</a></div>}

        {error && <p className="form-error">{error}</p>}
        {contacts.length > 0 && <div className="sheet-actions"><span/><button type="button" className="ghost-button" onClick={onClose} disabled={sending}>Cancel</button><button className="primary-button" disabled={sending || !selected}>{sending ? <><span className="spinner"/> Sending…</> : <><Send size={14}/>Send & complete quest</>}</button></div>}
      </form>
    </div>
  );
}
