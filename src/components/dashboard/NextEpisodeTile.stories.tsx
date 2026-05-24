import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NextEpisodeTile from "./NextEpisodeTile";

const meta: Meta<typeof NextEpisodeTile> = {
  title: "Dashboard/NextEpisodeTile",
  component: NextEpisodeTile,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof NextEpisodeTile>;

export const InSeason: Story = {
  args: {
    title: "EP 5 · Live Together, Die Solo",
    when: "Wed 8pm ET · CBS",
    stats: [
      { label: "Castaways", value: "17" },
      { label: "Eliminated", value: "7" },
      { label: "Total cast", value: "24" },
    ],
    cta: { label: "Episode log", href: "#" },
  },
};

export const PreSeason: Story = {
  args: {
    title: "Survivor 51 premieres",
    when: "Tue · Sep 23 · 2026",
    stats: [
      { label: "Cast reveal", value: "Soon" },
      { label: "Season", value: "S51" },
      { label: "Status", value: "Upcoming" },
    ],
    cta: { label: "Notify me", href: "#" },
  },
};
