import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EmptyCardSlot from "./EmptyCardSlot";

const meta: Meta<typeof EmptyCardSlot> = {
  title: "Cards/EmptyCardSlot",
  component: EmptyCardSlot,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dashed ghost placeholder for an open roster spot, sized to match TradingCard. Renders as a button when `onClick` is provided.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["mini", "sm", "md", "lg", "xl"] },
  },
};
export default meta;

type Story = StoryObj<typeof EmptyCardSlot>;

export const Default: Story = { args: { size: "md", label: "Add", glyph: "＋" } };
export const Clickable: Story = {
  args: { size: "md", label: "Draft a castaway", onClick: () => {} },
};
export const NoCardsLeft: Story = {
  args: { size: "sm", label: "No cards left", glyph: "∅" },
};
