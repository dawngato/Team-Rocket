"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { SessionProfile } from "@/lib/identity_client";
import { identityClient } from "@/lib/identity_client";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

export function AppShell({ session, children }: { session: SessionProfile; children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem("himvote_session_receipts");
          window.localStorage.removeItem("himvote_receipts");
        } catch {}
      }
      await identityClient.logout();
    } finally {
      router.replace("/auth/login");
    }
  };
  return <div className="sv-workspace-shell"><WorkspaceSidebar session={session} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={logout} /><div className="sv-workspace-column"><WorkspaceHeader session={session} onOpenMenu={() => setMobileOpen(true)} /><div className="sv-prototype-notice" role="status"><span className="sv-status-dot" aria-hidden="true" /><span><strong>Educational prototype.</strong> Verification statuses are shown only when backed by authoritative evidence.</span></div><main id="main-content" className="sv-workspace-main">{children}</main></div></div>;
}

export function WorkspaceAccessGate({ unavailable = false, unauthorized = false }: { unavailable?: boolean; unauthorized?: boolean }) { const router = useRouter(); return <main id="main-content" className="sv-access-gate"><div className="sv-access-card"><span className="sv-access-icon"><ShieldCheck size={22} aria-hidden="true" /></span><p className="sv-eyebrow">Protected workspace</p><h1>{unavailable ? "Identity service unavailable" : unauthorized ? "You do not have access" : "Sign in to continue"}</h1><p>{unavailable ? "The server-authoritative identity service is not configured or cannot be reached. No private workspace data was loaded." : unauthorized ? "Your server-authorized memberships do not include this workspace. Nothing from the restricted page was loaded." : "This workspace is shown only after the identity service confirms your session and scoped capabilities."}</p><button type="button" className="sv-primary-button" onClick={() => unauthorized ? router.back() : router.push("/auth/login")}>{unauthorized ? "Return to your workspace" : "Go to sign in"}</button><a href="/security-limits" className="sv-secondary-link">Read security limits</a></div></main>; }
