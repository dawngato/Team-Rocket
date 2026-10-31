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
  Plus,
  Users,
  Check,
  Trash2,
  Shield,
} from "lucide-react";
import "./operations.css";
import { electionClient } from "@/lib/election_client";
import { apiClient } from "@/lib/api_client";
import type { Election, AuditEvent } from "@/lib/types";
import { SAMPLE_CAMPUS_ELECTIONS } from "@/lib/sample_elections";

// Team Rocket: 4-Person Institutional Operations Board
interface TeamOperator {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  status: "Active" | "Standby";
}

const TEAM_ROCKET_OPERATORS: TeamOperator[] = [
  {
    id: "op_sujal",
    name: "Sujal",
    initials: "SJ",
    role: "Lead Systems & Security Architect",
    email: "sujal@hptu.ac.in",
    status: "Active",
  },
  {
    id: "op_tushar",
    name: "Tushar Dhiman",
    initials: "TD",
    role: "Chief Verification & Witness Officer",
    email: "tdhiman1923@hptu.ac.in",
    status: "Active",
  },
  {
    id: "op_abhishek",
    name: "Abhishek",
    initials: "AB",
    role: "Lead Campus Registrar & Roster Auditor",
    email: "ab8188036@hptu.ac.in",
    status: "Active",
  },
  {
    id: "op_kerberosec",
    name: "KerberoSec",
    initials: "KS",
    role: "Chief Cryptographic Auditor",
    email: "arungaming1973@hptu.ac.in",
    status: "Active",
  },
];

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
  votes: number;
  eligible: number;
  color: "teal" | "violet" | "amber";
  verified: boolean;
  createdBy: string;
}

const STORAGE_KEY_OPERATIONAL_ELECTIONS = "himvote_operations_team_elections_v1";

