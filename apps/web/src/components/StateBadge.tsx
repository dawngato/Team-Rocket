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
} from "lucide-react";

export interface StateBadgeProps {
  state: ElectionState;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
}

export function StateBadge({ state, size = "md", showDescription = false }: StateBadgeProps) {
  const config = getStateBadgeConfig(state);
  const isLive =
    state === "OPEN" ||
    (state as string) === "TALLYING" ||
    (state as string) === "ACTIVE" ||
    (state as string) === "voting_open";

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
        aria-label={`Election state: ${config.label}. ${config.description}`}
      >
        {isLive && (
          <span className="relative flex h-2 w-2 mr-0.5" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
        )}
        {getIcon()}
        <span>{config.label}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {config.description}
        </span>
      )}
    </div>
  );
}
