"use client";

import React from "react";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#157E92] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#157E92]/50 font-bold"
    >
      Skip to main content
    </a>
  );
}
