import type { Domain } from "./types";

export const DOMAINS: Domain[] = ["work", "gourmet", "body", "finance", "life"];

export const DOMAIN_META = {
  work: {
    label: "Data",
    name: "Vesper",
    className: "Beaver Engineer",
    creature: "beaver",
    color: "#8B7CF6",
    light: "#B9AEFF",
    dark: "#5E4FB8",
    motif: "constellation",
  },
  gourmet: {
    label: "Gourmet Data",
    name: "Moss",
    className: "Summoner",
    creature: "squirrel",
    color: "#34C784",
    light: "#7FE7B4",
    dark: "#1F8A59",
    motif: "sigil",
  },
  body: {
    label: "Body",
    name: "Ari",
    className: "Strong Warrior",
    creature: "lion",
    color: "#E4593D",
    light: "#FF8A6B",
    dark: "#A63A26",
    motif: "peak",
  },
  finance: {
    label: "Finance",
    name: "Aurelia",
    className: "Scholar",
    creature: "bird",
    color: "#D9A441",
    light: "#F2CD7E",
    dark: "#9C742B",
    motif: "rising",
  },
  life: {
    label: "Happy Life",
    name: "Pax",
    className: "Panda Bard",
    creature: "panda",
    color: "#D96FA5",
    light: "#F2A8CC",
    dark: "#994A72",
    motif: "spark",
  },
} as const;

export const DIFFICULTY_POINTS = { easy: 1, medium: 2, hard: 4 } as const;
export const IMPORTANCE_MULTIPLIER = { low: 1, medium: 2, high: 3 } as const;

export const SEASON_START = "2026-08-05";
export const SEASON_WEEKS = 26;
export const SEASON_END = "2027-02-03";
