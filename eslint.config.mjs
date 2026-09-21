// ESLint flat config.
//
// `next lint` was removed in Next 16, so `npm run lint` shells out to `eslint`
// directly. eslint-config-next ships flat-config arrays (its `core-web-vitals`
// entry already bundles `next` and `next/typescript`), so they spread straight
// in — no FlatCompat shim needed.
import next from "eslint-config-next/core-web-vitals";
import storybook from "eslint-plugin-storybook";

export default [
  {
    // Build output and vendored trees are never worth linting; storybook-static
    // and out/ in particular are minified bundles that produce thousands of
    // meaningless findings.
    ignores: [
      ".next/**",
      "out/**",
      "coverage/**",
      "storybook-static/**",
      "node_modules/**",
      "push-service/node_modules/**",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
  ...next,
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      // Off by choice. Every violation in this codebase is an apostrophe in
      // ordinary prose ("Don't worry", "you're participating"), which React
      // escapes correctly on its own. The rule's real value is catching
      // ambiguous `>` and `"` in JSX text, and it has no autofixer, so
      // enforcing it just means 16 hand-edits that make the copy harder to read.
      "react/no-unescaped-entities": "off",
    },
  },
];
