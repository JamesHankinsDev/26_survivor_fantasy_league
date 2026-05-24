import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StatusPill from "./StatusPill";

const meta: Meta<typeof StatusPill> = {
  title: "Primitives/StatusPill",
  component: StatusPill,
  argTypes: {
    status: { control: "select", options: ["active", "jury", "out"] },
  },
};
export default meta;
type Story = StoryObj<typeof StatusPill>;

export const Active: Story = { args: { status: "active" } };
export const Jury: Story = { args: { status: "jury" } };
export const Out: Story = { args: { status: "out" } };
export const CustomLabel: Story = {
  args: { status: "out", label: "ELIMINATED" },
};
export const All: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <StatusPill status="active" />
      <StatusPill status="jury" />
      <StatusPill status="out" />
    </div>
  ),
};
