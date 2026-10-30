"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  locale: "en" | "hi";
  setLocale: (l: "en" | "hi") => void;
  currentRole: string;
  setCurrentRole: (r: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within QueryProvider");
  }
  return context;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [locale, setLocale] = useState<"en" | "hi">("en");
  const [currentRole, setCurrentRole] = useState<string>("public");

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("himvote_theme") as "light" | "dark" | null;
      if (storedTheme) {
        setTheme(storedTheme);
        if (storedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Local storage unavailable
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("himvote_theme", next);
      } catch {
        // Local storage unavailable
      }
      return next;
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider
        value={{
          theme,
          toggleTheme,
          locale,
          setLocale,
          currentRole,
          setCurrentRole,
        }}
      >
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}
