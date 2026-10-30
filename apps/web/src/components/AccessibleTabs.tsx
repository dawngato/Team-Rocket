"use client";

import React, { ReactNode, useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface AccessibleTabsProps {
  tabs: Tab[];
  children: Record<string, ReactNode>;
}

export function AccessibleTabs({ tabs, children }: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-[#1E3352] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold transition-all duration-75 ease-out active:scale-[0.98] rounded-t-lg border-b-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F] ${
              activeTab === tab.id
                ? "border-[#157E92] text-[#157E92] dark:text-[#38BDF8] bg-[#157E92]/5 dark:bg-[#157E92]/10"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-hidden={activeTab === "" ? "false" : "true"}>
        {children[activeTab]}
      </div>
    </div>
  );
}
