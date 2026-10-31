'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Command,
  Download,
  FileCheck2,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Vote,
  X,
  Users,
  Building,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import './production.css'

interface ProductionNavProps {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const navItems: ProductionNavProps[] = [
  { label: 'Overview', href: '/production-ui', icon: LayoutDashboard },
  { label: 'Elections', href: '/elections', icon: Vote },
  { label: 'Verification', href: '/auditor/verify', icon: ShieldCheck },
  { label: 'Evidence log', href: '/auditor/evidence', icon: FileCheck2 },
]

const events = [
  { title: 'Witness checkpoint sealed', detail: 'Himachal Pradesh Technical University General Election', time: '12 min ago', color: 'cyan' },
  { title: 'Roster sync completed', detail: '1,248 eligible voters verified & cryptographically committed', time: '48 min ago', color: 'violet' },
  { title: 'Team Rocket election initialized', detail: 'Hamirpur Campus · Autumn 2026', time: '2 hrs ago', color: 'amber' },
]

export default function ProductionUIPage() {
  const [active, setActive] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotice, setShowNotice] = useState(true)
  const [toast, setToast] = useState('')
  const frame = useRef<number | null>(null)
  const shellRef = useRef<HTMLElement>(null)
  const nextCursor = useRef({ x: 50, y: 35 })

