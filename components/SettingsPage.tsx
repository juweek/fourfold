"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Mail, Send } from "lucide-react";
import type { Settings } from "@/lib/types";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const zones = useMemo(() => {
    try { return Intl.supportedValuesOf("timeZone"); } catch { return ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "UTC"]; }
  }, []);
  useEffect(() => { fetch("/api/settings").then((response) => response.json()).then(setSettings); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!settings) return; setSaving(true);
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false); setToast(response.ok ? "Settings saved." : "Could not save settings.");
    if (response.ok) setSettings(await response.json());
  }
  async function send() {
    setSending(true); const response = await fetch("/api/briefing/send", { method: "POST" }); setSending(false);
    setToast(response.ok ? `Briefing sent to ${(await response.json()).recipient}.` : ((await response.json()).error ?? "Briefing failed."));
    if (response.ok) setSettings(await (await fetch("/api/settings")).json());
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  if (!settings) return <main className="page-shell"><div className="settings-skeleton"><div/><div/></div></main>;
  return (
    <main className="page-shell settings-page">
      <div className="page-heading"><div><span className="eyebrow">Delivery & access</span><h1>Settings</h1><p>Set the cadence for your briefing and the identity used for outreach.</p></div></div>
      <div className="settings-grid">
        <form className="settings-card card" onSubmit={save}><div className="card-title-row"><div><span className="eyebrow">Morning dispatch</span><h2>Email briefing</h2></div><Mail size={21}/></div><label className="field"><span>Briefing recipient</span><input type="email" value={settings.recipient_email} onChange={(event) => setSettings({ ...settings, recipient_email: event.target.value })} required/></label><div className="field-row"><label className="field"><span>Delivery time</span><input type="time" value={settings.send_time.slice(0,5)} onChange={(event) => setSettings({ ...settings, send_time: event.target.value })} required/></label><label className="field"><span>Timezone</span><select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}>{zones.map((zone) => <option value={zone} key={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label></div><label className="field outreach-sender-field"><span>Outreach sender email</span><input type="email" value={settings.outreach_sender_email} onChange={(event) => setSettings({ ...settings, outreach_sender_email: event.target.value })} required/><small>Resend must recognize this address or its domain. Messages appear as “Fourfold” from this address.</small></label><label className="toggle-row"><span><strong>Automatic delivery</strong><small>Send once each morning after the selected time.</small></span><input type="checkbox" checked={settings.auto_send} onChange={(event) => setSettings({ ...settings, auto_send: event.target.checked })}/><i/></label><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></form>
        <aside className="settings-side"><section className="card briefing-status"><span className="eyebrow">Delivery status</span><h2>{settings.last_send_status?.startsWith("failed") ? "Needs attention" : settings.last_send_status === "sent" ? "Briefing sent" : "Awaiting first send"}</h2><p>{settings.last_sent_at ? `Last email: ${settings.last_send_status} · ${new Date(settings.last_sent_at).toLocaleString()}` : "No briefing has been sent yet."}</p><button className="ghost-button" onClick={send} disabled={sending}><Send size={15}/>{sending ? "Sending…" : "Send briefing now"}</button></section><section className="card season-card"><span className="eyebrow">Current chapter</span><h2>Season I</h2><p>August 5, 2026 – February 3, 2027</p><div className="season-rule"><i/></div><small>26 weeks · five paths · one party</small></section><button className="lock-button card" onClick={logout}><LockKeyhole size={18}/><span><strong>Lock app</strong><small>Return to the passcode screen.</small></span></button></aside>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
