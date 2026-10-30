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
            className={`min-h-[44px] px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-[#157E92] text-[#157E92] dark:text-[#38BDF8] font-semibold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