  useEffect(() => {
    const move = (event: MouseEvent) => {
      nextCursor.current = { x: event.clientX, y: event.clientY }
      if (frame.current === null) {
        frame.current = window.requestAnimationFrame(() => {
          const point = nextCursor.current
          shellRef.current?.style.setProperty('--cursor-x', `${point.x}px`)
          shellRef.current?.style.setProperty('--cursor-y', `${point.y}px`)
          frame.current = null
        })
      }
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => {
      window.removeEventListener('mousemove', move)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [])

  const announce = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  return (
    <main ref={shellRef} className="app-shell" style={{ '--cursor-x': '50vw', '--cursor-y': '35vh' } as React.CSSProperties}>
      <div className="lightning-orb" aria-hidden="true" />
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Command size={17} /></div>
          <span>him<span className="brand-accent">vote</span></span>
          <span className="brand-live">ENTERPRISE</span>
        </div>
        
        <div className="workspace">
          <div className="workspace-avatar">TR</div>
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <strong>Team Rocket Hub</strong>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={`nav-item ${active === label ? 'active' : ''}`}
              onClick={() => { setActive(label); setMenuOpen(false) }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Elections' && <span className="nav-count">3</span>}
            </Link>
          ))}
          <Link
            href="/super-admin/role-requests"
            className="nav-item"
            onClick={() => setMenuOpen(false)}
          >
            <KeyRound size={17} />
            <span>Role Delegation</span>
          </Link>
          <Link
            href="/operations"
            className="nav-item"
            onClick={() => setMenuOpen(false)}
          >
            <Users size={17} />
            <span>Operations Console</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-icon"><Activity size={15} /></div>
            <div>
              <span className="eyebrow">SYSTEM STATUS</span>
              <strong>All nodes nominal</strong>
            </div>
            <span className="status-dot" />
          </div>
          <Link href="/how-it-works" className="nav-item">
            <CircleHelp size={17} />
            <span>Institutional Guide</span>
          </Link>
          <div className="profile">
            <div className="profile-avatar">SA</div>
            <div>
              <strong>Super Administrator</strong>
              <span>superadmin@hptu.ac.in</span>
            </div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumbs">
            <Link href="/" className="hover:text-white transition-colors">Portal</Link>
            <span>/</span>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <Link href="/auth/login" className="icon-button" title="Sign In Portal" aria-label="Sign In Portal">
              <KeyRound size={17} />
            </Link>
            <button className="icon-button has-notification" aria-label="Notifications" onClick={() => announce("3 cryptographic audit proofs verified")}>
              <Bell size={17} />
            </button>
            <div className="top-avatar">TR</div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Hero Section */}
          <div className="hero-row">
            <div>
              <div className="status-kicker">
                <span className="live-pulse" /> Live Institutional Ledger
              </div>
              <h1>Himachal Pradesh Technical University</h1>
              <p className="hero-subtitle">Team Rocket Sovereign Cryptographic Campus Election Infrastructure.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/officer/create" className="create-button inline-flex items-center gap-2">
                <Plus size={17} /> Author Election
              </Link>
            </div>
          </div>

          {showNotice && (
            <div className="notice">
              <div className="notice-icon"><Sparkles size={16} /></div>
              <div>
                <strong>Overhauled Production UI Successfully Integrated</strong>
                <p>Equipped with reactive lighting, multi-agent ledger monitoring, and zero-trust verification.</p>
              </div>
              <button className="notice-close" onClick={() => setShowNotice(false)} aria-label="Dismiss notice">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stats Summary Grid */}
          <section className="stats-grid" aria-label="Workspace summary">
            <article className="stat-card featured">
              <div className="stat-top">
                <span>Active Elections</span>
                <span className="stat-icon"><Radio size={16} /></span>
              </div>
              <div className="stat-number">03</div>
              <div className="stat-meta positive">
                <ArrowUpRight size={14} /> Full cryptographic witness quorum
              </div>
              <div className="spark-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Total Participation</span>
                <span className="stat-icon violet"><Gauge size={16} /></span>
              </div>
              <div className="stat-number">78.4<span className="stat-unit">%</span></div>
              <div className="stat-meta positive">
                <ArrowUpRight size={14} /> 6.2% turnout growth across campus
              </div>
              <div className="progress-line"><span style={{ width: '78%' }} /></div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Verified Voters</span>
                <span className="stat-icon amber"><Fingerprint size={16} /></span>
              </div>
              <div className="stat-number">1,248</div>
              <div className="stat-meta">
                <CheckCircle2 size={14} /> 100% Merkle tree synced
              </div>
              <div className="mini-avatars"><span>SJ</span><span>TD</span><span>+1.2k</span></div>
            </article>
          </section>

          {/* Quick Highlights Strip */}
          <section className="quick-strip" aria-label="Workspace highlights">
            <div className="quick-item">
              <span className="quick-dot cyan" />
              <div>
                <span>Next Closing</span>
                <strong>HPTU Student Council · 2 days remaining</strong>
              </div>
            </div>
            <div className="quick-divider" />
            <div className="quick-item">
              <span className="quick-dot violet" />
              <div>
                <span>Cryptographic Roster</span>
                <strong>100% Zero-Knowledge Blinding</strong>
              </div>
            </div>
            <div className="quick-divider" />
            <div className="quick-item">
              <span className="quick-dot amber" />
              <div>
                <span>Audit & Consensus</span>
                <strong>100% Fully Witnessed Checkpoints</strong>
              </div>
            </div>
          </section>

          {/* Two Column Main Display */}
          <div className="main-grid">
            <section className="panel elections-panel">
              <div className="panel-heading">
                <div>
                  <h2>Operational Elections</h2>
                  <p>Real-time campus election telemetry and participation.</p>
                </div>
                <Link href="/elections" className="text-xs text-[#73d9f2] hover:underline inline-flex items-center gap-1">
                  View All <ArrowUpRight size={14} />
                </Link>
              </div>

              <div className="election-list">
                <ElectionRow
                  title="Campus Student Council General Election"
                  type="University-wide"
                  time="Closes in 2 days"
                  progress={72}
                  voters="896 / 1,248"
                  color="cyan"
                  link="/elections"
                />
                <ElectionRow
                  title="Graduate Research & Academic Council"
                  type="Postgraduate Wing"
                  time="Closes in 6 days"
                  progress={41}
                  voters="104 / 254"
                  color="violet"
                  link="/elections"
                />
                <ElectionRow
                  title="Team Rocket Engineering Society"
                  type="Departmental"
                  time="Starts tomorrow"
                  progress={0}
                  voters="Roster Ready"
                  color="amber"
                  link="/elections"
                />
              </div>
            </section>

            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Audit Log & Verifications</h2>
                  <p>Cryptographic transparency log.</p>
                </div>
                <button className="icon-button subtle" aria-label="Options" onClick={() => announce("Audit log integrity verified")}>
                  <MoreHorizontal size={17} />
                </button>
              </div>

              <div className="activity-list">
                {events.map((event) => (
                  <div className="activity-item" key={event.title}>
                    <span className={`activity-marker ${event.color}`}>
                      <CheckCircle2 size={13} />
                    </span>
                    <div>
                      <strong>{event.title}</strong>
                      <span>{event.detail}</span>
                      <small>{event.time}</small>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/auditor/evidence" className="full-button inline-flex items-center justify-center gap-2 border rounded-lg text-xs hover:border-[#73d9f2] transition-colors">
                Open Comprehensive Evidence Log <ArrowUpRight size={14} />
              </Link>
            </section>
          </div>

          <footer className="footer">
            <span>HimVote Platform • Architected by Team Rocket • Secure & Auditable</span>
            <span>Cryptographic Witness Sync <strong>Online</strong> <Download size={13} /></span>
          </footer>
        </div>

        {toast && <div className="toast" role="status"><CheckCircle2 size={15} /> {toast}</div>}
      </section>
    </main>
  )
}

function ElectionRow({
  title,
  type,
  time,
  progress,
  voters,
  color,
  link,
}: {
  title: string
  type: string
  time: string
  progress: number
  voters: string
  color: string
  link: string
}) {
  return (
    <Link href={link} className="election-row hover:bg-white/[0.02] rounded-lg px-2 transition-colors block">
      <div className="flex items-center gap-3">
        <div className={`election-mark ${color}`}><ClipboardCheck size={18} /></div>
        <div className="election-info flex-1">
          <strong>{title}</strong>
          <span>{type} <i /> {time}</span>
        </div>
        <div className="election-progress">
          <div className="progress-label">
            <span>Participation</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-line">
            <span className={color} style={{ width: `${progress}%` }} />
          </div>
          <small>{voters} voters</small>
        </div>
      </div>
    </Link>
  )
}
