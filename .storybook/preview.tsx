import type { Preview } from "@storybook/nextjs-vite";
import React, { useEffect } from "react";
import "../src/app/globals.css";

/**
 * Storybook preview wiring. Loads the design-system CSS, exposes a theme
 * toolbar (cream / dark) that drives the same `data-theme` attribute the
 * production app uses, and gives stories a paper-tone background so the
 * primitives' translucent surfaces read correctly.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "Cream",
      values: [
        { name: "Cream", value: "oklch(0.965 0.012 80)" },
        { name: "Dark", value: "oklch(0.16 0.014 50)" },
      ],
    },
    options: {
      storySort: {
        order: ["Primitives", "Cards", "Shell", "*"],
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Design-system theme",
      defaultValue: "cream",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "cream", title: "Cream (light)" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.cards = "shadow";
        const bg =
          theme === "dark" ? "oklch(0.16 0.014 50)" : "oklch(0.965 0.012 80)";
        document.body.style.background = bg;
      }, [theme]);
      return <Story />;
    },
  ],
};

export default preview;
