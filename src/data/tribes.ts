/**
 * Season-tribe metadata used by <TribeChip /> and the trading-card chrome.
 *
 * Real per-season tribe data ships in Firestore on castaway documents. The map
 * here is a static lookup of the visual chrome (color + glyph) keyed by tribe
 * id — components fall back to the `flame` accent if a given id isn't known.
 *
 * Add new seasons by appending to this map (or wiring the lookup against
 * season metadata once the redesign's downstream phases need it).
 */

export interface TribeMeta {
  id: string;
  name: string;
  color: string;
  glyph: string;
}

export const TRIBES: Record<string, TribeMeta> = {
  lakaya: { id: "lakaya", name: "Lakaya", color: "#E76F3C", glyph: "▲" },
  mavu: { id: "mavu", name: "Mavu", color: "#3B8E6E", glyph: "●" },
  yumi: { id: "yumi", name: "Yumi", color: "#7A5AE0", glyph: "◆" },
};

export const getTribe = (id: string | undefined | null): TribeMeta | null =>
  id ? TRIBES[id.toLowerCase()] ?? null : null;
