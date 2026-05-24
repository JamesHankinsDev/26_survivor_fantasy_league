import { createTheme, type Theme } from "@mui/material/styles";

/**
 * MUI theme factory for the redesign.
 *
 * MUI palette values are hex approximations of the `oklch()` design tokens in
 * `src/app/globals.css` — they're what MUI's internal color math (alpha,
 * lighten, darken) is happiest with. Shell + primitive components reference
 * the CSS custom properties directly via `var(--…)`, so subtle drift between
 * the two layers is invisible in practice. Update both lists together if a
 * token shifts meaningfully.
 */

const TOKENS = {
  cream: {
    bg: "#F6F1E8",
    bgPaper: "#FFFFFF",
    bgElevated: "#FBF7EF",
    bgInset: "#EBE3D4",
    ink: "#1F1A12",
    inkSoft: "#6E5F4F",
    inkMute: "#9A8C7B",
    line: "#DCD2BF",
    lineStrong: "#B9AC95",
  },
  dark: {
    bg: "#1E1A14",
    bgPaper: "#272320",
    bgElevated: "#2C2825",
    bgInset: "#181513",
    ink: "#F0EAE0",
    inkSoft: "#BDB6AA",
    inkMute: "#857F75",
    line: "#3D3833",
    lineStrong: "#544E47",
  },
} as const;

const ACCENTS = {
  flame: "#E76F3C",
  flameDeep: "#C44A1F",
  jungle: "#3F8654",
  ocean: "#2D6FAA",
  danger: "#C7361F",
} as const;

export const createAppTheme = (mode: "light" | "dark"): Theme => {
  const t = mode === "dark" ? TOKENS.dark : TOKENS.cream;
  return createTheme({
    palette: {
      mode,
      primary: {
        main: ACCENTS.flame,
        light: "#FF8A5C",
        dark: ACCENTS.flameDeep,
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: ACCENTS.ocean,
        light: "#5E96CC",
        dark: "#1F5180",
        contrastText: "#FFFFFF",
      },
      success: { main: ACCENTS.jungle },
      error: { main: ACCENTS.danger },
      background: {
        default: t.bg,
        paper: t.bgPaper,
      },
      text: {
        primary: t.ink,
        secondary: t.inkSoft,
        disabled: t.inkMute,
      },
      divider: t.line,
    },
    typography: {
      fontFamily:
        'var(--font-body), "Schibsted Grotesk", "Helvetica Neue", sans-serif',
      h1: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 800,
        letterSpacing: "-0.03em",
      },
      h2: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 700,
        letterSpacing: "-0.015em",
      },
      h5: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 700,
      },
      h6: {
        fontFamily:
          'var(--font-display), "Bricolage Grotesque", sans-serif',
        fontWeight: 700,
      },
      button: {
        fontWeight: 600,
        letterSpacing: 0,
      },
      caption: {
        letterSpacing: "0.04em",
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Body background + color come from globals.css so theme switching
          // doesn't depend on MUI re-rendering. Leave a no-op override so
          // MUI's CssBaseline doesn't paint over the tokens.
          body: {
            backgroundColor: "var(--bg)",
            color: "var(--ink)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 999,
            fontWeight: 600,
            paddingInline: 18,
            paddingBlock: 9,
          },
          containedPrimary: {
            backgroundColor: t.ink,
            color: t.bg,
            "&:hover": { backgroundColor: ACCENTS.flameDeep, color: "#FFFFFF" },
          },
          outlined: {
            borderColor: t.lineStrong,
            color: t.ink,
            "&:hover": { backgroundColor: t.bgInset, borderColor: t.lineStrong },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: `1px solid ${t.line}`,
            backgroundColor: t.bgPaper,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            letterSpacing: 0.4,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.bgPaper,
            color: t.ink,
            boxShadow: "none",
            borderBottom: `1px solid ${t.line}`,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: t.line },
        },
      },
    },
  });
};
