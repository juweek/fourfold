"use client";

import { useEffect, useMemo, useState } from "react";

type TrackerStatus = "Skipped" | "Needs info" | "To do" | "Watching" | "Applied" | "Drafted";

type TrackerItem = {
  item: string;
  type: string;
  org: string;
  status: TrackerStatus;
  date_applied: string;
  deadline: string;
  next_step: string;
  owner_action_needed: string;
  link: string;
  file: string;
  notes: string;
};

const TRACKER_DATA = `item,type,org,status,date_applied,deadline,next_step,owner_action_needed,link,file,notes
City of Cambridge Web & Creative IFB (data viz scope),proposal-RFP,"City of Cambridge, MA",Skipped,,2026-10-15 11:00 ET,None — full agency contract,no,https://www.cleat.ai/government/contracts/data-visualization-and-infographics-3xge,,Skipped: full agency contract (IFB COC-IFB-FY27-31200 Web & Creative Design Services). Due Thu Oct 15 11am ET.
OACAA State of Poverty in Ohio report design RFP,proposal-RFP,Ohio Association of Community Action Agencies (OACAA),Needs info,,2026-10-16 17:00 ET,"Fill 2 professional references; confirm $3,450 fee OK; attach 2–4 portfolio samples; send to kathryn@oacaa.org",yes,https://oacaa.org/request-for-proposal-report-graphic-design/,/workspace/outreach/drafts/OACAA-proposal-Juweek-Adolphe.pdf; /workspace/outreach/drafts/11-oacaa-sop-graphics.md,"Fixed fee $3,450 (under $3,500 ceiling). Contact Kathryn Clausen, kathryn@oacaa.org. Due Fri Oct 16 5:00 PM ET."
Recurse Center (Winter 1 / Nov 2 batch),residency,Recurse Center,To do,,2026-10-18,Submit written application for Nov 2 batch (on-time deadline Oct 18),yes,https://www.recurse.com/apply,/workspace/outreach/residencies.csv,6 or 12 weeks; NYC hub or remote; core hours 11am–5pm ET. Rolling batches every 6 weeks.
Michigan Central x Newlab Creative Residency 2027 (Art & Tech),residency,Michigan Central / Newlab,Watching,,2026-10-30,Decide whether 12 weeks in Detroit is feasible; draft application if yes,no,https://michigancentral.com/michigan-central-x-newlab-art-technology-residency/,/workspace/outreach/residencies.csv,"$30,000 unrestricted award; 12 weeks in Detroit. Deadline Oct 30 11:59 PM ET."
Processing Foundation Fellowship 2027,application,Processing Foundation,Applied,2026-10-13,2026-11-01,Wait for nomination/invite cycle; confirm official 2027 call details,no,https://processingfoundation.org/programs/fellowships/,,Collective Intelligence / remote track preferred. Residencies.csv listed Nov 1 2026 nominations; applied Oct 13.
City of Douglasville GA strategic plan design (as sub),proposal-RFP,"City of Douglasville, GA",Watching,,2026-11-02,Find prime consultant to team with for RFP 2026-010 design/document production scope,no,https://www.cleat.ai/government/contracts/strategic-planning-and-organizational-consulting-evh9,/workspace/outreach/freelance-asks.csv,"Subcontract to prime: design final Strategic Plan, visual roadmaps, summary docs. Due Nov 2."
Cursor Creator Program,application,Cursor,Applied,2026-10-13,,Wait for program response,no,https://cursor.com/creator-program,/workspace/outreach/pitches.md,Google Form application. Pitch draft in pitches.md section 1.
The Project Perfume pitch,sponsor pitch,The Project Perfume,Drafted,,,Fill personal line; submit affiliate signup and/or email hello@theprojectperfume.com,yes,https://theprojectperfume.goaffpro.com,/workspace/outreach/pitches.md,Affiliate + paid campaign pitch. Contact page: https://theprojectperfume.com/pages/contact
Cold email: ECO-Action (MACAI air data viz),cold outreach,Environmental Community Action Inc. (ECO-Action),Drafted,,,Fill personal line + water tool URL; send via info@eco-act.org asking for Carla Y. Lewis,yes,https://eco-act.org/,/workspace/outreach/cold-emails.md,"Decision-maker: Carla Y. Lewis, ED. Route: info@eco-act.org; office (404) 584-6499. EPA grant 02D45623 viz deliverables."
Cold email: Xocolatl tasting-note map,cold outreach,Xocolatl Small Batch Chocolate,Drafted,,,Fill personal line; submit via site contact form (VISIT > Contact Us),yes,https://xocolatlchocolate.com,/workspace/outreach/cold-emails.md,Decision-makers: founders Elaine Read and Matt Weyandt. No published personal email; use contact form.
Cold email: BRASH Coffee flavor map,cold outreach,BRASH Coffee Roasters,Drafted,,,Fill personal line; send to Info@BRASHCoffee.com (PR & Marketing),yes,https://brashcoffee.com/pages/contact-us,/workspace/outreach/cold-emails.md,Owner/founder name not on site; find via LinkedIn. Route: Info@BRASHCoffee.com.
Cold email: Atlanta Community Food Bank pantry map,cold outreach,Atlanta Community Food Bank,Drafted,,,Fill personal line + pantry tool URL; send to media@acfb.org for Michelle Batts,yes,https://www.acfb.org/,/workspace/outreach/cold-emails.md,"Decision-maker: Michelle Batts, Dir. Marketing & Communications. Route: media@acfb.org. Leadership in transition (interim CEO Oct 5)."
Cold email: AJC Forever Stained ZIP lookup,cold outreach,Atlanta Journal-Constitution (AJC),Drafted,,,Find Sandra Brown via LinkedIn; send pitch (no published email — do not guess @ajc.com),yes,https://www.ajc.com/staff/sandra-brown/,/workspace/outreach/cold-emails.md,"Decision-maker: Sandra Brown, Director of Visuals. Secondary: Charles Minshew (data/AI). Don't guess email."
Airtable Creator Club,application,Airtable,To do,,,Apply via community post announcement,yes,https://community.airtable.com/announcements-6/announcing-the-airtable-creator-club-applications-open-47652,/workspace/outreach/creator-programs.csv,"Perks: unlimited AI credits, early previews, brand amp, possible ad compensation. Fit score 5."
ElevenLabs Creator Partner Program,application,ElevenLabs,To do,,,"Submit online application, then campaign briefs",yes,https://elevenlabs.io/cpp,/workspace/outreach/creator-programs.csv,Credits/cash for top-performing posts (performance-based). Fit score 4.
AlphaGov BI / Dashboard Developer (NHDES water infra),freelance lead,AlphaGov (Casa Moon LLC / AlphaX),To do,,,Apply on Workable; note contingent on AlphaGov winning NHDES bid,yes,https://apply.workable.com/alphax/jobs/view/2E98F42081.md,/workspace/outreach/freelance-asks.csv,1099 project-based; interactive public dashboard for state env agency water-infrastructure funding. Fit 4.
DLH Corp Graphic Artist (CDC NCHHSTP HIV Prevention),freelance lead,DLH Corp,To do,,,Apply on Greenhouse (Job 1487),yes,https://job-boards.greenhouse.io/dlhcorporation/jobs/5260058007,/workspace/outreach/freelance-asks.csv,Atlanta hybrid (telework most days). Graphics for CDC HIV data dissemination. Fit 4. Posted 2026-10-08.
UN OLA Publication Graphic Designer (ocean-governance reports),freelance lead,United Nations Office of Legal Affairs,To do,,,"Confirm listing still open; apply for IC role ($12,240–$15,200; Oct 19 2026–Feb 18 2027)",yes,https://wfhlead.com/publication-graphic-designer-for-legal-ocean-reports/,/workspace/outreach/freelance-asks.csv,4-month part-time individual contractor; InDesign template + format five reports. Fit 3. Remote US/NY tagged.
DRT Strategies Data Visualization Specialist (CDC),freelance lead,DRT Strategies,To do,,,Verify on DRT site; apply if still open,yes,https://wfhbeacon.up.railway.app/job/data-visualization-specialist-remote,/workspace/outreach/freelance-asks.csv,FT $65k–$90k remote US. Publication-ready graphs for public-health/geospatial. Fit 4. Posted 2026-10-11.
Murmuration Data Designer (IC3),freelance lead,Murmuration,To do,,,Confirm post date/age; apply if still open,yes,https://datajobs.com/Murmuration/Data-Designer-Job~521644,/workspace/outreach/freelance-asks.csv,FT $85k–$120k remote US. Civic-data viz for reports/decks/dashboards. Fit 4. Post date not shown.
Grant lead: The Enterprise Center air monitoring dashboard,grant lead,The Enterprise Center,To do,,,Research contact; draft short intro offering viz help tied to grant deliverables,yes,https://www.theenterprisectr.org/,/workspace/outreach/grant-funded-orgs.csv,"EPA 02D46523 $491,171 (through 2028-02-28). Public-facing website + network data visualizations. Fit 5. Chattanooga, TN. Source: https://www.usaspending.gov/award/ASST_NON_02D46523_068"
Grant lead: CCRAB air quality data communication tools,grant lead,Charleston Community Research to Action Board (CCRAB),To do,,,Research contact; draft short intro offering viz help tied to grant deliverables,yes,https://www.ccrab.org/,/workspace/outreach/grant-funded-orgs.csv,"EPA 02D46323 $499,715 (through 2027-02-28). Portfolio of data communication tools for 8 EJ communities. Fit 5. North Charleston, SC."
Grant lead: Atlanta Community Support Project court-data viz,grant lead,Atlanta Community Support Project,To do,,,Research contact; draft short intro offering viz help tied to grant deliverables,yes,https://www.linkedin.com/company/atlanta-community-support-project,/workspace/outreach/grant-funded-orgs.csv,Urban Institute + Microsoft Catalyst 2025. PowerBI viz of de-identified court data + step-by-step guide. Fit 4. Atlanta/Fulton.
Grant lead: SC Children's Trust MIECHV data report for legislators,grant lead,The Children's Trust Fund of South Carolina,To do,,,Research contact; draft short intro offering viz help tied to grant deliverables,yes,https://scchildren.org/,/workspace/outreach/grant-funded-orgs.csv,HRSA MIECHV; Goal 3 collective data report for state legislators 2026–2028. Fit 4. Contact: Chief Partner Engagement Officer.
Grant lead: GASP Pittsburgh air monitoring data summaries,grant lead,Group Against Smog and Pollution (GASP),To do,,,Research contact; draft short intro offering viz help tied to grant deliverables,yes,https://www.gasp-pgh.org/,/workspace/outreach/grant-funded-orgs.csv,"EPA 95315001 $499,781 (through 2027-08-01). Public data summaries every six months. Fit 4. Pittsburgh, PA."
Graphicacy freelance roster,freelance lead,Graphicacy,Drafted,,,Send resume to jobs@graphicacy.com,yes,https://graphicacy.com/careers/,/workspace/outreach/drafts/01-graphicacy-freelance.md,Standing freelance invite. Also listed open in freelance-asks.csv. Contact: jobs@graphicacy.com.
Hilgard Economics freelance report designer,freelance lead,Hilgard Economics,Drafted,,,Send LinkedIn message to Joshua Baum (founding principal),yes,https://www.linkedin.com/posts/joshuabaumwh_hilgard-economics-is-looking-to-add-a-talented-activity-7488026551184449536-ATyy,/workspace/outreach/drafts/02-hilgard-joshua-baum.md,No public email. LinkedIn only. Remote not stated.
Accelerate Change freelance Data Analyst (2026 GOTV),freelance lead,Accelerate Change,Drafted,,,Apply via Trinet; optionally send LinkedIn intro to Kim Hohman (CPO),yes,https://app.trinethire.com/companies/448159-accelerate-action-inc/jobs/123276-data-analyst-freelance-remote,/workspace/outreach/drafts/03-accelerate-change-kim-hohman.md,$70–$95/hr; 10–20 hrs/week; 4 months; US remote.
Spherical Communications Design Contractor,freelance lead,Spherical,Drafted,,,Confirm if seat still open (printed Aug 28 deadline passed); paste Ashby note if applying,yes,https://jobs.ashbyhq.com/spherical/e144df67-dffc-4109-b43a-88780285bc47,/workspace/outreach/drafts/04-spherical-comms-ashby.md,$100/hr; 6 months; 32–40 hrs/week. Late relative to Aug 28 printed deadline.
Omniscient freelance Graphic Designer,freelance lead,Omniscient,Drafted,,,Apply on Ashby; optional LinkedIn to David Ly Khim,yes,https://jobs.ashbyhq.com/omniscient/58af2337-9539-49af-bb14-a2f98281d85c,/workspace/outreach/drafts/05-omniscient.md,Global remote; rolling; possible paid test.
Emperor freelance Reporting Designers / Creatives,freelance lead,Emperor,Drafted,,,Confirm US remote eligibility; apply on Teamtailor with CV + samples,yes,https://emperor.teamtailor.com/jobs/8139649-freelance-reporting-designers-creatives,/workspace/outreach/drafts/06-emperor-reporting.md,Sep/Oct 2026 through Feb/Mar 2027. US/Atlanta eligibility unstated — draft asks.
CUP collaborator network (non-NYC path),freelance lead,Center for Urban Pedagogy (CUP),Drafted,,,Email Clair Beltran for non-NYC collaborator network form (do not apply as NYC designer),yes,https://welcometocup.org/news/making-policy-public-open-call-2026,/workspace/outreach/drafts/07-cup-clair-beltran.md,Designer seat NYC-only / closed. Network path only. clair@welcometocup.org.
"Consumer Reports Senior Designer, Data Visualization (exception)",freelance lead,Consumer Reports,Drafted,,,Only if pursuing exception/freelance overflow — GA not a hire-from state,yes,https://job-boards.greenhouse.io/consumerreports/jobs/5224951007,/workspace/outreach/drafts/08-consumer-reports.md,FT remote but GA blocked. Overflow/exception pitch only.
Stamen contractor network,freelance lead,Stamen,Drafted,,,Email jobs@stamen.com with cover + portfolio/GitHub,yes,https://stamen.com/jobs/,/workspace/outreach/drafts/09-stamen-contractor.md,Standing contractor invite. Remote/Atlanta not stated — do not claim they hire Atlanta remote.
"INFUSE Graphic Designer, Data Visualization",freelance lead,INFUSE,Drafted,,,Apply on Greenhouse as United States (do not pick listing titled Georgia — the country),yes,https://job-boards.greenhouse.io/infuse/jobs/4728341005,/workspace/outreach/drafts/10-infuse.md,Remote contract. Form asks gross monthly USD. Treated as US-allowed per JD holidays line.
ProPublica Freelance Data Reporter pitch (Ryan Little),freelance lead,ProPublica,Applied,2026-10-14,,Wait for reply from Ryan Little,no,https://www.propublica.org/jobs/,,Sent Oct 14 from hello@juweek.studio to ryan.little@propublica.org (subject: Freelance Data Reporter). No reply yet as of Oct 15 morning sweep.
ScentSignal / Shane Leighton perfume price-point collab,collab,ScentSignal (Shane Leighton),Needs info,,,"Open attached CSVs (top50_by_price_points.csv, random50.csv) and follow up with Shane on viz direction",yes,https://mail.google.com/mail/?authuser=hello@juweek.studio#all/thread-f:1879116884084630623,,Met Oct 14; Shane emailed Oct 15 7:58am ET with price-point CSVs. scentsignal.app / shaneleighton.com. Unread as of morning sweep.`;

