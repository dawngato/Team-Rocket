"use client";

import React, { KeyboardEvent, ReactNode, useRef, useState } from "react";

export interface Tab {
  id: string;
  label: string;
}

export interface AccessibleTabsProps {
  tabs: Tab[];
  children: Record<string, ReactNode>;
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function AccessibleTabs({
  tabs,
  children,
  defaultTab,
  onTabChange,
  className = "",
}: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || tabs[0]?.id || ""
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    onTabChange?.(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let targetIndex = -1;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        targetIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        event.preventDefault();
        targetIndex = 0;
        break;
      case "End":
        event.preventDefault();
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (targetIndex >= 0 && targetIndex < tabs.length) {
      const targetTab = tabs[targetIndex];
      handleSelectTab(targetTab.id);
      tabRefs.current[targetTab.id]?.focus();
    }
  };

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-[#1E3352] mb-4"
      >
        {tabs.map((tab, index) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              tabIndex={isSelected ? 0 : -1}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => handleSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`min-h-[44px] px-4 py-2 text-sm font-semibold transition-all duration-75 ease-out active:scale-[0.98] rounded-t-lg border-b-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F] ${
                isSelected
                  ? "border-[#157E92] text-[#157E92] dark:text-[#38BDF8] bg-[#157E92]/5 dark:bg-[#157E92]/10"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isSelected}
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] rounded-xl ${
              isSelected ? "block" : "hidden"
            }`}
          >
            {isSelected && children[tab.id]}
          </div>
        );
      })}
    </div>
  );
}
