import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SectionHeader from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  title: "Primitives/SectionHeader",
  component: SectionHeader,
};
export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Basic: Story = {
  args: { title: "Standings" },
};

export const WithEyebrow: Story = {
  args: { eyebrow: "WEEK 6", title: "Top Movers" },
};

export const FlameEyebrow: Story = {
  args: { eyebrow: "TONIGHT", eyebrowFlame: true, title: "Episode Recap" },
};

export const WithAction: Story = {
  args: {
    eyebrow: "ROSTER",
    title: "My Tribe",
    action: (
      <>
        <button className="sfl-btn-tiny">All</button>
        <button className="sfl-btn-tiny primary">Edit</button>
      </>
    ),
  },
};
