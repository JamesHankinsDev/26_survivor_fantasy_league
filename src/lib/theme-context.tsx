"use client";

import React, {
  createContext,
  useContext,
  useSyncExternalStore,
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

/**
 * localStorage read as an external store.
 *
 * These preferences can't be read during render (the server has no
 * localStorage, so SSR would emit `light`/`sidebar` and hydration would
 * mismatch), which is why this used to hydrate inside an effect and call
 * setState — costing a render pass and a visible theme flash on every load.
 * useSyncExternalStore is the supported way to read a client-only source:
 * `getServerSnapshot` supplies the SSR default and React swaps in the stored
 * value during hydration without a cascading render.
 *
 * Snapshots return primitives, so referential stability is free.
 */
const storeListeners = new Set<() => void>();

function notifyStoreListeners() {
  for (const listener of storeListeners) listener();
}

function subscribeToStoredPrefs(onChange: () => void) {
  storeListeners.add(onChange);
  // `storage` fires for writes from other tabs; same-tab writes notify directly.
  window.addEventListener("storage", onChange);
  return () => {
    storeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Writes the preference and wakes every subscriber in this tab. */
function writeStoredPref(key: string, value: string) {
  localStorage.setItem(key, value);
  notifyStoreListeners();
}

function readThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" || saved === "light" ? saved : "light";
}

function readLayoutMode(): LayoutMode {
  const saved = localStorage.getItem(LAYOUT_KEY);
  return saved === "sidebar" || saved === "topnav" ? saved : "sidebar";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(
    subscribeToStoredPrefs,
    readThemeMode,
    () => "light" as ThemeMode,
  );
  const layout = useSyncExternalStore(
    subscribeToStoredPrefs,
    readLayoutMode,
    () => "sidebar" as LayoutMode,
  );

  // Drive the data-theme attribute on <html> so token CSS variables cascade.
  useEffect(() => {
    document.documentElement.dataset.theme = mode === "dark" ? "dark" : "cream";
  }, [mode]);

  const toggleTheme = useCallback(() => {
    // localStorage is the source of truth now, so flip the stored value and let
    // the store notification drive the re-render.
    writeStoredPref(THEME_KEY, readThemeMode() === "light" ? "dark" : "light");
  }, []);

  const setLayout = useCallback((next: LayoutMode) => {
    writeStoredPref(LAYOUT_KEY, next);
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
