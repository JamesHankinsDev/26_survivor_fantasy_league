import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashHero from "./DashHero";
import type { Season } from "@/data/seasons";

const meta: Meta<typeof DashHero> = {
  title: "Dashboard/DashHero",
  component: DashHero,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DashHero>;

const upcomingSeason: Season = {
  number: 51,
  name: "Survivor 51",
  theme: "A new era of strategy",
  premiereDate: new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString().slice(0, 10),
  isActive: false,
};

export const PreSeason: Story = {
  args: {
    mode: "pre-season",
    season: upcomingSeason,
    primaryAction: { label: "Set lineup", href: "#" },
    secondaryAction: { label: "View cast", href: "#" },
  },
};

export const InSeason: Story = {
  args: {
    mode: "in-season",
    weekKicker: "Week 05 · Merge episode",
    episodeTitle: "Live Together, Die Solo",
    lede: (
      <>
        The tribes merge tonight. Your roster locks at{" "}
        <b>Wednesday 8:00 PM ET</b>. One add/drop remaining this week — make it
        count.
      </>
    ),
    primaryAction: { label: "Set lineup", href: "#" },
    secondaryAction: { label: "Watch EP4 recap", href: "#" },
    totalMembers: 142,
    eliminations: { eliminated: 7, total: 24 },
  },
};
