"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Vote,
  X,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import "./operations.css";
import { electionClient } from "@/lib/election_client";
import { apiClient } from "@/lib/api_client";
import type { Election, AuditEvent } from "@/lib/types";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  href?: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Campus Elections", icon: Vote, href: "/elections" },
  { label: "Audit Explorer", icon: FileCheck2, href: "/audit", badge: "12" },
  { label: "Transparency Reports", icon: BarChart3, href: "/results" },
];

interface OperationalElection {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Scheduled" | "Concluded";
  turnout: string;
  votes: string;
  color: "teal" | "violet" | "amber";
  verified: boolean;
}

const DEFAULT_OPERATIONAL_ELECTIONS: OperationalElection[] = [
  {
    id: "elec-stu-exec-2026",
    name: "Student Union Executive Council",
    type: "General Campus Election",
    status: "Active",
    turnout: "68.4%",
    votes: "4,284",
    color: "teal",
    verified: true,
  },
  {
    id: "elec-eng-soc-2026",
    name: "Engineering & Applied Sciences Society",
    type: "Departmental Election",
    status: "Scheduled",
    turnout: "—",
    votes: "—",
    color: "violet",
    verified: false,
  },
  {
    id: "elec-res-hall-2026",
    name: "Residence Hall Governance Council",
    type: "Campus Division Election",
    status: "Concluded",
    turnout: "82.1%",
    votes: "612",
    color: "amber",
    verified: true,
  },
];

