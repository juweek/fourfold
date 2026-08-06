import { Resend } from "resend";
import { DOMAIN_META, DOMAINS } from "./domains";
import { assertNoError, db } from "./db";
import { FOURFOLD_FROM } from "./email";
import { getTodayData } from "./today";
import { dateInTz } from "./time";

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function xpPercent(xp: number, start: number, end: number) {
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, ((xp - start) / (end - start)) * 100));
}

export async function sendBriefing({ scheduled = false }: { scheduled?: boolean } = {}) {
  const data = await getTodayData();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const message = "RESEND_API_KEY is not configured.";
    await db().from("settings").update({ last_send_status: `failed: ${message}`, last_sent_at: new Date().toISOString() }).eq("id", 1);
    throw new Error(message);
  }
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const dateLabel = dateInTz(data.date, data.settings.timezone, { weekday: "long", month: "long", day: "numeric" });
  const yesterdayDate = new Date(`${data.date}T12:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const { data: yesterdayTasks, error: yesterdayError } = await db().from("tasks").select("points,is_bonus,completed_at").eq("task_date", yesterday);
  assertNoError(yesterdayError);
  const { scoreTasks } = await import("./scoring");
  const yesterdayScore = scoreTasks(yesterdayTasks ?? []).total;

  const taskGroups = DOMAINS.map((domain) => {
    const meta = DOMAIN_META[domain];
    const tasks = data.tasks.filter((task) => task.domain === domain && !task.completed_at);
    if (!tasks.length) return "";
    return `<tr><td style="padding:22px 28px 8px"><div style="font:700 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${meta.dark}">${escapeHtml(meta.label)} · ${escapeHtml(meta.name)} · ${tasks.reduce((sum, task) => sum + task.points, 0)} pts</div></td></tr>
      ${tasks.map((task) => `<tr><td style="padding:0 28px 8px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4dcc9;border-radius:8px"><tr><td style="padding:13px 14px;color:#222630;font:500 14px Arial,sans-serif">${task.is_bonus ? '<span style="color:#9C742B">BONUS · </span>' : ""}${escapeHtml(task.title)}</td><td align="right" style="padding:13px 14px;color:#6b665d;font:700 12px Arial,sans-serif;white-space:nowrap">${escapeHtml(task.points)} pts</td></tr></table></td></tr>`).join("")}`;
  }).join("");

  const members = data.progress.map((item) => {
    const meta = DOMAIN_META[item.domain];
    const percent = xpPercent(item.xp, item.levelStartXp, item.nextLevelXp);
    return `<tr><td style="padding:9px 28px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font:600 13px Arial,sans-serif;color:#222630">${escapeHtml(meta.name)} <span style="font-weight:400;color:#777268">· Lv ${item.level}</span></td><td align="right" style="font:12px Arial,sans-serif;color:#777268">${item.xp}/${item.nextLevelXp} XP</td></tr><tr><td colspan="2" style="padding-top:6px"><div style="height:5px;border-radius:5px;background:#e6dece"><div style="height:5px;width:${percent}%;border-radius:5px;background:${meta.color}"></div></div></td></tr></table></td></tr>`;
  }).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#ede8dd"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FAF7F0;border:1px solid #ded6c5;border-radius:14px;overflow:hidden"><tr><td style="padding:26px 28px 14px"><table width="100%"><tr><td style="font:700 14px Arial,sans-serif;letter-spacing:.2em;color:#171a20">FOURFOLD</td><td align="right" style="font:700 10px Arial,sans-serif;letter-spacing:.12em;color:#9C742B">WEEK ${data.week} OF 26</td></tr></table><h1 style="margin:28px 0 4px;font:600 32px Georgia,serif;color:#171a20">${escapeHtml(dateLabel)}</h1><p style="margin:0;color:#716c62;font:14px Arial,sans-serif">${data.tasks.filter((task) => !task.completed_at).length} tasks to do · Yesterday: ${yesterdayScore === null ? "—" : `${yesterdayScore}%`}</p></td></tr>
  <tr><td align="center" style="padding:4px 20px 0;background:linear-gradient(#FAF7F0,#f1eadc)"><img src="${appUrl}/characters/party.png" width="440" alt="The Fourfold party together" style="display:block;width:100%;max-width:440px;height:auto"></td></tr>
  <tr><td style="padding:12px 28px 2px"><div style="height:1px;background:#ded6c5"></div></td></tr>${taskGroups || '<tr><td style="padding:28px;text-align:center;font:15px Arial,sans-serif;color:#716c62">No quests today. The garden rests.</td></tr>'}
  <tr><td style="padding:22px 28px 6px"><div style="font:700 11px Arial,sans-serif;letter-spacing:.12em;color:#9C742B">PARTY PROGRESS</div></td></tr>${members}
  <tr><td align="center" style="padding:26px 28px"><a href="${appUrl}" style="display:inline-block;padding:13px 24px;border-radius:8px;background:#D9A441;color:#171a20;text-decoration:none;font:700 14px Arial,sans-serif">Open Fourfold</a></td></tr>
  <tr><td style="padding:18px 28px;background:#171a20;color:#aaa595;font:11px Arial,sans-serif;text-align:center">Briefing ${scheduled ? "scheduled" : "sent manually"} for ${escapeHtml(data.settings.send_time.slice(0, 5))} · ${escapeHtml(data.settings.timezone)}</td></tr></table></td></tr></table></body></html>`;

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: FOURFOLD_FROM,
      to: data.settings.recipient_email,
      subject: `Fourfold — ${dateInTz(data.date, data.settings.timezone, { weekday: "long" })}: ${data.tasks.filter((task) => !task.completed_at).length} tasks`,
      html,
    });
    if (result.error) throw new Error(result.error.message);
    const { error } = await db().from("settings").update({ last_send_status: "sent", last_sent_at: new Date().toISOString() }).eq("id", 1);
    assertNoError(error);
    return { id: result.data?.id, recipient: data.settings.recipient_email };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await db().from("settings").update({ last_send_status: `failed: ${message}`, last_sent_at: new Date().toISOString() }).eq("id", 1);
    throw error;
  }
}
