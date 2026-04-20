import ShieldIcon from "@mui/icons-material/Shield";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BlockIcon from "@mui/icons-material/Block";
import type { SvgIconComponent } from "@mui/icons-material";
import type { InventoryItem } from "@/types/castaway";

export interface InventoryItemConfig {
  key: InventoryItem;
  label: string;
  shortLabel: string;
  Icon: SvgIconComponent;
  /** Solid accent used for text, outlines, and chips */
  accent: string;
  /** Badge gem gradient (radial) */
  gradient: string;
  /** Dark frame color */
  frame: string;
  /** Card-back phrase, e.g. "Has Immunity Idol" or "Does not have a Vote" */
  statusPhrase: (count: number) => string;
}

export const INVENTORY_ITEMS: InventoryItemConfig[] = [
  {
    key: "immunity_idol",
    label: "Immunity Idol",
    shortLabel: "Idol",
    Icon: ShieldIcon,
    accent: "#C8871B",
    gradient:
      "radial-gradient(circle at 30% 30%, #FFE082, #FFB020 60%, #C8871B 100%)",
    frame: "#7A4E0A",
    statusPhrase: (n) => (n === 1 ? "Has Immunity Idol" : `Has ${n} Immunity Idols`),
  },
  {
    key: "extra_vote",
    label: "Extra Vote",
    shortLabel: "+Vote",
    Icon: AddCircleIcon,
    accent: "#2E9E4E",
    gradient:
      "radial-gradient(circle at 30% 30%, #7CD89A, #2E9E4E 60%, #1E6B33 100%)",
    frame: "#1E6B33",
    statusPhrase: (n) => (n === 1 ? "Has Extra Vote" : `Has ${n} Extra Votes`),
  },
  {
    key: "steal_a_vote",
    label: "Steal-a-Vote",
    shortLabel: "Steal",
    Icon: SwapHorizIcon,
    accent: "#7B2FD9",
    gradient:
      "radial-gradient(circle at 30% 30%, #C49CF0, #7B2FD9 60%, #4C1B8F 100%)",
    frame: "#4C1B8F",
    statusPhrase: (n) => (n === 1 ? "Has Steal-a-Vote" : `Has ${n} Steal-a-Votes`),
  },
  {
    key: "lose_your_vote",
    label: "Lose-Your-Vote",
    shortLabel: "−Vote",
    Icon: BlockIcon,
    accent: "#D23A3A",
    gradient:
      "radial-gradient(circle at 30% 30%, #F3A8A8, #D23A3A 60%, #8A1B1B 100%)",
    frame: "#8A1B1B",
    statusPhrase: (n) => (n === 1 ? "Does not have a Vote" : `Missing ${n} Votes`),
  },
];

export const getInventoryConfig = (item: InventoryItem): InventoryItemConfig => {
  const cfg = INVENTORY_ITEMS.find((c) => c.key === item);
  if (!cfg) throw new Error(`Unknown inventory item: ${item}`);
  return cfg;
};
