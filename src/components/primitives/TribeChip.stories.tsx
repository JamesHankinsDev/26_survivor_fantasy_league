import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TribeChip from "./TribeChip";

const meta: Meta<typeof TribeChip> = {
  title: "Primitives/TribeChip",
  component: TribeChip,
  argTypes: {
    tribe: { control: "select", options: ["lakaya", "mavu", "yumi"] },
  },
};
export default meta;
type Story = StoryObj<typeof TribeChip>;

export const Lakaya: Story = { args: { tribe: "lakaya" } };
export const Mavu: Story = { args: { tribe: "mavu" } };
export const Yumi: Story = { args: { tribe: "yumi" } };
export const Unknown: Story = {
  args: { tribe: "missing" },
  parameters: {
    docs: {
      description: {
        story: "Returns null when the tribe id isn't in the lookup map.",
      },
    },
  },
};
export const All: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <TribeChip tribe="lakaya" />
      <TribeChip tribe="mavu" />
      <TribeChip tribe="yumi" />
    </div>
  ),
};
