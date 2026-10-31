"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumbs" className={`sv-breadcrumbs ${className}`.trim()}>
      <ol className="flex flex-wrap items-center gap-1.5 list-none p-0 m-0 text-xs text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <ChevronRight
                  size={13}
                  className="shrink-0 text-slate-400 dark:text-slate-600"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[320px]"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Helper to build hierarchical breadcrumbs automatically from a pathname and user roles.
 */
export function buildWorkspaceBreadcrumbs(
  pathname: string,
  homeHref: string
): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: "Workspace", href: homeHref }];
  }

  const items: BreadcrumbItem[] = [{ label: "Workspace", href: homeHref }];

  const formatSegment = (seg: string): string => {
    // Decode URI component if needed
    try {
      seg = decodeURIComponent(seg);
    } catch {}
    if (seg.startsWith("elec_") || seg.startsWith("elec-") || seg.startsWith("election-") || seg.length > 20) {
      return `Election ${seg.substring(0, 8)}…`;
    }
    if (seg.startsWith("rec_") || seg.startsWith("receipt-")) {
      return `Receipt ${seg.substring(0, 8)}…`;
    }
    return seg
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Known root prefixes: student, teacher, officer, admin, super-admin, auditor
  let accumulatedPath = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    accumulatedPath += `/${part}`;

    // Skip the first segment if it matches the workspace root (e.g. /student) as "Workspace" already points there
    if (i === 0 && accumulatedPath === homeHref) {
      continue;
    }

    const isLast = i === parts.length - 1;
    const label = formatSegment(part);

    items.push({
      label,
      href: isLast ? undefined : accumulatedPath,
    });
  }

  return items;
}
