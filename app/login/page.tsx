"use client";

import { useState } from "react";
import { PartyPortrait } from "@/components/PartyPortrait";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
    setLoading(false);
    if (!response.ok) { setError("Wrong passcode."); setShake(true); setTimeout(() => setShake(false), 400); return; }
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    window.location.href = next;
  }
  return <main className="login-page"><div className="login-glow"/><section className={`login-panel ${shake ? "shake" : ""}`}><span className="login-wordmark">FOURFOLD</span><PartyPortrait/><span className="eyebrow">The party is waiting</span><h1>Enter the garden</h1><p>One passcode keeps this season private.</p><form onSubmit={submit}><label><span>Passcode</span><input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="current-password" autoFocus/></label>{error && <span className="form-error">{error}</span>}<button className="primary-button" disabled={loading}>{loading ? "Opening…" : "Enter"}</button></form></section></main>;
}
