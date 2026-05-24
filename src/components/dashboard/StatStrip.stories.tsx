import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StatStrip from "./StatStrip";
import PointBadge from "@/components/primitives/PointBadge";

const meta: Meta<typeof StatStrip> = {
  title: "Dashboard/StatStrip",
  component: StatStrip,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof StatStrip>;

export const Default: Story = {
  args: {
    cells: [
      {
        value: (
          <>
            <span className="sfl-mono">#1</span>
            <PointBadge value={2} trend="up" />
          </>
        ),
        label: "League rank",
        sub: "of 8 tribes · Smoke Signals",
      },
      {
        value: <span className="sfl-mono">188</span>,
        label: "Total points",
        sub: "+24 this week",
      },
      {
        value: <span className="sfl-mono">5/5</span>,
        label: "Active rostered",
        sub: "2 idols held",
      },
      {
        value: <span className="sfl-mono">4🔥</span>,
        label: "Win streak",
        sub: "4 weeks at #1",
      },
    ],
  },
};

export const PreSeason: Story = {
  args: {
    cells: [
      {
        value: <span className="sfl-mono">#—</span>,
        label: "League rank",
        sub: "Season starts soon",
      },
      {
        value: <span className="sfl-mono">0</span>,
        label: "Total points",
        sub: "Pre-season",
      },
      {
        value: <span className="sfl-mono">5/5</span>,
        label: "Active rostered",
        sub: "No eliminations yet",
      },
      {
        value: <span className="sfl-mono">—</span>,
        label: "Win streak",
        sub: "Weeks at #1 (coming soon)",
      },
    ],
  },
};
