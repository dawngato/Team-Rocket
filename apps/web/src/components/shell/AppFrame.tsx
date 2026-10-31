"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";
import { AppShell, WorkspaceAccessGate } from "./AppShell";
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

  const refreshAuth = useCallback(async () => {
    try {
      const nextProfile = await identityClient.refreshSession();
      setProfile(nextProfile);
      if (!canAccessWorkspaceRoute(pathname, nextProfile.roles, nextProfile.scopes)) {
        setSessionState("unauthorized");
      } else {
        setSessionState("ready");
      }
      return nextProfile;
    } catch (cause) {
      setProfile(null);
      setSessionState(cause instanceof IdentityApiError && cause.status === 401 ? "unauthorized" : "unavailable");
      return null;
    }
  }, [pathname]);

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
        if (!canAccessWorkspaceRoute(pathname, nextProfile.roles, nextProfile.scopes)) {
          setSessionState("unauthorized");
        } else {
          setSessionState("ready");
        }
      }
    }).catch((cause) => {
      if (cancelled) return;
      setProfile(null);
      setSessionState(cause instanceof IdentityApiError && cause.status === 401 ? "unauthorized" : "unavailable");
    });

    // P1-28: Immediate role change / revocation refresh on window focus, visibility change, and heartbeat
    const handleRevalidate = () => {
      if (!cancelled) {
        void refreshAuth();
      }
    };

    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);
    const interval = window.setInterval(handleRevalidate, 30000);

    // Listen to identity client logout / session updates
    const unsubscribe = identityClient.onSessionChange((updatedProfile) => {
      if (cancelled) return;
      if (!updatedProfile) {
        setProfile(null);
        setSessionState("unauthorized");
      } else {
        setProfile(updatedProfile);
        if (!canAccessWorkspaceRoute(pathname, updatedProfile.roles, updatedProfile.scopes)) {
          setSessionState("unauthorized");
        } else {
          setSessionState("ready");
        }
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [protectedPath, pathname, refreshAuth]);

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
          <div className="sv-loading-bar" />
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
