import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TradingCard from "./TradingCard";
import type { Castaway } from "@/types/castaway";

const base: Castaway = {
  id: "c-ava",
  name: "Ava Trujillo",
  totalPoints: 0,
  eliminated: false,
  weeklyEvents: {},
  tribe: "lakaya",
};

const meta: Meta<typeof TradingCard> = {
  title: "Cards/TradingCard",
  component: TradingCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Trading card for a single castaway. Rarity tier (and the gradient frame + footer chip) is derived from `castaway.totalPoints`. See `Cards/TradingCard/Rarities` for one card per tier.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["mini", "sm", "md", "lg", "xl"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof TradingCard>;

export const Default: Story = {
  args: { castaway: { ...base, totalPoints: 20 }, size: "md" },
};

/* ───────── RARITIES ───────── */

export const Common: Story = {
  args: { castaway: { ...base, id: "c-common", name: "Marcus Tate", totalPoints: 8 } },
};

export const Rare: Story = {
  args: { castaway: { ...base, id: "c-rare", name: "Priya Mehta", totalPoints: 22 } },
};

export const Epic: Story = {
  args: { castaway: { ...base, id: "c-epic", name: "Devon Reyes", totalPoints: 30 } },
};

export const Legendary: Story = {
  args: { castaway: { ...base, id: "c-leg", name: "Sasha Lin", totalPoints: 40 } },
};

export const Mythic: Story = {
  args: { castaway: { ...base, id: "c-myth", name: "Bri Walker", totalPoints: 50 } },
};

/* ───────── STATES ───────── */

export const Picked: Story = {
  args: { castaway: { ...base, totalPoints: 28 }, picked: true },
};

export const Dropping: Story = {
  args: { castaway: { ...base, totalPoints: 28 }, dropping: true },
};

export const VotedOut: Story = {
  args: { castaway: { ...base, totalPoints: 22, eliminated: true } },
};

export const WithIdol: Story = {
  args: {
    castaway: {
      ...base,
      totalPoints: 30,
      inventory: { immunity_idol: 2 },
    },
  },
};

export const OnJury: Story = {
  args: {
    castaway: {
      ...base,
      totalPoints: 30,
      weeklyEvents: {
        "7": [{ eventType: "made_jury", count: 1 }],
      },
    },
  },
};

/**
 * Hall of Fame stamps each card with its own season, since the grid mixes
 * castaways from every season. Sits bottom-left, clear of the tribe mark
 * (top-left) and the idol/jury column (top-right).
 */
export const WithSeasonBadge: Story = {
  args: {
    castaway: { ...base, id: "c-hof", name: "Sasha Lin", totalPoints: 44 },
    seasonBadge: "S50",
    size: "sm",
  },
};

export const SeasonBadgeCrowded: Story = {
  args: {
    castaway: {
      ...base,
      id: "c-hof-crowded",
      name: "Bri Walker",
      totalPoints: 52,
      inventory: { immunity_idol: 2 },
      weeklyEvents: { "9": [{ eventType: "made_jury", count: 1 }] },
    },
    seasonBadge: "S49",
    size: "sm",
  },
};

export const Ghost: Story = {
  args: { ghost: true, size: "md" },
};

/* ───────── SIZES ───────── */

export const SizeMini: Story = {
  name: "Size · mini",
  args: { castaway: { ...base, totalPoints: 22 }, size: "mini" },
};

export const SizeSm: Story = {
  name: "Size · sm",
  args: { castaway: { ...base, totalPoints: 22 }, size: "sm" },
};

export const SizeLg: Story = {
  name: "Size · lg",
  args: { castaway: { ...base, totalPoints: 40 }, size: "lg" },
};

export const SizeXl: Story = {
  name: "Size · xl",
  args: { castaway: { ...base, totalPoints: 50 }, size: "xl" },
};

/* ───────── GRID OVERVIEW ───────── */

export const AllRarities: Story = {
  name: "All rarities (grid)",
  parameters: { layout: "padded" },
  render: () => (
    <div
      style={{
        display: "flex",
        gap: 22,
        flexWrap: "wrap",
        alignItems: "flex-start",
      }}
    >
      {[
        { id: "c-c", name: "Common", points: 8 },
        { id: "c-r", name: "Rare", points: 20 },
        { id: "c-e", name: "Epic", points: 30 },
        { id: "c-l", name: "Legendary", points: 40 },
        { id: "c-m", name: "Mythic", points: 50 },
      ].map((c) => (
        <TradingCard
          key={c.id}
          castaway={{
            id: c.id,
            name: c.name,
            totalPoints: c.points,
            eliminated: false,
            weeklyEvents: {},
            tribe: "mavu",
          }}
        />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  name: "All sizes (row)",
  parameters: { layout: "padded" },
  render: () => (
    <div
      style={{
        display: "flex",
        gap: 22,
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}
    >
      {(["mini", "sm", "md", "lg", "xl"] as const).map((size) => (
        <TradingCard
          key={size}
          size={size}
          castaway={{
            ...base,
            id: `c-${size}`,
            name: size.toUpperCase(),
            totalPoints: 30,
          }}
        />
      ))}
    </div>
  ),
};
