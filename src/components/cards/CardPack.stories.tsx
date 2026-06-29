import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Castaway } from "@/types/castaway";
import CardPack from "./CardPack";

const TRIBES = ["lakaya", "mavu", "yumi"];
const hand: Castaway[] = [
  "Cirie Fields",
  "Ozzy Lusth",
  "Dee Valladares",
  "Christian Hubicki",
  "Charlie Davis",
  "Q Burdette",
  "Maria Shrime",
  "Rick Devens",
  "Tiffany Nicole",
].map((name, i) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  totalPoints: [42, 24, 36, 18, 30, 12, 22, 49, 61][i],
  eliminated: false,
  weeklyEvents: {},
  tribe: TRIBES[i % TRIBES.length],
}));

const meta: Meta<typeof CardPack> = {
  title: "Cards/CardPack",
  component: CardPack,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Season-start draft. Rip open the sealed Starter Pack, reveal the dealt hand, then mark the extras to discard down to a tribe of `keepCount`. The hand is dealt + persisted upstream so a refresh can't reroll it.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CardPack>;

export const NineDealKeepFive: Story = {
  name: "Deal 9 · keep 5",
  args: {
    open: true,
    hand,
    keepCount: 5,
    season: "Season 51",
    onLock: (kept) => alert(`Locked tribe: ${kept.join(", ")}`),
    onClose: () => {},
  },
};
