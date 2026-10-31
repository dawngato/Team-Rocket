"use client";

import { useEffect, useMemo, useState } from "react";
import {
  castDemoBallot,
  closeElection,
  createDraft,
  INITIAL_DEMO_STATE,
  openElection,
  resetDemo,
  runIntegrityReview,
  type AuditCheck,
  type DemoState,
  type DemoView,
  type ElectionLifecycle,
  type ReceiptStatus,
} from "../lib/demo";

const STORAGE_KEY = "himvote-local-demo-v1";

const views: Array<{ id: DemoView; label: string; short: string }> = [
  { id: "overview", label: "Overview", short: "Start here" },
  { id: "student", label: "Student", short: "Cast once" },
  { id: "admin", label: "Admin", short: "Run lifecycle" },
  { id: "auditor", label: "Auditor", short: "Review limits" },
  { id: "public", label: "Public audit", short: "What is visible" },
];

const receiptStages: Array<{ id: ReceiptStatus; label: string; description: string }> = [
  { id: "SUBMITTED", label: "Submitted", description: "Request reached the casting boundary." },
  { id: "ACCEPTED_PENDING_WITNESS", label: "Accepted · pending witness", description: "Durable local acceptance; no external witness yet." },
  { id: "WITNESSED", label: "Witnessed", description: "Would require an independently held checkpoint." },
  { id: "FINAL_INCLUDED", label: "Final included", description: "Would require a fresh terminal checkpoint." },
  { id: "TALLIED", label: "Tallied", description: "Would require native tally evidence and result comparison." },
];

function readDemoState(): DemoState {
  if (typeof window === "undefined") return INITIAL_DEMO_STATE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as DemoState) : INITIAL_DEMO_STATE;
  } catch {
    return INITIAL_DEMO_STATE;
  }
}

function formatTime(value?: string) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function lifecycleTone(status?: ElectionLifecycle) {
  if (status === "OPEN") return "teal";
  if (status === "CLOSED") return "amber";
  return "neutral";
}

function Tone({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "teal" | "amber" | "rose" }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function IntegrityNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`integrity-notice ${compact ? "integrity-notice-compact" : ""}`} aria-label="Prototype limitation">
      <div className="notice-mark" aria-hidden="true">i</div>
      <div>
        <strong>Integrity-only educational prototype</strong>
        <p>
          This browser demo models lifecycle and duplicate handling with synthetic data. It does not provide encrypted ballot secrecy, a native voting-engine tally proof, an external witness, or blockchain trust.
        </p>
      </div>
    </aside>
  );
}

