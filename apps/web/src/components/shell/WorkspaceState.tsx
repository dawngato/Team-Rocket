import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

type WorkspaceStateProps = {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function WorkspaceState({ kind, title, description, actionLabel, onAction, children }: WorkspaceStateProps) {
  const Icon = kind === "error" ? AlertTriangle : kind === "empty" ? Inbox : RefreshCw;
  return (
    <section className={`sv-state sv-state-${kind}`} role={kind === "error" ? "alert" : "status"} aria-live="polite">
      <span className="sv-state-icon" aria-hidden="true"><Icon size={18} className={kind === "loading" ? "sv-state-spin" : undefined} /></span>
      <div className="sv-state-copy">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actionLabel && onAction && <button type="button" className="sv-state-action" onClick={onAction}>{actionLabel}</button>}
    </section>
  );
}

export function WorkspaceSkeleton({ lines = 3 }: { lines?: number }) {
  return <div className="sv-skeleton" role="status" aria-label="Loading workspace"><span className="sr-only">Loading workspace</span>{Array.from({ length: lines }, (_, index) => <span key={index} className={`sv-skeleton-line sv-skeleton-line-${index + 1}`} />)}</div>;
}
