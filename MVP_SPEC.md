# FOURFOLD — MVP Specification

**One-line pitch:** A gamified personal task manager where four RPG party members — Data Spellcaster (Work), Summoner (Gourmet Data), Strong Warrior (Body), Scholar (Finance) — level up over a six-month season as the user completes real tasks, with a real morning briefing email.

Decisions in this file are **final**. The design phase already burned its 10 minutes; do not re-litigate.

---

## 1. Product definition

Single-user, passcode-protected, responsive web app at a persistent URL. Three screens (Today, Task Bank, Settings) + a History modal. Tasks have domain, difficulty, importance; completing them earns points → domain XP → character levels across a 26-week season (2026-08-05 → 2027-02-03). A morning email lists the day's tasks; it can be resent manually; recipient/time/timezone are editable. Data lives in hosted Postgres and is identical on phone and desktop.

**Out of scope:** multi-user, offline mode, push notifications, streaks, task notes/subtasks, drag-and-drop, animation systems, equipment/inventory, undo history, analytics.

## 2. Visual direction

- **Style:** "Quiet dark fantasy." Near-black ink UI, flat surfaces, thin borders, one gold accent — elegant tabletop-rulebook mood, zero cartoon.
- **Palette (fixed):** bg `#12141A`, surface `#1A1D26`, raised `#232735`, border `rgba(233,226,208,.08)`, text `#E9E2D0` (bone), muted `#8B90A0`, gold accent `#D9A441`. Domains (300/500/700): Work violet `#B9AEFF/#8B7CF6/#5E4FB8` · Gourmet green `#7FE7B4/#34C784/#1F8A59` · Body ember `#FF8A6B/#E4593D/#A63A26` · Finance gold `#F2CD7E/#D9A441/#9C742B`. Domain color is never the only signal — always pair with the domain motif glyph (constellation / sigil-ring / peak / rising-line).
- **Typography:** Fraunces (via next/font, weights 500–600) for headings, score numerals, character names; Inter for everything else. No third font.
- **Layout:** mobile = single column, bottom tab bar (Today / Bank / Settings), quick-add pinned above the tab bar. Desktop = top nav with wordmark, content max-width 1100px; Today is two columns (tasks left ~60%, characters + score right). Breakpoint 768px.
- **Components:** cards = surface + 1px border + 12px radius, no shadows; buttons = gold filled (primary) / bordered ghost (secondary); pills for domain/difficulty/importance selection; XP bars 6px, domain-500 on `#232735`; score ring = 8px gold arc on ink with Fraunces numeral, bonus overflow past 100% drawn as a thin bone arc.
- **Character treatment (v2):** full-body creature sprites (see §7-v2 — art is PRE-BUILT and ships with this spec in `sprites/`). Tier reads from the sprite's additive layers plus a level chip; medallion rings retired. Shown at 42–56px in cards, ~110px in the garden/History.

## 3. Screens

### Today (default route `/`)
Header: weekday + date, "Week N of 26", History link, "Send briefing" icon-button (paper-plane; spinner → toast "Briefing sent to …" or error toast; updates Settings status line).
Score block: ring with today's % ("—" if nothing planned), beneath it "18 / 24 pts · +2 bonus".
Garden strip (compact, under the score block): generative momentum scene — see §7b; decorative, cut-safe.
Character cards (2×2 grid mobile, right column desktop): creature sprite, name + class, "Lv 3", XP bar with "420 / 600", plus two micro-bars labeled T/W — today's XP ("+60") and this week's XP ("+320") vs pace, in domain-300/500.
Task list: filter pills above it — "All · n" plus one per domain (motif glyph + open count); selecting scopes the list. Planned tasks then bonus (labeled "Bonus"), incomplete before completed. Row = checkbox, title, domain dot+glyph, "M·High" chip, points badge, kebab → Edit / Delete (confirm inline, single click on "Delete?"). Checking plays a 150ms gold pulse on the ring and the domain card's bar.
Quick add: title input + domain pills + difficulty pills (default Medium) + importance pills (default Medium) + Add. Defaults to last-used domain. Enter submits.
Empty state: "No quests today." + buttons "Add a task" / "Open Task Bank". Loading: skeleton cards. API error: toast + retry button.

