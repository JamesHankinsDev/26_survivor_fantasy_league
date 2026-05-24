import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PointBadge from "./PointBadge";

const meta: Meta<typeof PointBadge> = {
  title: "Primitives/PointBadge",
  component: PointBadge,
  argTypes: {
    trend: {
      control: "select",
      options: [undefined, "up", "down", "same"],
    },
  },
};
export default meta;
type Story = StoryObj<typeof PointBadge>;

export const Positive: Story = { args: { value: 12 } };
export const Negative: Story = { args: { value: -7 } };
export const Zero: Story = { args: { value: 0 } };
export const Big: Story = { args: { value: 24, big: true } };
export const WithUpTrend: Story = { args: { value: 12, trend: "up" } };
export const WithDownTrend: Story = { args: { value: -3, trend: "down" } };
