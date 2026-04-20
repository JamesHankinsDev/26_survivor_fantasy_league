export type Rarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

export interface RarityConfig {
  label: string;
  /** Solid accent color — used for the gem, chips, and name-banner text */
  accent: string;
  /** Dark frame color — used for the card border */
  frame: string;
  /** CSS gradient painted into the card frame (borders/banner) */
  frameGradient: string;
  /** Subtle tint used for stat panels and card background fill */
  surface: string;
  /** Box-shadow glow applied to the whole card (empty string = none) */
  glow: string;
  /** Whether to animate the holographic shimmer overlay */
  shimmer: boolean;
}

export const getRarity = (totalPoints: number): Rarity => {
  if (totalPoints >= 76) return "mythic";
  if (totalPoints >= 51) return "legendary";
  if (totalPoints >= 26) return "rare";
  if (totalPoints >= 11) return "uncommon";
  return "common";
};

const CONFIGS: Record<Rarity, RarityConfig> = {
  common: {
    label: "Common",
    accent: "#8A8F98",
    frame: "#5B6370",
    frameGradient:
      "linear-gradient(135deg, #8A8F98 0%, #5B6370 50%, #8A8F98 100%)",
    surface: "rgba(138, 143, 152, 0.08)",
    glow: "",
    shimmer: false,
  },
  uncommon: {
    label: "Uncommon",
    accent: "#2E9E4E",
    frame: "#1E6B33",
    frameGradient:
      "linear-gradient(135deg, #4CC56B 0%, #2E9E4E 50%, #1E6B33 100%)",
    surface: "rgba(46, 158, 78, 0.08)",
    glow: "0 0 0 1px rgba(46, 158, 78, 0.2)",
    shimmer: false,
  },
  rare: {
    label: "Rare",
    accent: "#2F7BC8",
    frame: "#1E4F85",
    frameGradient:
      "linear-gradient(135deg, #6BB6FF 0%, #2F7BC8 50%, #1E4F85 100%)",
    surface: "rgba(47, 123, 200, 0.08)",
    glow: "0 0 18px rgba(47, 123, 200, 0.35)",
    shimmer: false,
  },
  legendary: {
    label: "Legendary",
    accent: "#C8871B",
    frame: "#7A4E0A",
    frameGradient:
      "linear-gradient(135deg, #FFE082 0%, #FFB020 40%, #C8871B 70%, #7A4E0A 100%)",
    surface: "rgba(200, 135, 27, 0.10)",
    glow: "0 0 24px rgba(255, 176, 32, 0.5)",
    shimmer: true,
  },
  mythic: {
    label: "Mythic",
    accent: "#B528D9",
    frame: "#5B0E7A",
    frameGradient:
      "linear-gradient(135deg, #FF3D8A 0%, #B528D9 30%, #5B6BFF 60%, #20D9C8 100%)",
    surface: "rgba(181, 40, 217, 0.10)",
    glow: "0 0 32px rgba(181, 40, 217, 0.55), 0 0 12px rgba(32, 217, 200, 0.45)",
    shimmer: true,
  },
};

export const getRarityConfig = (rarity: Rarity): RarityConfig => CONFIGS[rarity];

export const getRarityFromPoints = (totalPoints: number): RarityConfig =>
  CONFIGS[getRarity(totalPoints)];