### Task Bank (`/bank`)
Section **Templates**: rows (title, domain, D/I chips, recurrence tag) with primary button "Add to Today" (creates a task for today; respects bonus rule; toast) and kebab Edit/Delete. "New template" opens the task sheet + recurrence select: None / Daily / Weekdays / Weekly on {day}.
Section **Contacts**: rows (name, note, "last reached: {date|never}") with "Generate task" → creates today's task `Reach out to {name}` (contact's domain, Easy, Medium = 2 pts, linked via `contact_id`) and kebab Edit/Delete. "New contact" = name, note, domain select.
Recurring templates also auto-materialize into Today (see §6). Empty states: one-line prompts.

### Settings (`/settings`)
Fields: recipient email, delivery time (`<input type="time">`), timezone (`<select>` from `Intl.supportedValuesOf('timeZone')`, default America/New_York), auto-send toggle. Save button persists (toast). Below: status line "Last email: sent 2026-08-05 07:00 EDT" or "failed: {reason}", "Send briefing now" button, season line "Season I · Aug 5 2026 – Feb 3 2027", and "Lock app" (clears auth cookie).

### History (modal from Today)
Top to bottom: **season heatmap** for the party (26 weeks × 7 days, GitHub-style, gold ramp on ink; grey = skipped, faint = future) · four **member heatmaps** (same component, 7px cells, each domain's 300/500/700 ramp) · **season trend line** (weekly average score, gold; gold star dots on 100%+ weeks) · **party-balance radar** (4 axes = a diamond, level 1–10, vertices in domain colors) · then the day list: date, score % (or —), "pts 18/24". All aggregate the `tasks` table — no new tables. Empty: "Your story starts today." If behind schedule keep only the group heatmap + day list.

### Add/Edit task sheet (bottom sheet mobile, centered modal desktop)
Title, domain pills, difficulty pills, importance pills, date (defaults today; edit keeps original `is_bonus`), Save / Cancel / (edit only) Delete. Editing difficulty/importance recomputes points.

### Login (`/login`)
Single passcode field + "Enter". Wrong code: shake + "Wrong passcode." Sets 180-day cookie.

## 4. Scoring (exact)

- **Difficulty:** Easy = 1, Medium = 2, Hard = 4. **Importance:** Low = ×1, Medium = ×2, High = ×3.
- **Task points = difficulty × importance** → min 1 (Easy·Low), max 12 (Hard·High).
- **Planned vs bonus:** computed once at creation and stored. `is_bonus = (task_date == today in settings.timezone) AND (creation time in tz > settings.send_time)`. Tasks created before the briefing time, or for a future date, are planned. Editing never changes `is_bonus`.
- **Daily score for date D** (all sums in points):
  `PP` = planned points, `EP` = completed planned points, `EB` = completed bonus points.
  `base = min(100, 100·EP/PP)` · `bonus = min(10, 100·EB/PP)` · **`score = round(base + bonus)`** (cap 110 is implied). If `PP = 0`: score = 100 if `EB > 0`, else no score ("—").
  Properties: 80% of planned points ⇒ 80. All planned ⇒ 100. Bonus lifts to ≤110. Skipped tasks drag the ratio down. Trivial-task spam is pointless: a 1-pt task is 1/12 of a Hard·High, the daily score is a ratio, and bonus is capped.
- **XP:** every completed task grants `points × 10` XP to its domain, permanently. Un-checking or deleting a completed task reverses exactly that grant (data correction); nothing else ever subtracts XP. Days are never penalized retroactively.
- **Levels (per domain):** XP required to *reach* level L = `100 × L × (L−1)`. So L2=200, L3=600, L4=1200, L5=2000, L6=3000, L7=4200, L8=5600, L9=7200, **L10=9000**, cap 10. L10 ≈ one Medium·High task per domain per day for six months — consistency, not expertise.
- **Season progress (overall):** `min(100, 100 × ΣXP_all_domains / 36000)` %. Season constants in code: `SEASON_START = 2026-08-05`, `SEASON_WEEKS = 26`.

**Example 1:** Planned: Work H·H 12, Gourmet M·H 6, Body M·M 4, Finance E·M 2 → PP=24. Completes 12+6+4 (skips 2): base = 100·22/24 = 91.7. One bonus Body E·M 2 completed: bonus = min(10, 8.3) = 8.3. **Score 100.** XP: Work +120, Gourmet +60, Body +60.
**Example 2:** Five planned 2-pt tasks all done (PP=10, base 100) + bonus Hard·High 12 done: bonus = min(10, 120) = 10 → **score 110** (cap). XP +220 total.

## 5. Data model (Supabase Postgres — 4 tables, no RLS; DB touched only by server routes with service key)

```sql
create table settings (
  id int primary key default 1 check (id = 1),
  recipient_email text not null default 'hello@juweek.studio',
  send_time time not null default '07:00',
  timezone text not null default 'America/New_York',
  auto_send boolean not null default true,
  last_send_status text, last_sent_at timestamptz, last_sent_date date
);
insert into settings (id) values (1);

create table templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain text not null check (domain in ('work','gourmet','body','finance')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  importance text not null check (importance in ('low','medium','high')),
  recurrence text not null default 'none', -- 'none'|'daily'|'weekdays'|'mon'..'sun'
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null, note text,
  domain text not null default 'work' check (domain in ('work','gourmet','body','finance')),
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain text not null check (domain in ('work','gourmet','body','finance')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  importance text not null check (importance in ('low','medium','high')),
  points int not null,            -- server-computed at write
  task_date date not null,        -- day in user's timezone
  is_bonus boolean not null default false,
  completed_at timestamptz,
  template_id uuid references templates(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_date_idx on tasks(task_date);
```
Contact "last reached" = max `completed_at` of its tasks (join, no extra column). Domain XP = `sum(points)*10` over completed tasks, grouped by domain. History = aggregate over `task_date`. No snapshot tables.

## 6. Technical architecture

- **Framework:** Next.js 15, App Router, TypeScript, Tailwind. Build/deploy with **Node 22** (`nvm use 22` — v22.23.2 is installed; system node is 18).
- **Hosting:** Vercel (user runs `vercel login` at kickoff; then `vercel --prod`). Persistent URL = the Vercel production domain. Local git repo (`git init`, commit as you go); GitHub push optional post-MVP (no `gh` CLI on this machine).
- **Database:** Supabase — CLI v2.9.6 is **already authenticated**, org `Gourmet Data`, org-id `olsvezakbxpalvxjsude`, 1 of 2 free projects used. Create: `supabase projects create fourfold --org-id olsvezakbxpalvxjsude --db-password <generate+save> --region us-east-1` (kick off first — provisioning takes ~2 min). Get keys: `supabase projects api-keys --project-ref <ref>`. Apply schema with installed `psql` via the connection string. Server-only access through `@supabase/supabase-js` with the service-role key. No Supabase Auth, no RLS.
- **Access control:** passcode gate. `POST /api/auth/login` compares against `APP_PASSCODE`, sets httpOnly cookie `ff_auth = HMAC-SHA256(APP_PASSCODE, 'fourfold-v1')`, 180 days. `middleware.ts` redirects to `/login` when the cookie doesn't match; excludes `/login`, `/api/auth/*`, `/api/cron/*`, static assets.
- **Email:** Resend (`RESEND_API_KEY` from user at kickoff). From `Fourfold <onboarding@resend.dev>` (works to the account owner's address with zero domain setup), to `settings.recipient_email`. Subject: `Fourfold — {Weekday}: {n} tasks`. Body: email-safe inline CSS + tables on light parchment (`#FAF7F0`, ink text — dark UIs are unreliable in email): FOURFOLD wordmark + "WEEK N OF 26" · date headline · "{n} tasks to do" · "Yesterday: {score}%" (one line, no commentary) · tasks grouped by domain — group header = motif glyph + domain·character name + today's pts, with a thin week-XP bar under it · party block: 40px sprite PNG in a domain-tinted circle, name, "Lv N · X/Y XP", progress bar · gold CTA "Open Fourfold" · footer with delivery time/timezone. Sprite PNGs are pre-rendered from `sprites/*.svg` into `public/characters/*.png` (~40px @2x; inline SVG doesn't survive Gmail/Outlook). Every send (manual or cron) updates `last_send_status`/`last_sent_at`.
- **Manual send:** `POST /api/briefing/send` (cookie-authed; the "Send briefing" buttons). Does **not** set `last_sent_date`, so it never suppresses the scheduled send.
- **Scheduled send:** `POST /api/cron/briefing` guarded by `Authorization: Bearer CRON_SECRET`. Logic: read settings → if `auto_send` and local time in `timezone` ≥ `send_time` and `last_sent_date ≠ today(tz)` → materialize recurring templates for today (insert where no task with same `template_id`+`task_date` exists) → compose+send → set `last_sent_date`. Otherwise 204. Idempotent by design.
  **Scheduler = Supabase pg_cron + pg_net** (hosted, computer-independent, exact-time-capable, no Vercel plan dependency):
  ```sql
  create extension if not exists pg_cron; create extension if not exists pg_net;
  select cron.schedule('fourfold-briefing','*/15 * * * *',
    $$select net.http_post(url:='https://<APP_URL>/api/cron/briefing',
      headers:='{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb)$$);
  ```
  Verify with `select * from cron.job;` and one forced run. The Today page loader also calls the recurrence materializer, as belt-and-braces.
- **Timezone handling:** store `time` + IANA `timezone` in settings; all "today"/"now" math server-side via `Intl.DateTimeFormat(…,{timeZone})` helpers `todayInTz(tz)` and `nowHHMMInTz(tz)`. `task_date` is always the user-timezone date. No date libraries needed.
- **Env vars (Vercel + `.env.local`):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_PASSCODE` (generate, show user), `CRON_SECRET` (generate), `APP_URL`. Keep the Supabase DB password in `.env.local` only (for psql).
- **API routes:** `auth/login|logout` · `GET /api/today` (settings+tasks+score+domain XP in one payload) · `POST /api/tasks`, `PATCH|DELETE /api/tasks/:id` (PATCH handles field edits with point recompute, and `complete: true|false`) · templates CRUD + `POST /api/templates/:id/add-to-today` · contacts CRUD + `POST /api/contacts/:id/generate` · `GET /api/history?days=14` · `GET|PUT /api/settings` · `POST /api/briefing/send` · `POST /api/cron/briefing`.

## 7. Art direction

### 7-v2 — FINAL (user-approved 2026-08-05): full-body creature party
**Supersedes the medallion spec below (kept as archive; its rendering law still applies to any new art). All art is PRE-BUILT and ships alongside this spec — copy the `sprites/` folder into the app; do not regenerate or redesign.**
- **Cast:** Work = **Panda Spellcaster** (violet; cape, staff, conjured constellation) · Gourmet Data = **Squirrel Summoner** (green; golden acorn + sigil ring; flora accumulates around it per tier, Venusaur-style) · Body = **Lion Warrior** (ember; mane and muscle mass grow per tier) · Finance = **Bird Scholar** (gold; flying, spectacles + scroll; wingspan and wind grow per tier — freedom).
- **Files:** `sprites/{panda-spellcaster,squirrel-summoner,lion-warrior,bird-scholar}.svg` — viewBox `0 0 220 240`; base group = Tier I; `[data-tier="2"]` layers show at Lv4+, `[data-tier="3"]` at Lv7+ (additive — hide for lower tiers). `sprites/CreaturePortrait.jsx` — React component, props `creature|tier|width` (adapt to TSX). `sprites/motif-glyphs.svg` — 16px constellation/sigil-ring/peak/rising-line icons (currentColor) for task rows, filters, email, radar labels.
- **Tier III is a "gold event"** on every creature: star crown / gold flora / gold mane streaks / gold glow.
- **Rendering law for any new art:** flat fills, no outlines, two-step shading (base + darker lower-right), domain 300/500/700 + ink `#12141A` / bone `#E9E2D0` / gold `#D9A441` + shared brown `#A9765C`/`#7E523E`, visible eyes with bone highlight, one gold trim, legible at 56px.

### 7b. The Garden (decorative layer, cut-safe)
A slim generative strip on Today and a full-width scene atop History: four patches, one per member; plant count, height and glow derive from that domain's trailing-7-day XP vs pace (thriving / steady / wilting label from the average). Plant positions/species/sway phase are hashed from `(domain, index)` — regrows from data, no stored scene. Night palette: ink sky, hills `#131B15`/`#0F1510`, plants in domain-300, gold fireflies scale with overall momentum; creatures stand in their patches (bird flies). **Animation budget:** CSS-only `transform`/`opacity` (sway, drift, idle-bob), no JS animation loop, ≤80 DOM nodes, honor `prefers-reduced-motion`. Build only after all functional acceptance items pass; the Today strip alone is enough for MVP.

---
*Archived v1 (medallion busts) follows for reference.*

**Explored options (recorded):** A Modern Pixel RPG (indie-sprite refinement; high 1-hr cost) · B Illustrated Character Cards (painterly; needs image-gen, consistency risk) · C Clean Vector Fantasy (flat geometric, hand-codable) · D Graphic-Novel RPG (inked; quality unforgiving).
**Selected (user decision, recorded 2026-08-05): "Detailed Vector Fantasy" — Option C's rendering with Option A's per-character variety.** User specifically asked for: more detail than the preview, visible **eyes on every character**, **arms/hands**, the same shadow treatment and palette, and strong differentiation between the four (the pixel lineup's variety level).

**Shared rules (one coherent set):** chest-up bust centered in a circular medallion; straight-on camera, gesture implies pose; head ≈ ⅓ bust height, identical head size/eye spacing across all four; the party is one recurring protagonist in four vocations — warm brown skin `#A9765C` (shadow `#7E523E`), two dark almond eyes with a 1px bone highlight, simple brow, no/minimal mouth; **flat fills, no outlines**; two-step shading = base + darker shape on the lower-right of every form, one consistent upper-left key light; one gold `#D9A441` trim element per character; medallion background = radial domain-700 → ink `#12141A` + 3–5 faint constellation dots; palette per portrait = its domain 300/500/700 + shared ink/bone/gold/skin; 25–45 shapes each — must stay legible at 56px (squint test required). Variety comes from silhouette, headwear, gesture, and prop — never from changing the rendering style. Motifs are **charts-as-magic**.

**Individual specs (initial = Tier I):**
- **Data Spellcaster** (Work, violet): tall pointed hood offset left; right arm raised, open hand conjuring a 5-node constellation scatter joined by hairlines (violet-300); slender staff diagonal behind shoulder; gold chest-band. Upgrade preview: Tier II adds orbit ring + 3 nodes; Tier III full constellation crown, doubled gold trim.
- **Summoner** (Gourmet Data, green): rounded cowl, layered mantle; both forearms up cradling a floating radial sigil — a donut-chart ring with one bright green-300 segment and a small flame familiar at center; brass ladle-wand tucked at chest; gold clasp. Upgrades: second sigil ring → third ring + second familiar.
- **Strong Warrior** (Body, ember): bare head, short hair, headband; widest shoulder line of the four; left mountain-peak pauldron etched with a 3-bar ascending chart; right arm gripping a kettlebell-headed maul resting on the shoulder; diagonal chest strap, gold buckle. Upgrades: laurel band on pauldron → gold-cracked stone texture, broader cloak silhouette.
- **Scholar** (Finance, gold): flat square scholar's cap with brim; round spectacles over the eyes; high collar; left arm holding an open gilded ledger showing a rising gold-leaf line chart; quill behind ear. Upgrades: one floating coin-orb → three orbs + gold page-edge glow.

**Production prompts** (only if an image-gen tool is actually available — otherwise hand-code SVG):
Shared prefix: *"Flat vector illustration, no outlines, geometric shapes, two-step cel shading, single upper-left light, chest-up bust centered in a circular medallion, warm brown-skinned character with visible almond eyes and expressive arms, charcoal #12141A medallion background with faint constellation dots, gold #D9A441 trim accent, elegant mature minimal fantasy, no text, reads clearly at small size."*
Then per image append the individual spec above with its domain colors; for the **party lineup**: *"Four such medallion busts in a row on charcoal, identical proportions and lighting: violet hooded spellcaster conjuring a constellation; green cowled summoner cradling a radial sigil ring; ember warrior with mountain pauldron and kettlebell maul; gold scholar with square cap, spectacles, open gilded ledger."*
**Assets:** SVG preferred as React components `components/characters/{Work|Gourmet|Body|Finance}Portrait.tsx` (accept `tier` prop, render Tier I now). If raster: 1024×1024 PNG, 1:1, transparent outside the medallion, files `public/characters/{work|gourmet|body|finance}-t1.png`, future tiers `-t2/-t3` same crop. Displayed at 56px (mobile) / 96px (desktop). Medallion ring tiers are CSS (§2), so progression is visible with zero new art.
**Placeholder ladder — art must never block:** (1) full detailed portrait per above → (2) simplified bust: hood/headwear + eyes + shoulders + one arm + motif → (3) sigil-only medallion: domain radial background + motif glyph (constellation / sigil-ring / peak / rising line) in domain-300. Level 3 takes ~5 minutes total and still looks intentional.
**MVP limitation (explicit):** no modular equipment system, sprite sheets, poses, or animation. One coherent Tier-I visual per character + CSS ring tiers + described upgrade previews is complete for this MVP. The working app, persistence, and email outrank final artwork.

## 8. Implementation order (50 min, strict)

- **0–3** Collect credentials: user runs `vercel login`; get `RESEND_API_KEY`; **immediately** run `supabase projects create` (provisions in background); generate `APP_PASSCODE` + `CRON_SECRET`.
- **3–8** `nvm use 22`; scaffold create-next-app in `~/Code/fourfold`; git init/commit; nav shell + dark theme tokens; first `vercel --prod` → URL live.
- **8–12** Apply schema via psql; `lib/db.ts`, `lib/score.ts` (pure functions: points, daily score, levels); set all env vars on Vercel.
- **12–15** Login page + middleware cookie gate.
- **15–27** `GET /api/today` + tasks CRUD routes + Today screen: list, quick-add, complete, edit/delete sheet, score ring, character cards with XP bars (wire `sprites/CreaturePortrait` here if trivial, else at 44–50). Deploy, smoke-test on the live URL.
- **27–33** Email template + `POST /api/briefing/send` + Settings screen. **Send a real email; confirm receipt.**
- **33–37** `POST /api/cron/briefing` + pg_cron schedule SQL + forced-run test via curl with `CRON_SECRET`; verify `cron.job` row.
- **37–44** Task Bank: templates CRUD + Add-to-Today + recurrence materializer; contacts CRUD + Generate-outreach.
- **44–50** History modal (group heatmap first, then member heatmaps/line/radar as time allows); copy `sprites/` in and wire `CreaturePortrait` (art is pre-built — ~5 min); garden strip only if everything else passes; run acceptance checklist; write final report.
If behind schedule at minute 40: cut garden, radar and member heatmaps, then recurrence (`none`-only) — never persistence/email/deploy. Sprites are pre-built and never need cutting; motif glyphs alone are the emergency fallback.

## 9. Acceptance checklist

- [ ] Deployed URL opens (phone + desktop viewport)
- [ ] Private access works (wrong passcode rejected, right one persists)
- [ ] Task can be added, edited, completed, deleted
- [ ] Points/score update correctly (spot-check against §4 examples)
- [ ] Data persists after reload
- [ ] Data visible across devices (second browser/incognito)
- [ ] Reusable template can be added to Today
- [ ] Outreach task can be generated from a contact
- [ ] Real email sent manually and received
- [ ] Scheduled email configured (cron.job row + forced run OK)
- [ ] Email settings persist
- [ ] Phone and desktop layouts both work

---

## NEXT AGENT: IMPLEMENTATION INSTRUCTIONS

You are the implementation agent. You have approximately 50 minutes to build, test, and deploy this MVP.

Treat this specification as fixed. Do not redesign the product, expand its scope, create alternative concepts, or spend time revisiting settled decisions.

Before coding:

1. Read this entire specification.
2. Inspect the available repository, tools, integrations, and credentials.
3. Identify any genuinely blocking missing credential or authorization.
4. Ask for all blocking information at once.
5. Begin implementation immediately.

Prioritize work in this order:

1. Deployed responsive application
2. Private single-user access
3. Add, edit, complete, and delete tasks
4. Hosted cross-device persistence
5. Scoring and domain progress
6. Manual email delivery
7. Scheduled morning email
8. Task Bank
9. Outreach-task generation
10. Settings and history
11. Character visuals and decorative polish

Use the specified visual design, architecture, schema, scoring rules, and art direction. If a decorative asset cannot be completed quickly, use the specified placeholder and continue.

Do not substitute a mockup for a functional feature. Do not claim that email delivery, scheduling, persistence, deployment, or authentication works unless it has actually been tested.

At completion, provide:

* Deployed application URL
* Access instructions
* Confirmation of the tested task flow
* Manual-email test result
* Scheduled-email configuration
* Known limitations
* Any unfinished acceptance criteria
* Repository and deployment details

The full design, implementation, testing, and deployment process has a one-hour total time budget. The design agent has already used approximately 10 minutes. Optimize for a small product that works.
