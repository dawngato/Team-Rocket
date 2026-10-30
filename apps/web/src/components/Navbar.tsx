"use client";

import Link from "next/link";
import { Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "../lib/query_provider";
import { publicNav } from "../lib/routes/nav_config";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sv-public-header">
      <div className="sv-public-header-inner">
        <Link href="/" className="sv-public-brand" onClick={() => setOpen(false)} aria-label="HimVote home">
          <span className="sv-brand-symbol"><ShieldCheck size={17} aria-hidden="true" /></span>
          <span><strong>HimVote</strong><small>Secure campus elections</small></span>
        </Link>
        <nav className={`sv-public-nav ${open ? "is-open" : ""}`} aria-label="Public navigation">
          {publicNav.map((item) => {
            const active = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            return <Link key={item.href} href={item.href} className={active ? "is-active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>;
          })}
        </nav>
        <div className="sv-public-actions">
          <button type="button" className="sv-header-icon" onClick={toggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <Link href="/auth/login" className="sv-public-login">Sign in</Link>
          <button type="button" className="sv-icon-button sv-public-menu" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
            {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