function Lifecycle({ status }: { status?: ElectionLifecycle }) {
  return (
    <div className="lifecycle" aria-label="Election lifecycle">
      {(["DRAFT", "OPEN", "CLOSED"] as ElectionLifecycle[]).map((step) => (
        <div className={`lifecycle-step ${status === step ? "current" : ""}`} key={step}>
          <span className="lifecycle-dot" aria-hidden="true" />
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

function ReceiptTimeline({ status }: { status?: ReceiptStatus }) {
  const currentIndex = status ? receiptStages.findIndex((stage) => stage.id === status) : -1;
  return (
    <ol className="receipt-timeline" aria-label="Receipt status timeline">
      {receiptStages.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isPast = currentIndex > index;
        return (
          <li className={`${isCurrent ? "timeline-current" : ""} ${isPast ? "timeline-past" : ""}`} key={stage.id}>
            <span className="timeline-marker" aria-hidden="true">{isPast ? "✓" : index + 1}</span>
            <div>
              <strong>{stage.label}</strong>
              <p>{stage.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AuditCheckRow({ check }: { check: AuditCheck }) {
  const tone = check.status === "OBSERVED" ? "teal" : check.status === "NOT_CONNECTED" ? "amber" : "rose";
  return (
    <li className="audit-row">
      <div>
        <strong>{check.label}</strong>
        <p>{check.detail}</p>
      </div>
      <Tone tone={tone}>{check.status.replaceAll("_", " ")}</Tone>
    </li>
  );
}

export default function HomePage() {
  const [view, setView] = useState<DemoView>("overview");
  const [state, setState] = useState<DemoState>(INITIAL_DEMO_STATE);
  const [selectedCandidate, setSelectedCandidate] = useState("candidate-asha-patel");
  const [announcement, setAnnouncement] = useState("Local demo ready.");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readDemoState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const election = state.election;
  const activeCandidate = useMemo(
    () => election?.candidates.find((candidate) => candidate.id === selectedCandidate),
    [election, selectedCandidate],
  );

  function apply(nextState: DemoState, message: string) {
    setState(nextState);
    setAnnouncement(message);
  }

  function handleCast() {
    const result = castDemoBallot(state, state.receipt ? "demo-retry-002" : "demo-request-001");
    apply(result.state, result.message);
  }

  return (
    <main className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="wordmark" onClick={() => setView("overview")} aria-label="HimVote overview">
            <span className="wordmark-seal" aria-hidden="true">SV</span>
            <span>
              <strong>HimVote</strong>
              <small>campus election lab</small>
            </span>
          </button>
          <div className="topbar-meta">
            <Tone tone="amber">Synthetic data only</Tone>
            <button className="text-button" onClick={() => apply(resetDemo(), "Local demo reset.")}>Reset demo</button>
          </div>
        </div>
      </header>

      <section className="nav-wrap" aria-label="Portal views">
        <nav className="view-nav" role="tablist" aria-label="HimVote portal views">
          {views.map((item) => (
            <button
              className={`view-tab ${view === item.id ? "view-tab-active" : ""}`}
              key={item.id}
              role="tab"
              aria-selected={view === item.id}
              aria-controls={`${item.id}-panel`}
              tabIndex={view === item.id ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const currentIndex = views.findIndex((candidate) => candidate.id === item.id);
                const nextIndex = event.key === "ArrowRight"
                  ? (currentIndex + 1) % views.length
                  : (currentIndex - 1 + views.length) % views.length;
                setView(views[nextIndex].id);
                window.requestAnimationFrame(() => document.getElementById(`view-tab-${views[nextIndex].id}`)?.focus());
              }}
              onClick={() => setView(item.id)}
              id={`view-tab-${item.id}`}
            >
              <span>{item.label}</span>
              <small>{item.short}</small>
            </button>
          ))}
        </nav>
      </section>

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

      <div className="page-frame" id="main-content">
        {view === "overview" && (
          <section id="overview-panel" role="tabpanel" tabIndex={-1}>
            <div className="hero-grid">
              <div className="hero-copy">
                <p className="eyebrow">A small, inspectable voting surface</p>
                <h1>Make the record legible before making the claim.</h1>
                <p className="hero-lede">
                  HimVote is a campus election prototype for testing the seams between eligibility, casting, evidence, and independent review. The browser demo below is deliberately modest: it shows what the application knows, and where it stops.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => setView("student")}>Open student view <span aria-hidden="true">→</span></button>
                  <button className="button button-secondary" onClick={() => setView("auditor")}>Inspect audit limits</button>
                </div>
                <div className="hero-footnote"><span className="signal-line" aria-hidden="true" /> Local browser state · no backend calls · no live election data</div>
              </div>
              <div className="hero-plate" aria-label="Integrity boundary overview">
                <div className="plate-header"><span>Boundary map</span><span>v0.1 local</span></div>
                <div className="boundary-flow">
                  <div className="boundary-node boundary-node-active"><small>01</small><strong>Eligibility</strong><span>student account</span></div>
                  <div className="flow-arrow" aria-hidden="true">→</div>
                  <div className="boundary-node boundary-node-active"><small>02</small><strong>Acceptance</strong><span>one local receipt</span></div>
                  <div className="flow-arrow" aria-hidden="true">→</div>
                  <div className="boundary-node boundary-node-muted"><small>03</small><strong>Witness</strong><span>not connected</span></div>
                </div>
                <div className="plate-divider" />
                <p><strong>What this proves:</strong> a visible, repeatable local state transition.</p>
                <p><strong>What it does not prove:</strong> ballot secrecy, tally correctness, or operator independence.</p>
              </div>
            </div>

            <IntegrityNotice />

            <div className="overview-grid">
              <article className="feature-block">
                <p className="eyebrow">For students</p>
                <h2>Cast once, then read the receipt state carefully.</h2>
                <p>The student view separates an accepted local request from the stronger states that need an external witness and a native voting-engine verifier.</p>
                <button className="inline-link" onClick={() => setView("student")}>Go to student flow <span aria-hidden="true">↗</span></button>
              </article>
              <article className="feature-block">
                <p className="eyebrow">For election officers</p>
                <h2>Move a synthetic election through three explicit states.</h2>
                <p>Create a draft, open it, and close it. The UI never turns a lifecycle event into a cryptographic security claim.</p>
                <button className="inline-link" onClick={() => setView("admin")}>Open admin console <span aria-hidden="true">↗</span></button>
              </article>
              <article className="feature-block feature-block-dark">
                <p className="eyebrow">For auditors</p>
                <h2>See the missing trust inputs instead of a green badge.</h2>
                <p>Audit rows name the boundary: local integrity is observable; witness history and encrypted tally proof are not implemented here.</p>
                <button className="inline-link link-light" onClick={() => setView("public")}>View public audit surface <span aria-hidden="true">↗</span></button>
              </article>
            </div>
          </section>
        )}

        {view === "student" && (
          <section id="student-panel" role="tabpanel" tabIndex={-1}>
            <SectionTitle eyebrow="Student view" title="Your election desk">
              <Tone tone={lifecycleTone(election?.status)}>{election?.status ?? "NO ELECTION"}</Tone>
            </SectionTitle>
            <div className="content-grid content-grid-student">
              <div className="primary-column">
                <article className="panel panel-featured">
                  <div className="panel-kicker"><span className="section-number">01</span><span>Eligible election</span></div>
                  {election ? (
                    <>
                      <div className="title-row"><div><h2>{election.title}</h2><p className="muted">Synthetic student-union election · one contest</p></div><Tone tone={lifecycleTone(election.status)}>{election.status}</Tone></div>
                      <div className="manifest-line"><span>Manifest reference</span><code>{election.manifestDigest}</code></div>
                      <Lifecycle status={election.status} />
                    </>
                  ) : (
                    <div className="empty-state"><h2>No election is open yet</h2><p>Ask the admin view to create and open the synthetic election before casting.</p><button className="button button-secondary" onClick={() => setView("admin")}>Open admin view</button></div>
                  )}
                </article>

                {election && (
                  <article className="panel">
                    <div className="panel-kicker"><span className="section-number">02</span><span>Candidate review</span></div>
                    <div className="candidate-list" role="radiogroup" aria-label="Choose a candidate for the local demo">
                      {election.candidates.map((candidate) => (
                        <label className={`candidate-row ${selectedCandidate === candidate.id ? "candidate-row-selected" : ""}`} key={candidate.id}>
                          <input type="radio" name="candidate" value={candidate.id} checked={selectedCandidate === candidate.id} onChange={() => setSelectedCandidate(candidate.id)} disabled={Boolean(state.receipt) || election.status !== "OPEN"} />
                          <span className="candidate-mark" aria-hidden="true" />
                          <span><strong>{candidate.name}</strong><small>{candidate.note}</small></span>
                          {selectedCandidate === candidate.id && <span className="selected-note">selected</span>}
                        </label>
                      ))}
                    </div>
                    <p className="microcopy">This selection is used only to exercise the local flow and is not written into the demo receipt or evidence record.</p>
                    <div className="action-row">
                      <button className="button button-primary" onClick={handleCast} disabled={!election || election.status !== "OPEN"}>{state.receipt ? "Try duplicate submission" : "Cast local demo ballot"} <span aria-hidden="true">→</span></button>
                      {activeCandidate && <span className="action-context">Current choice: {activeCandidate.name}</span>}
                    </div>
                    {state.duplicateAttempted && <div className="inline-alert inline-alert-rose" role="alert"><strong>Duplicate rejected.</strong> The second request did not create another accepted receipt.</div>}
                  </article>
                )}
              </div>

              <aside className="secondary-column">
                <article className="panel receipt-panel">
                  <div className="panel-kicker"><span className="section-number">03</span><span>Receipt states</span></div>
                  {state.receipt ? (
                    <>
                      <div className="receipt-id"><span>Opaque local receipt</span><code>{state.receipt.id}</code></div>
                      <Tone tone="amber">{state.receipt.status.replaceAll("_", " ")}</Tone>
                      <ReceiptTimeline status={state.receipt.status} />
                      <p className="microcopy">Accepted at {formatTime(state.receipt.acceptedAt)}. No student identity or candidate choice is attached to this demo receipt.</p>
                    </>
                  ) : (
                    <div className="empty-state empty-state-small"><p>Your receipt will appear after a local acceptance.</p><span className="dashed-rule" /></div>
                  )}
                </article>
                <IntegrityNotice compact />
              </aside>
            </div>
          </section>
        )}

        {view === "admin" && (
          <section id="admin-panel" role="tabpanel" tabIndex={-1}>
            <SectionTitle eyebrow="Admin / election officer" title="Lifecycle controls">
              <span className="muted">All actions are local browser state</span>
            </SectionTitle>
            <div className="content-grid content-grid-officer">
              <div className="primary-column">
                <article className="panel panel-featured">
                  <div className="panel-kicker"><span className="section-number">01</span><span>Election setup</span></div>
                  <div className="title-row"><div><h2>{election?.title ?? "Synthetic council election"}</h2><p className="muted">Only synthetic records are used in this browser state.</p></div><Tone tone={lifecycleTone(election?.status)}>{election?.status ?? "DRAFT"}</Tone></div>
                  <div className="officer-actions">
                    {!election && <button className="button button-primary" onClick={() => apply(createDraft(state), "Draft created locally.")}>Create draft election</button>}
                    {election?.status === "DRAFT" && <button className="button button-primary" onClick={() => apply(openElection(state), "Election opened locally.")}>Open election</button>}
                    {election?.status === "OPEN" && <button className="button button-secondary" onClick={() => apply(closeElection(state), "Election closed locally.")}>Close election</button>}
                    {election?.status === "CLOSED" && <span className="closed-note">Lifecycle complete for this local run.</span>}
                  </div>
                  <Lifecycle status={election?.status} />
                </article>

                <article className="panel">
                  <div className="panel-kicker"><span className="section-number">02</span><span>Frozen content preview</span></div>
                  <div className="data-list">
                    <div><span>Manifest</span><strong>{election?.manifestDigest ?? "Created when draft exists"}</strong></div>
                    <div><span>Roster</span><strong>20 synthetic students · approval not connected</strong></div>
                    <div><span>Candidates</span><strong>{election?.candidates.length ?? 3} stable display records</strong></div>
                    <div><span>Result source</span><strong>Accepted evidence only · no counter</strong></div>
                  </div>
                  <p className="microcopy">The interface does not increment candidate totals. A real backend adapter must derive results from validated engine evidence.</p>
                </article>
              </div>
              <aside className="secondary-column">
                <article className="panel activity-panel">
                  <div className="panel-kicker"><span className="section-number">03</span><span>Activity trail</span></div>
                  {state.activity.length ? <ul className="activity-list">{state.activity.slice(0, 6).map((item) => <li key={item.id}><span className={`activity-dot activity-dot-${item.tone}`} aria-hidden="true" /><div><strong>{item.label}</strong><p>{item.detail}</p><small>{formatTime(item.at)}</small></div></li>)}</ul> : <div className="empty-state empty-state-small"><p>No local actions yet.</p></div>}
                </article>
                <IntegrityNotice compact />
              </aside>
            </div>
          </section>
        )}

        {view === "auditor" && (
          <section id="auditor-panel" role="tabpanel" tabIndex={-1}>
            <SectionTitle eyebrow="Independent auditor" title="Separate the checks">
              <Tone tone="amber">INTEGRITY ONLY</Tone>
            </SectionTitle>
            <div className="auditor-intro">
              <p className="large-copy">An audit status is useful only when its trust inputs are visible. This panel intentionally reports what is absent.</p>
              <button className="button button-primary" onClick={() => apply(runIntegrityReview(state), "Integrity-only review recorded. Witness and tally proof remain unavailable.")}>Run local integrity review</button>
            </div>
            <div className="audit-grid">
              <article className="panel audit-summary">
                <div className="audit-score"><span className="audit-score-value">{state.audit.status === "INTEGRITY_ONLY" ? "IO" : "N/A"}</span><span><strong>{state.audit.status === "INTEGRITY_ONLY" ? "Integrity-only review" : "No review recorded"}</strong><small>{state.audit.reviewedAt ? formatTime(state.audit.reviewedAt) : "Run after the demo cast"}</small></span></div>
                <p>“Integrity-only” means the UI can inspect its local state transition. It is not a synonym for verified, private, witnessed, or tallied.</p>
                {state.audit.checks.length ? <ul className="audit-checks">{state.audit.checks.map((check) => <AuditCheckRow check={check} key={check.label} />)}</ul> : <div className="empty-state empty-state-small"><p>No local review yet. The first useful audit input is a completed demo run.</p></div>}
              </article>
              <article className="panel trust-panel">
                <div className="panel-kicker"><span className="section-number">02</span><span>Required external inputs</span></div>
                <ul className="boundary-list">
                  <li><strong>Voting engine</strong><span>Native ballot creation, validation, tally, and verifier.</span><Tone tone="rose">missing</Tone></li>
                  <li><strong>Witness</strong><span>Independently retained signed checkpoint history.</span><Tone tone="amber">not connected</Tone></li>
                  <li><strong>Trust pins</strong><span>Keys and final checkpoint acquired outside the export.</span><Tone tone="rose">missing</Tone></li>
                  <li><strong>Blockchain</strong><span>Not used. A chain would anchor commitments, not validate votes.</span><Tone tone="neutral">out of scope</Tone></li>
                </ul>
              </article>
            </div>
            <IntegrityNotice />
          </section>
        )}

        {view === "public" && (
          <section id="public-panel" role="tabpanel" tabIndex={-1}>
            <SectionTitle eyebrow="Public audit" title="A transparent boundary, not a security theatre page">
              <span className="muted">No login required</span>
            </SectionTitle>
            <div className="public-hero">
              <div><p className="eyebrow">Public package</p><h2>{election?.title ?? "Synthetic campus election"}</h2><p>Public observers can see the prototype state and its limitations. No individual ballot, candidate choice, voter identity, or blockchain transaction is published here.</p></div>
              <Tone tone="amber">DEMO WITH LIMITATIONS</Tone>
            </div>
            <div className="public-grid">
              <article className="panel">
                <div className="panel-kicker"><span className="section-number">01</span><span>Published facts</span></div>
                <dl className="facts-list">
                  <div><dt>Election state</dt><dd><Tone tone={lifecycleTone(election?.status)}>{election?.status ?? "NOT CREATED"}</Tone></dd></div>
                  <div><dt>Accepted local receipts</dt><dd>{state.receipt ? "1" : "0"}</dd></div>
                  <div><dt>Duplicate attempt</dt><dd>{state.duplicateAttempted ? <Tone tone="rose">REJECTED</Tone> : "Not attempted"}</dd></div>
                  <div><dt>Native tally proof</dt><dd><Tone tone="rose">NOT SUPPORTED</Tone></dd></div>
                  <div><dt>External witness</dt><dd><Tone tone="amber">NOT CONNECTED</Tone></dd></div>
                </dl>
              </article>
              <article className="panel public-copy-panel">
                <div className="panel-kicker"><span className="section-number">02</span><span>Read before relying on it</span></div>
                <p>Hashes, receipts, or a local chain can support an evidence story, but none of those alone establish eligibility, ballot secrecy, a correct tally, or independent trust.</p>
                <p>This surface is intentionally suitable for a judge or developer to inspect : not for operating a real election.</p>
                <button className="inline-link" onClick={() => setView("auditor")}>Open the detailed boundary map <span aria-hidden="true">↗</span></button>
              </article>
            </div>
            <div className="public-footnote"><span className="signal-line" aria-hidden="true" /> All records shown are synthetic and stored only in this browser profile.</div>
          </section>
        )}
      </div>

      <footer className="site-footer">
        <div><strong>HimVote</strong><span>synthetic campus election lab</span></div>
        <p>Educational prototype. Do not use for real elections without independent security, privacy, and operational audits.</p>
      </footer>
    </main>
  );
}
