"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users2,
  UserCheck2,
  Sliders,
  ShieldAlert,
  FileText,
} from "lucide-react";

export function SuperAdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/super-admin", label: "Overview", icon: LayoutDashboard },
    { href: "/super-admin/institutions", label: "Institutions", icon: Building2 },
    { href: "/super-admin/departments", label: "Departments", icon: GraduationCap },
    { href: "/super-admin/administrators", label: "Administrators", icon: Users2 },
    { href: "/super-admin/role-requests", label: "Role Requests", icon: UserCheck2 },
    { href: "/super-admin/policies", label: "Policies", icon: Sliders },
    { href: "/super-admin/security", label: "Security", icon: ShieldAlert },
    { href: "/super-admin/system-audit", label: "System Audit", icon: FileText },
  ];

  return (
    <nav aria-label="Super Administrator Navigation" className="border-b border-slate-200 dark:border-[#1E3352] mb-8 overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-75 ease-out active:scale-[0.98] select-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#132135] ${
                active
                  ? "bg-[#10233F] text-white dark:bg-[#157E92] shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
