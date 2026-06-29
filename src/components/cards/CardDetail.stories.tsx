import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Castaway } from "@/types/castaway";
import CardDetail from "./CardDetail";

const cirie: Castaway = {
  id: "cirie",
  name: "Cirie Fields",
  totalPoints: 42,
  eliminated: false,
  weeklyEvents: {},
  inventory: { immunity_idol: 1 },
  tribe: "mavu",
};

const meta: Meta<typeof CardDetail> = {
  title: "Cards/CardDetail",
  component: CardDetail,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-screen sheet a tapped mini-card expands into: big card + dossier + season-event breakdown + actions. Fills its positioned ancestor — the story wraps it in a phone-sized relative box.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 390, height: 720, margin: "0 auto", overflow: "hidden", borderRadius: 24, border: "1px solid var(--line)" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CardDetail>;

export const Default: Story = {
  args: {
    castaway: cirie,
    vibe: "Strategic Mastermind",
    events: [
      { label: "Survived Episodes", points: 6 },
      { label: "Immunity Win", points: 5 },
      { label: "Found Idol", points: 5 },
      { label: "Voted at Tribal", points: 3 },
    ],
    onClose: () => {},
  },
};

export const VotedOut: Story = {
  args: {
    castaway: { ...cirie, id: "out", name: "Ozzy Lusth", totalPoints: 24, eliminated: true, eliminatedWeek: 7 },
    vibe: "Challenge Beast",
    events: [
      { label: "Survived Episodes", points: 7 },
      { label: "Made Jury", points: 3 },
      { label: "Voted Out", points: -10 },
    ],
    onClose: () => {},
  },
};
