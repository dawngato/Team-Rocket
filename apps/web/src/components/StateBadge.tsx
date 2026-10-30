"use client";

import React from "react";
import { ElectionState } from "../lib/types";
import { getStateBadgeConfig } from "../lib/design_tokens";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Vote,
  ShieldCheck,
} from "lucide-react";

export interface StateBadgeProps {
  state: ElectionState;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
}

export function StateBadge({ state, size = "md", showDescription = false }: StateBadgeProps) {
  const config = getStateBadgeConfig(state);

  const getIcon = () => {
    switch (config.iconName) {
      case "check":
        return <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />;
      case "clock":
        return <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />;
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />;
      case "vote":
        return <Vote className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />;
      case "file":
      default:
        return <FileText className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />;
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3.5 py-1.5 text-sm font-semibold gap-2",
  }[size];

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center rounded-md border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses} tracking-wide transition-colors`}
        role="status"
        aria-label={`State: ${config.label}. ${config.description}`}
      >
        {getIcon()}
        <span>{config.label}</span>
        {config.isConfirmed && (
          <span className="sr-only">(Cryptographically confirmed property)</span>
        )}
      </span>
      {showDescription && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {config.description}
        </span>
      )}
    </div>
  );
}