export default function OperationsConsolePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartRange, setChartRange] = useState<"30d" | "7d">("30d");

  // Selected operator out of the 4 Team Rocket members
  const [currentOperator, setCurrentOperator] = useState<TeamOperator>(TEAM_ROCKET_OPERATORS[0]);
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);

  // Elections state with user-persistence & creation capability
  const [elections, setElections] = useState<OperationalElection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Election Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("General Campus Election");
  const [newEligible, setNewEligible] = useState(2500);
  const [newStatus, setNewStatus] = useState<"Active" | "Scheduled">("Active");

  // Load elections on mount: load from localStorage or initialize with sample campus elections
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_OPERATIONAL_ELECTIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setElections(parsed);
            return;
          }
        }
      } catch {}
    }

    // Default initialization mapped across our 4 team operators
    const initial: OperationalElection[] = [
      {
        id: "elec_hptu_sc_2026",
        name: "HPTU Student Council Presidential Election 2026",
        type: "General Campus Election",
        status: "Active",
        turnout: "71.1%",
        votes: 3412,
        eligible: 4800,
        color: "teal",
        verified: true,
        createdBy: "Sujal (Lead Systems)",
      },
      {
        id: "elec_eng_soc_2026",
        name: "Engineering & Applied Sciences Society",
        type: "Departmental Election",
        status: "Scheduled",
        turnout: "—",
        votes: 0,
        eligible: 1450,
        color: "violet",
        verified: false,
        createdBy: "Tushar Dhiman (Witness Officer)",
      },
      {
        id: "elec_res_hall_2026",
        name: "Residence Hall Governance Council",
        type: "Campus Division Election",
        status: "Concluded",
        turnout: "82.1%",
        votes: 612,
        eligible: 745,
        color: "amber",
        verified: true,
        createdBy: "Abhishek (Registrar Auditor)",
      },
      {
        id: "elec_cultural_2026",
        name: "Campus Arts & Cultural Directorate",
        type: "Campus Division Election",
        status: "Active",
        turnout: "64.8%",
        votes: 872,
        eligible: 1345,
        color: "teal",
        verified: true,
        createdBy: "KerberoSec (Crypto Auditor)",
      },
    ];

    setElections(initial);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY_OPERATIONAL_ELECTIONS, JSON.stringify(initial));
      } catch {}
    }
  }, []);

  const saveElections = (nextList: OperationalElection[]) => {
    setElections(nextList);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY_OPERATIONAL_ELECTIONS, JSON.stringify(nextList));
      } catch {}
    }
  };

  const handleCreateElection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const initialVotes = newStatus === "Active" ? 1 : 0;
    const turnoutStr = newStatus === "Active" ? `${((initialVotes / newEligible) * 100).toFixed(1)}%` : "—";

    const created: OperationalElection = {
      id: `elec_${Date.now()}`,
      name: newTitle.trim(),
      type: newType,
      status: newStatus,
      turnout: turnoutStr,
      votes: initialVotes,
      eligible: Number(newEligible) || 1000,
      color: newStatus === "Active" ? "teal" : "violet",
      verified: newStatus === "Active",
      createdBy: `${currentOperator.name} (${currentOperator.role.split(" ")[0]})`,
    };

    saveElections([created, ...elections]);
    setNewTitle("");
    setCreateModalOpen(false);
  };

  const handleDeleteElection = (id: string) => {
    saveElections(elections.filter((e) => e.id !== id));
  };

  // Derived metrics dynamically calculated from the live active elections
  const metrics = useMemo(() => {
    const activeList = elections.filter((e) => e.status === "Active");
    const totalVotes = elections.reduce((acc, e) => acc + (e.votes || 0), 0);
    const totalEligible = elections.reduce((acc, e) => acc + (e.eligible || 0), 0);
    const turnout = totalEligible > 0 ? ((totalVotes / totalEligible) * 100).toFixed(1) : "0.0";

    return {
      activeCount: activeList.length,
      totalVotes: totalVotes.toLocaleString("en-IN"),
      avgTurnout: `${turnout}%`,
      totalElections: elections.length,
    };
  }, [elections]);

  const filteredElections = useMemo(() => {
    if (!searchQuery.trim()) return elections;
    const q = searchQuery.toLowerCase();
    return elections.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.createdBy.toLowerCase().includes(q)
    );
  }, [elections, searchQuery]);

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
            <span>Team Rocket Operations</span>
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
            HPTU
          </span>
          <span className="workspace-copy">
            <b>Himachal Pradesh Tech Univ</b>
            <small>Team Rocket 4-Person Governance</small>
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
            <span>Help Center &amp; Architecture</span>
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

        {/* Sidebar Footer with 4-Person Active Operator Switcher */}
        <div className="sidebar-footer">
          <div className="security-note" role="status">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <b>Team Quorum Active</b>
              <small>4-Operator Multi-Sig Consensus</small>
            </div>
          </div>

          {/* Active Operator Selector */}
          <div className="relative">
            <button
              type="button"
              className="profile-row w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
              onClick={() => setOperatorDropdownOpen(!operatorDropdownOpen)}
              aria-label="Switch active operator among Team Rocket"
            >
              <span className="profile-avatar" aria-hidden="true">
                {currentOperator.initials}
              </span>
              <span>
                <b>{currentOperator.name}</b>
                <small>{currentOperator.role}</small>
              </span>
              <ChevronDown size={17} aria-hidden="true" />
            </button>

            {operatorDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-slate-800 shadow-xl z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Operator (4 Members)
                </div>
                {TEAM_ROCKET_OPERATORS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setCurrentOperator(op);
                      setOperatorDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full p-2 rounded-xl text-left text-xs transition-colors ${
                      currentOperator.id === op.id
                        ? "bg-teal-500/10 text-[#0b817c] dark:text-cyan-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-[#0b817c]/20 text-[#0b817c] text-[10px] font-bold">
                        {op.initials}
                      </span>
                      <div>
                        <div className="leading-tight">{op.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{op.role}</div>
                      </div>
                    </div>
                    {currentOperator.id === op.id && <Check size={14} className="text-[#0b817c]" />}
                  </button>
                ))}
              </div>
            )}
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
                aria-label="Search campus elections and operators"
                placeholder="Search elections, creators..."
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

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="profile-avatar text-xs font-bold" aria-hidden="true">
                {currentOperator.initials}
              </span>
              <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-white">
                {currentOperator.name}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Page Content */}
        <div className="page-content">
          {/* Page Greeting & Primary CTA */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                Team Rocket Operations Board • {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date())}
              </p>
              <h1>
                Good morning, {currentOperator.name.split(" ")[0]}<span>.</span>
              </h1>
              <p className="subheading">
                Logged in as <b>{currentOperator.role}</b>. All 4 team members can author, monitor, and manage campus elections.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="primary-button cursor-pointer"
            >
              <Plus size={17} aria-hidden="true" />
              <span>Create Campus Election</span>
            </button>
          </div>

          {/* 4-Person Operations Board Overview Banner */}
          <div className="mb-6 p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#0b817c] text-white flex items-center justify-center font-black">
                4P
              </div>
              <div>
                <b className="text-sm text-slate-900 dark:text-white">Team Rocket Multi-Operator Roster</b>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Sujal (Lead Architect), Tushar Dhiman (Witness Officer), Abhishek (Registrar), KerberoSec (Crypto Auditor)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0b817c] dark:text-cyan-300">
              <CheckCircle2 size={16} />
              <span>Full Authoring &amp; Management Permissions</span>
            </div>
          </div>

          {/* Metric Grid Cards */}
          <section className="metric-grid" aria-label="Election summary key performance indicators">
            <article className="metric-card">
              <div className="metric-icon" aria-hidden="true">
                <Vote size={18} />
              </div>
              <p>Active Elections</p>
              <strong>{metrics.activeCount}</strong>
              <span className="metric-trend positive">↗ {metrics.totalElections} total configured</span>
              <div className="mini-bars teal-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon purple" aria-hidden="true">
                <FileCheck2 size={18} />
              </div>
              <p>Total Ballots Cast</p>
              <strong>{metrics.totalVotes}</strong>
              <span className="metric-trend positive">↗ Real-time Merkle commitments</span>
              <div className="mini-bars purple-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon amber" aria-hidden="true">
                <BarChart3 size={18} />
              </div>
              <p>Average Voter Turnout</p>
              <strong>{metrics.avgTurnout}</strong>
              <span className="metric-trend positive">↗ Calculated across live electors</span>
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
              <span className="metric-trend positive">All receipts verifiable</span>
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
                  <h2 id="chart-heading">Voter Turnout &amp; Participation</h2>
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
                  <h2 id="activity-heading">Team Rocket Audit &amp; Event Feed</h2>
                  <p>Real-time audit log authored by all 4 operators</p>
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
                    <b>HPTU Student Council Presidential Election</b>
                    <p>Verified ballot recorded by Sujal</p>
                  </div>
                  <time dateTime="PT2M">2m ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon purple" aria-hidden="true">
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <b>Audit Checkpoint #00428</b>
                    <p>Witness proof cosigned by Tushar Dhiman</p>
                  </div>
                  <time dateTime="PT18M">18m ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon amber" aria-hidden="true">
                    <Settings size={15} />
                  </span>
                  <div>
                    <b>Campus Roster Verified</b>
                    <p>Approved by Abhishek (Registrar)</p>
                  </div>
                  <time dateTime="PT1H">1h ago</time>
                </div>

                <div className="activity-item">
                  <span className="activity-icon blue" aria-hidden="true">
                    <Bell size={15} />
                  </span>
                  <div>
                    <b>Cryptographic Anchor Finalized</b>
                    <p>Dispatched by KerberoSec</p>
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

          {/* Section: Monitored Elections Table with 4-Person Author Column & Actions */}
          <section className="panel elections-table-panel" aria-labelledby="elections-table-heading">
            <div className="panel-heading">
              <div>
                <h2 id="elections-table-heading">Active &amp; Configured Campus Elections</h2>
                <p>Created and supervised by Team Rocket operators (Sujal, Tushar, Abhishek, KerberoSec)</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="text-button cursor-pointer"
              >
                <span>+ Author New Election</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Election</th>
                    <th scope="col">Author (Team Operator)</th>
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          <Users size={12} className="text-[#0b817c]" />
                          {election.createdBy}
                        </span>
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
                        <b className="table-number">{election.votes.toLocaleString("en-IN")}</b>
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
                        <div className="flex items-center gap-1">
                          <Link
                            href="/elections"
                            className="icon-button"
                            aria-label={`View ballot details for ${election.name}`}
                            title="View election details"
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteElection(election.id)}
                            className="icon-button hover:text-rose-500 cursor-pointer"
                            aria-label={`Remove ${election.name}`}
                            title="Remove election"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
              HimVote <b>•</b> Team Rocket 4-Person Campus Operations Governance
            </span>
            <span>
              <span className="footer-status">
                <i aria-hidden="true" />
                <span>Multi-Operator Verified</span>
              </span>
              &nbsp; v2.4.1
            </span>
          </footer>
        </div>
      </section>

      {/* Quick Create Election Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Author New Campus Election
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Publishing as <b>{currentOperator.name}</b> ({currentOperator.role})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="icon-button"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateElection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Election Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of CSE Executive Council 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0b817c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option>General Campus Election</option>
                    <option>Departmental Election</option>
                    <option>Campus Division Election</option>
                    <option>Student Society Election</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Eligible Voters
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={newEligible}
                    onChange={(e) => setNewEligible(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Lifecycle State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus("Active")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      newStatus === "Active"
                        ? "border-[#0b817c] bg-[#0b817c]/10 text-[#0b817c] dark:text-cyan-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    ● Polls Open (Live)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus("Scheduled")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      newStatus === "Scheduled"
                        ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    ○ Scheduled (Upcoming)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0b817c] text-white text-xs font-bold shadow-md hover:bg-[#086b67] cursor-pointer"
                >
                  Confirm &amp; Author Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