function parseCsv(text: string): TrackerItem[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const item: any = {};
    headers.forEach((header, i) => {
      item[header.trim()] = values[i]?.trim() || '';
    });
    return item as TrackerItem;
  });
}

function parseDeadline(deadline: string): Date | null {
  if (!deadline || deadline.trim() === '') return null;
  try {
    const match = deadline.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1] + 'T00:00:00');
    }
  } catch {
    return null;
  }
  return null;
}

function daysUntilDeadline(deadline: string): number {
  const deadlineDate = parseDeadline(deadline);
  if (!deadlineDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDeadlineShort(deadline: string): string | null {
  const deadlineDate = parseDeadline(deadline);
  if (!deadlineDate) return null;
  
  const days = daysUntilDeadline(deadline);
  const isToday = days === 0;
  const isSoon = days <= 7;
  
  const dateStr = deadlineDate.toLocaleDateString("en-US", { 
    weekday: isSoon ? "short" : undefined,
    month: "short", 
    day: "numeric"
  });
  
  if (isToday) return "TODAY " + dateStr;
  if (days === 1) return "Sun " + dateStr;
  
  return dateStr;
}

type Column = "due_soon" | "waiting_on_you" | "reach_out" | "waiting_on_them";

function categorizeItem(item: TrackerItem): Column | null {
  if (item.status === "Skipped") return null;
  
  const days = daysUntilDeadline(item.deadline);
  const hasDeadline = days < 999;
  
  if (hasDeadline && days >= 0 && days <= 14) {
    return "due_soon";
  }
  
  if (item.status === "Applied") {
    return "waiting_on_them";
  }
  
  const isNamedContact = item.type.includes("cold outreach") || 
                          item.type.includes("collab") || 
                          item.type.includes("sponsor pitch") ||
                          (item.type.includes("freelance lead") && item.status === "Drafted");
  
  if (isNamedContact && item.owner_action_needed === "yes" && item.status === "Drafted") {
    return "reach_out";
  }
  
  if (item.status === "Needs info" || item.status === "Drafted") {
    return "waiting_on_you";
  }
  
  if (item.status === "To do" && item.owner_action_needed === "yes") {
    return "waiting_on_you";
  }
  
  return null;
}

const COLUMN_META = {
  due_soon: { title: "Due soon", sublabel: "next 14 days", color: "#C85A54", bgColor: "#C85A54" },
  waiting_on_you: { title: "Waiting on you", sublabel: "drafted/needs info", color: "#D4934A", bgColor: "#D4934A" },
  reach_out: { title: "Reach out next", sublabel: "named contact", color: "#5FA573", bgColor: "#5FA573" },
  waiting_on_them: { title: "Waiting on them", sublabel: "applied", color: "#5B7FA5", bgColor: "#5B7FA5" },
};

const MAX_CARDS_PER_COLUMN = 8;

type DraftState = "empty" | "loading" | "saved" | "error";

export function TrackerBoard() {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [error, setError] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [draftStates, setDraftStates] = useState<Map<string, DraftState>>(new Map());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = parseCsv(TRACKER_DATA);
      setItems(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tracker");
    }
  }, []);

  const columns = useMemo(() => {
    const categorized: Record<Column, TrackerItem[]> = {
      due_soon: [],
      waiting_on_you: [],
      reach_out: [],
      waiting_on_them: [],
    };
    
    items.forEach(item => {
      const column = categorizeItem(item);
      if (column) {
        categorized[column].push(item);
      }
    });
    
    categorized.due_soon.sort((a, b) => daysUntilDeadline(a.deadline) - daysUntilDeadline(b.deadline));
    
    return categorized;
  }, [items]);

  const today = new Date().toLocaleDateString("en-US", { 
    weekday: "long",
    month: "short", 
    day: "numeric",
    year: "numeric"
  });

  function getCardKey(item: TrackerItem): string {
    return `${item.org}-${item.item}`;
  }

  function getDraftText(item: TrackerItem): string {
    const existing = drafts.get(getCardKey(item));
    if (existing !== undefined) return existing;
    
    if (item.next_step && item.next_step.trim()) {
      return item.next_step;
    }
    if (item.notes && item.notes.trim()) {
      return item.notes;
    }
    return "";
  }

  function getDraftState(item: TrackerItem): DraftState {
    return draftStates.get(getCardKey(item)) || "empty";
  }

  function toggleCard(item: TrackerItem) {
    const key = getCardKey(item);
    setExpandedCard(expandedCard === key ? null : key);
    
    if (expandedCard !== key && !drafts.has(key)) {
      const initialDraft = getDraftText(item);
      if (initialDraft) {
        setDrafts(new Map(drafts.set(key, initialDraft)));
      }
    }
  }

  function updateDraft(item: TrackerItem, text: string) {
    const key = getCardKey(item);
    setDrafts(new Map(drafts.set(key, text)));
  }

  async function saveDraft(item: TrackerItem) {
    const key = getCardKey(item);
    const draftText = drafts.get(key) || "";
    
    setDraftStates(new Map(draftStates.set(key, "loading")));
    
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: item.item,
          org: item.org,
          draft: draftText,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save draft");
      }
      
      setDraftStates(new Map(draftStates.set(key, "saved")));
      setTimeout(() => {
        setDraftStates(new Map(draftStates.set(key, "empty")));
      }, 3000);
    } catch (err) {
      setDraftStates(new Map(draftStates.set(key, "error")));
      setTimeout(() => {
        setDraftStates(new Map(draftStates.set(key, "empty")));
      }, 3000);
    }
  }

  async function copyDraft(item: TrackerItem) {
    const key = getCardKey(item);
    const draftText = drafts.get(key) || "";
    
    try {
      await navigator.clipboard.writeText(draftText);
      setCopySuccess(key);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  if (error) {
    return (
      <main className="quest-board-page">
        <div className="quest-board-container">
          <p className="error-text">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="quest-board-page">
      <div className="quest-board-container">
        <header className="quest-board-header">
          <h1>Juweek&apos;s Quest Board</h1>
          <p className="quest-board-subtitle">Open quests as of {today}</p>
        </header>

        <div className="quest-board-columns">
          {(Object.keys(COLUMN_META) as Column[]).map(columnKey => {
            const meta = COLUMN_META[columnKey];
            const columnItems = columns[columnKey];
            const visibleItems = columnItems.slice(0, MAX_CARDS_PER_COLUMN);
            const overflowCount = columnItems.length - MAX_CARDS_PER_COLUMN;
            
            return (
              <div key={columnKey} className="quest-column">
                <div 
                  className="quest-column-header" 
                  style={{ backgroundColor: meta.bgColor }}
                >
                  <h2>{meta.title} ({columnItems.length})</h2>
                  <p className="quest-column-sublabel">{meta.sublabel}</p>
                </div>
                <div className="quest-column-cards">
                  {visibleItems.map((item, idx) => {
                    const deadlineStr = formatDeadlineShort(item.deadline);
                    const cardKey = getCardKey(item);
                    const isExpanded = expandedCard === cardKey;
                    const draftText = getDraftText(item);
                    const draftState = getDraftState(item);
                    const copied = copySuccess === cardKey;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`quest-card ${isExpanded ? 'quest-card-expanded' : ''}`}
                        style={{ borderLeftColor: meta.color }}
                      >
                        <div 
                          className="quest-card-header-section"
                          onClick={() => toggleCard(item)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h3 className="quest-card-title">{item.org}</h3>
                          <p className="quest-card-desc">{item.next_step || item.type}</p>
                          {deadlineStr && (
                            <p className="quest-card-date" style={{ color: meta.color }}>
                              {deadlineStr}
                            </p>
                          )}
                        </div>
                        
                        {isExpanded && (
                          <div className="quest-card-draft">
                            <label className="draft-label">Draft email</label>
                            <textarea
                              className="draft-textarea"
                              value={draftText}
                              onChange={(e) => updateDraft(item, e.target.value)}
                              placeholder="Write your draft email here..."
                              rows={6}
                            />
                            <div className="draft-actions">
                              <button
                                className="draft-button draft-button-save"
                                onClick={() => saveDraft(item)}
                                disabled={draftState === "loading"}
                              >
                                {draftState === "loading" && "Saving..."}
                                {draftState === "saved" && "✓ Saved"}
                                {draftState === "error" && "✗ Error"}
                                {draftState === "empty" && "Save"}
                              </button>
                              <button
                                className="draft-button draft-button-copy"
                                onClick={() => copyDraft(item)}
                              >
                                {copied ? "✓ Copied" : "Copy draft"}
                              </button>
                            </div>
                            {draftState === "error" && (
                              <p className="draft-error">
                                Failed to save. Check that Vercel KV is configured.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {overflowCount > 0 && (
                    <div className="quest-card quest-card-more" style={{ borderLeftColor: meta.color }}>
                      <p className="quest-card-more-text">+ {overflowCount} more</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="quest-board-footer">
          <span>gourmetdata</span>
        </footer>
      </div>
    </main>
  );
}