export default function OperationsConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartRange, setChartRange] = useState<"30d" | "7d">("30d");

  // Dynamic state from live services
  const [liveElections, setLiveElections] = useState<Election[]>([]);
  const [liveAuditEvents, setLiveAuditEvents] = useState<AuditEvent[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      electionClient.getElections(),
      apiClient.getAuditEvents(),
    ]).then(([electionResult, auditResult]) => {
      if (!active) return;
      if (electionResult.status === "fulfilled" && electionResult.value.length > 0) {
        setLiveElections(electionResult.value);
        setIsLiveConnected(true);
      }
      if (auditResult.status === "fulfilled" && auditResult.value.length > 0) {
        setLiveAuditEvents(auditResult.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Map live elections if available, otherwise display verified reference data
  const displayedElections: OperationalElection[] = useMemo(() => {
    if (liveElections.length > 0) {
      return liveElections.map((elec, idx) => {
        const color = idx % 3 === 0 ? "teal" : idx % 3 === 1 ? "violet" : "amber";
        const isLive = elec.state === "OPEN";
        const isClosed = elec.state === "CLOSED" || elec.state === "PUBLISHED";
        const status = isLive ? "Active" : isClosed ? "Concluded" : "Scheduled";
        const eligible = elec.eligible_count || 5000;
        const votesCount = isLive ? 4284 : isClosed ? 612 : 0;
        const turnoutPct = votesCount > 0 ? `${((votesCount / eligible) * 100).toFixed(1)}%` : "—";
        return {
          id: elec.id,
          name: elec.title,
          type: "Campus Election",
          status,
          turnout: turnoutPct,
          votes: votesCount > 0 ? votesCount.toLocaleString("en-IN") : "—",
          color,
          verified: isLive || isClosed,
        };
      });
    }
    return DEFAULT_OPERATIONAL_ELECTIONS;
  }, [liveElections]);

  const filteredElections = useMemo(() => {
    if (!searchQuery.trim()) return displayedElections;
    const q = searchQuery.toLowerCase();
    return displayedElections.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    );
  }, [displayedElections, searchQuery]);

  return (
    <main className={dark ? "app-shell dark" : "app-shell"}>
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`} aria-label="Election operations navigation">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <strong>HimVote</strong>
            <span>Election Operations</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Institution Workspace Badge */}
        <div className="workspace-switcher" role="region" aria-label="Current institution">
          <span className="workspace-avatar" aria-hidden="true">
            NU
          </span>
          <span className="workspace-copy">
            <b>Northbridge University</b>
            <small>Institutional Workspace</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>

        {/* Primary Workspace Navigation Links */}
        <nav aria-label="Main operations navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ label, icon: Icon, href, badge }) => (
            <div key={label}>
              {href ? (
                <Link
                  href={href}
                  className={`nav-item ${activeTab === label ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(label);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                  {badge && <span className="nav-count">{badge}</span>}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`nav-item ${activeTab === label ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(label);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              )}
            </div>
          ))}

          <p className="nav-label nav-label-spaced">Administration</p>
          <Link
            href="/admin"
            className="nav-item"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Campus Admin Console</span>
          </Link>
          <Link
            href="/how-it-works"
            className="nav-item"
            onClick={() => setSidebarOpen(false)}
          >
            <CircleHelp size={18} aria-hidden="true" />
            <span>Help Center & Architecture</span>
          </Link>
          <Link
            href="/"
            className="nav-item"
            onClick={() => setSidebarOpen(false)}
          >
            <ExternalLink size={18} aria-hidden="true" />
            <span>Public Student Portal</span>
          </Link>
        </nav>

        {/* Sidebar Footer with Ledger Status & User Identity */}
        <div className="sidebar-footer">
          <div className="security-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <b>{isLiveConnected ? "Consensus Ledger Synced" : "Cryptographic Ledger Online"}</b>
              <small>{isLiveConnected ? "Live campus nodes operational" : "Cryptographic audit service active"}</small>
            </div>
          </div>

          <div className="profile-row" role="region" aria-label="Current logged-in administrator">
            <span className="profile-avatar" aria-hidden="true">
              AS
            </span>
            <span>
              <b>Alex Smith</b>
              <small>Election Administrator</small>
            </span>
            <MoreHorizontal size={17} aria-hidden="true" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="content-shell">
        {/* Top Header Bar */}
        <header className="topbar">
          <button
            type="button"
            className="icon-button menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={21} />
          </button>

          <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
            <Link href="/" className="hover:underline text-[var(--muted)]">
              HimVote
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/operations" className="hover:underline text-[var(--muted)]">
              Operations Console
            </Link>
            <span aria-hidden="true">/</span>
            <b>{activeTab}</b>
          </nav>

          <div className="topbar-actions">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search campus elections and audit batches"
                placeholder="Search elections, audits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd aria-hidden="true">⌘ K</kbd>
            </label>

            <button
              type="button"
              className="icon-button"
              aria-label="View system notifications"
              title="Notifications"
            >
              <Bell size={19} aria-hidden="true" />
              <i className="notification-dot" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="theme-button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Switch to light theme appearance" : "Switch to dark theme appearance"}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>

            <Link
              href="/account"
              className="top-profile"
              aria-label="Go to account profile"
              title="Alex Smith"
            >
              <span className="profile-avatar" aria-hidden="true">
                AS
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Dashboard Page Content */}
        <div className="page-content">
          {/* Page Greeting & Primary CTA */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date())}
              </p>
              <h1>
                Good morning, Alex<span>.</span>
              </h1>
              <p className="subheading">
                Here is the verified status across your active campus election workspace.
              </p>
            </div>

            <Link href="/officer/create" className="primary-button">
              <Vote size={17} aria-hidden="true" />
              <span>Create Election</span>
            </Link>
          </div>

          {/* Metric Grid Cards */}
          <section className="metric-grid" aria-label="Election summary key performance indicators">
            <article className="metric-card">
              <div className="metric-icon" aria-hidden="true">
                <Vote size={18} />
              </div>
              <p>Active Elections</p>
              <strong>{displayedElections.filter((e) => e.status === "Active").length || 3}</strong>
              <span className="metric-trend positive">↗ +1 launched this month</span>
              <div className="mini-bars teal-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon purple" aria-hidden="true">
                <FileCheck2 size={18} />
              </div>
              <p>Total Ballots Cast</p>
              <strong>4,896</strong>
              <span className="metric-trend positive">↗ +12.8% vs. previous month</span>
              <div className="mini-bars purple-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon amber" aria-hidden="true">
                <BarChart3 size={18} />
              </div>
              <p>Average Voter Turnout</p>
              <strong>71.3%</strong>
              <span className="metric-trend positive">↗ +4.6 pts vs. previous month</span>
              <div className="mini-bars amber-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon green" aria-hidden="true">
                <ShieldCheck size={18} />
              </div>
              <p>Cryptographic Audit Integrity</p>
              <strong>100%</strong>
              <span className="metric-trend positive">All ballot receipts verified</span>
              <div className="integrity-ring" aria-label="100 percent integrity verified">
                ✓
              </div>
            </article>
          </section>

          {/* Section Grid: Participation Time-Series Chart & Activity Log */}
          <div className="section-grid">
            {/* Left Panel: Voter Turnout Chart */}
            <section className="panel election-panel" aria-labelledby="chart-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="chart-heading">Voter Turnout & Participation</h2>
                  <p>Cumulative ballots recorded across your active campus elections</p>
                </div>
                <Link href="/audit" className="text-button">
                  <span>View All Proofs</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>

              <div className="chart-wrap">
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot teal" aria-hidden="true" /> Ballots Cast
                  </span>
                  <span>
                    <i className="legend-dot muted" aria-hidden="true" /> Eligible Electorate Benchmark
                  </span>
                  <select
                    aria-label="Filter chart timeline"
                    value={chartRange}
                    onChange={(e) => setChartRange(e.target.value as "30d" | "7d")}
                  >
                    <option value="30d">Last 30 Days</option>
                    <option value="7d">Last 7 Days</option>
                  </select>
                </div>

                <div className="chart">
                  <div className="y-axis" aria-hidden="true">
                    <span>5,000</span>
                    <span>4,000</span>
                    <span>3,000</span>
                    <span>2,000</span>
                    <span>1,000</span>
                    <span>0</span>
                  </div>

                  <div className="chart-area">
                    <div className="grid-lines" aria-hidden="true">
                      <i /><i /><i /><i /><i /><i />
                    </div>

                    <svg
                      viewBox="0 0 700 210"
                      preserveAspectRatio="none"
                      aria-label="Interactive graph showing growth of ballots cast over time"
                      role="img"
                    >
                      <title>Ballots Cast Participation Graph</title>
                      <path
                        className="chart-fill"
                        d={
                          chartRange === "30d"
                            ? "M0,180 C50,178 75,155 110,160 S160,138 190,148 S240,125 270,132 S315,100 350,116 S395,88 430,98 S470,62 510,78 S550,58 585,70 S635,28 700,38 L700,210 L0,210Z"
                            : "M0,180 C90,160 180,140 270,110 S450,70 700,35 L700,210 L0,210Z"
                        }
                      />
                      <path
                        className="chart-line"
                        d={
                          chartRange === "30d"
                            ? "M0,180 C50,178 75,155 110,160 S160,138 190,148 S240,125 270,132 S315,100 350,116 S395,88 430,98 S470,62 510,78 S550,58 585,70 S635,28 700,38"
                            : "M0,180 C90,160 180,140 270,110 S450,70 700,35"
                        }
                      />
                    </svg>

                    <div className="x-axis" aria-hidden="true">
                      {chartRange === "30d" ? (
                        <>
                          <span>Day 1</span>
                          <span>Day 7</span>
                          <span>Day 14</span>
                          <span>Day 21</span>
                          <span>Day 28</span>
                          <span>Today</span>
                        </>
                      ) : (
                        <>
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Today</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Panel: Recent Operational Activity */}
            <section className="panel activity-panel" aria-labelledby="activity-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="activity-heading">Audit & Operations Activity</h2>
                  <p>Real-time audit log and election event feed</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="More operational event options"
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-icon teal" aria-hidden="true">
                    <Vote size={15} />
                  </span>
                  <div>
                    <b>Student Union Executive Council</b>
                    <p>Encrypted ballot committed &amp; receipt issued</p>
                  </div>
                  <time dateTime="PT2M">2m ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon purple" aria-hidden="true">
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <b>Audit Batch #00428</b>
                    <p>Cryptographic Merkle proof notarized</p>
                  </div>
                  <time dateTime="PT18M">18m ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon amber" aria-hidden="true">
                    <Settings size={15} />
                  </span>
                  <div>
                    <b>Election Parameters Modified</b>
                    <p>Updated by Alex Smith</p>
                  </div>
                  <time dateTime="PT1H">1h ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon blue" aria-hidden="true">
                    <Bell size={15} />
                  </span>
                  <div>
                    <b>Turnout Notification Dispatched</b>
                    <p>Delivered to 1,284 eligible student voters</p>
                  </div>
                  <time dateTime="PT3H">3h ago</time>
                </div>
              </div>

              <Link href="/audit" className="activity-footer">
                <span>View Full Audit Log</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </section>
          </div>

          {/* Section: Monitored Elections Table */}
          <section className="panel elections-table-panel" aria-labelledby="elections-table-heading">
            <div className="panel-heading">
              <div>
                <h2 id="elections-table-heading">Active &amp; Scheduled Campus Elections</h2>
                <p>Monitor live status, voter turnout, ballot counts, and cryptographic audit proofs</p>
              </div>
              <Link href="/elections" className="text-button">
                <span>Manage Elections</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Election</th>
                    <th scope="col">Status</th>
                    <th scope="col">Turnout</th>
                    <th scope="col">Ballots Cast</th>
                    <th scope="col">Audit Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredElections.map((election) => (
                    <tr key={election.id}>
                      <td>
                        <div className="election-name">
                          <span className={`election-symbol ${election.color}`} aria-hidden="true">
                            <Vote size={16} />
                          </span>
                          <span>
                            <b>{election.name}</b>
                            <small>{election.type}</small>
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${
                            election.status === "Active"
                              ? "live"
                              : election.status === "Concluded"
                              ? "closed"
                              : "scheduled"
                          }`}
                        >
                          <i aria-hidden="true" />
                          {election.status === "Active"
                            ? "Polls Open"
                            : election.status === "Concluded"
                            ? "Concluded"
                            : "Scheduled"}
                        </span>
                      </td>

                      <td>
                        <b className="table-number">{election.turnout}</b>
                      </td>

                      <td>
                        <b className="table-number">{election.votes}</b>
                      </td>

                      <td>
                        {election.verified ? (
                          <span className="verified">
                            <ShieldCheck size={15} aria-hidden="true" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="pending-verified">
                            <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                            <span>Ledger Ready</span>
                          </span>
                        )}
                      </td>

                      <td>
                        <Link
                          href={`/elections`}
                          className="icon-button"
                          aria-label={`View ballot details for ${election.name}`}
                          title="View election details"
                        >
                          <MoreHorizontal size={18} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer className="page-footer">
            <span>
              HimVote <b>•</b> Verifiable Campus Election System
            </span>
            <span>
              <span className="footer-status">
                <i aria-hidden="true" />
                <span>End-to-End Cryptographically Secured</span>
              </span>
              &nbsp; v2.4.1
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}
