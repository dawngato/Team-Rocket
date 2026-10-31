"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";
import { AppShell, WorkspaceAccessGate } from "./AppShell";
import { WorkspaceSkeleton } from "./WorkspaceState";
import { identityClient, IdentityApiError, type SessionProfile } from "../../lib/identity_client";
import { canAccessWorkspaceRoute } from "../../lib/routes/nav_config";

const PUBLIC_PATHS = [
  "/",
  "/elections",
  "/how-it-works",
  "/results",
  "/audit",
  "/security-limits",
  "/accessibility",
  "/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
}

function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`prototype-notice ${compact ? "prototype-notice-compact" : ""}`} role="status">
      <span className="prototype-notice-dot" aria-hidden="true" />
      <span><strong>Educational prototype.</strong> Evidence and security claims remain gated by the authoritative services and independent verifier.</span>
    </div>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const protectedPath = !isPublicPath(pathname);
  const [sessionState, setSessionState] = useState<"loading" | "ready" | "unauthorized" | "unavailable">(protectedPath ? "loading" : "ready");
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!protectedPath) {
      setSessionState("ready");
      setProfile(null);
      return () => { cancelled = true; };
    }

    setSessionState("loading");
    void identityClient.getSession().then((nextProfile) => {
      if (!cancelled) {
        setProfile(nextProfile);
        setSessionState("ready");
      }
    }).catch((cause) => {
      if (cancelled) return;
      setProfile(null);
      setSessionState(cause instanceof IdentityApiError && cause.status === 401 ? "unauthorized" : "unavailable");
    });

    return () => { cancelled = true; };
  }, [protectedPath, pathname]);

  if (!protectedPath) {
    return (
      <>
        <Navbar />
        <PrototypeNotice />
        <main id="main-content" className="flex-1 focus-visible:outline-none">{children}</main>
        <Footer />
      </>
    );
  }

  if (sessionState === "loading") {
    return (
      <div className="sv-workspace-shell">
        <main id="main-content" className="sv-workspace-loading" role="status" aria-live="polite">
          <WorkspaceSkeleton lines={4} />
          <p>Checking your server-authorized session…</p>
        </main>
      </div>
    );
  }

  if (!profile || sessionState !== "ready") {
    return (
      <div className="sv-workspace-shell">
        <WorkspaceAccessGate unavailable={sessionState === "unavailable"} />
      </div>
    );
  }

  if (!canAccessWorkspaceRoute(pathname, profile.roles)) {
    return (
      <div className="sv-workspace-shell">
        <WorkspaceAccessGate unauthorized />
      </div>
    );
  }

  return <AppShell session={profile}>{children}</AppShell>;
}
