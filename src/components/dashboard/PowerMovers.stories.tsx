import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PowerMovers from "./PowerMovers";
import type { PowerMoverData } from "./PowerMover";

const movers: PowerMoverData[] = [
  {
    userId: "u1",
    displayName: "Snuff Daddy",
    ownerName: "Jamie H.",
    color: "#E76F3C",
    initials: "JH",
    weekDelta: 24,
    totalPoints: 188,
    rank: 1,
  },
  {
    userId: "u2",
    displayName: "Idol Hands",
    ownerName: "Priya M.",
    color: "#3B8E6E",
    initials: "PM",
    weekDelta: 21,
    totalPoints: 181,
    rank: 2,
  },
  {
    userId: "u3",
    displayName: "Outwit, Outparty",
    ownerName: "Devon R.",
    color: "#7A5AE0",
    initials: "DR",
    weekDelta: 18,
    totalPoints: 174,
    rank: 3,
  },
  {
    userId: "u4",
    displayName: "Torch Goblins",
    ownerName: "Alex K.",
    color: "#C76B3F",
    initials: "AK",
    weekDelta: 16,
    totalPoints: 168,
    rank: 4,
  },
];

const meta: Meta<typeof PowerMovers> = {
  title: "Dashboard/PowerMovers",
  component: PowerMovers,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof PowerMovers>;

export const FullGrid: Story = { args: { movers, selfUserId: "u1" } };
export const TwoMovers: Story = { args: { movers: movers.slice(0, 2), selfUserId: "u1" } };
export const NoSelfHighlight: Story = { args: { movers } };
export const Empty: Story = { args: { movers: [] } };
