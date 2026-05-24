import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CardHand from "./CardHand";
import type { Castaway } from "@/types/castaway";

const cast: Castaway[] = [
  { id: "c1", name: "Ava Trujillo", totalPoints: 47, eliminated: false, weeklyEvents: {}, tribe: "lakaya" },
  { id: "c2", name: "Marcus Tate", totalPoints: 12, eliminated: false, weeklyEvents: {}, tribe: "mavu" },
  { id: "c3", name: "Priya Mehta", totalPoints: 28, eliminated: false, weeklyEvents: {}, tribe: "yumi" },
  { id: "c4", name: "Devon Reyes", totalPoints: 40, eliminated: false, weeklyEvents: {}, tribe: "lakaya" },
  { id: "c5", name: "Sasha Lin", totalPoints: 22, eliminated: false, weeklyEvents: {}, tribe: "mavu" },
];

const meta: Meta<typeof CardHand> = {
  title: "Cards/CardHand",
  component: CardHand,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Fanned roster layout. Five (or `slots`) cards arc with per-index tilt; hovering any slot lifts that card and pushes its siblings apart (CSS-only, no JS).",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CardHand>;

export const Full: Story = {
  args: { castaways: cast, slots: 5 },
};

export const Partial: Story = {
  args: { castaways: cast.slice(0, 3), slots: 5 },
};

export const SingleCard: Story = {
  args: { castaways: cast.slice(0, 1), slots: 5 },
};

export const Empty: Story = {
  args: { castaways: [], slots: 5 },
};

export const SmallSize: Story = {
  args: { castaways: cast, slots: 5, size: "sm" },
};
