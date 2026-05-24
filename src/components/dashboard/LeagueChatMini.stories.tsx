import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LeagueChatMini from "./LeagueChatMini";

const meta: Meta<typeof LeagueChatMini> = {
  title: "Dashboard/LeagueChatMini",
  component: LeagueChatMini,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof LeagueChatMini>;

export const ThreeMessages: Story = {
  args: {
    leagueName: "Smoke Signals 🔥",
    messages: [
      {
        id: "m1",
        authorName: "Priya M.",
        authorInitials: "PM",
        body: "Calling it now — Ava plays an idol Wednesday.",
        time: "8m ago",
      },
      {
        id: "m2",
        authorName: "Devon R.",
        authorInitials: "DR",
        body: "I dropped Marcus. Save your eye-rolls.",
        time: "1h ago",
      },
      {
        id: "m3",
        authorName: "Sasha L.",
        authorInitials: "SL",
        body: "Merge episode is gonna be chaos. Strap in.",
        time: "3h ago",
      },
    ],
  },
};

export const Empty: Story = {
  args: { leagueName: "Quiet League", messages: [] },
};
