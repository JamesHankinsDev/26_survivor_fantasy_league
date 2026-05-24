"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { ThemeProvider as MUIThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "@/lib/theme";

type ThemeMode = "light" | "dark";
type LayoutMode = "sidebar" | "topnav";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  /**
   * Persisted layout preference. Honored at md+ viewports; below md the
   * sidebar is forced to topnav by the shell regardless of this value.
   */
  layout: LayoutMode;
  setLayout: (next: LayoutMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "themeMode";
const LAYOUT_KEY = "shellLayout";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [layout, setLayoutState] = useState<LayoutMode>("sidebar");

  // Hydrate from localStorage after mount.
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedMode === "dark" || savedMode === "light") setMode(savedMode);

    const savedLayout = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null;
    if (savedLayout === "sidebar" || savedLayout === "topnav") {
      setLayoutState(savedLayout);
    }
  }, []);

  // Drive the data-theme attribute on <html> so token CSS variables cascade.
  useEffect(() => {
    document.documentElement.dataset.theme = mode === "dark" ? "dark" : "cream";
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setLayout = useCallback((next: LayoutMode) => {
    setLayoutState(next);
    localStorage.setItem(LAYOUT_KEY, next);
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo<ThemeContextType>(
    () => ({ mode, toggleTheme, layout, setLayout }),
    [mode, toggleTheme, layout, setLayout],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
