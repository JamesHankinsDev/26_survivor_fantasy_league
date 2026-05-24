import type { Config } from "tailwindcss";

/**
 * Tokens point at CSS custom properties declared in `src/app/globals.css`, so
 * theme switching (data-theme=cream|dark) cascades through Tailwind utilities
 * with no rebuild.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-paper": "var(--bg-paper)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-inset": "var(--bg-inset)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-mute": "var(--ink-mute)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        flame: "var(--flame)",
        "flame-deep": "var(--flame-deep)",
        jungle: "var(--jungle)",
        ocean: "var(--ocean)",
        sand: "var(--sand)",
        bone: "var(--bone)",
        danger: "var(--danger)",
      },
      fontFamily: {
        display: ["var(--font-display-stack)"],
        body: ["var(--font-body-stack)"],
        mono: ["var(--font-mono-stack)"],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      spacing: {
        "pad-card": "var(--pad-card)",
        "pad-page": "var(--pad-page)",
        gap: "var(--gap)",
      },
    },
  },
  plugins: [],
};
export default config;
