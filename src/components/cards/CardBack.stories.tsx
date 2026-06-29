import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CardBack from "./CardBack";

const meta: Meta<typeof CardBack> = {
  title: "Cards/CardBack",
  component: CardBack,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The branded reverse of a TradingCard (torch over a chevron weave). Used for face-down draws, pack reveals, and flips. Same outer frame as the front.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["mini", "sm", "md", "lg", "xl"] },
  },
};
export default meta;

type Story = StoryObj<typeof CardBack>;

export const Default: Story = { args: { size: "md", season: "Season 51" } };
export const Mini: Story = { args: { size: "mini" } };
export const Large: Story = { args: { size: "lg" } };
