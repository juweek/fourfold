"use client";

import type { CSSProperties } from "react";
import type { CreatureState } from "@/lib/types";
import { useArtStyle } from "./ArtStyleProvider";

export type Creature = "panda" | "squirrel" | "lion" | "bird" | "beaver";

export function CreaturePortrait({
  creature,
  state = "steady",
  width = 110,
  className = "",
  style,
  paused = false,
}: {
  creature: Creature;
  state?: CreatureState;
  width?: number;
  className?: string;
  style?: CSSProperties;
  paused?: boolean;
}) {
  const { artStyle } = useArtStyle();
  const hasInternalMotion = creature === "bird" || creature === "squirrel";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/creatures/${artStyle}/${creature}/${state}.svg${paused && hasInternalMotion ? "#motion-paused" : ""}`}
      alt=""
      aria-hidden="true"
      width={width}
      height={Math.round((width * 250) / 220)}
      className={`creature-sprite creature-${creature} creature-state-${state} ${className}`}
      style={style}
    />
  );
}
