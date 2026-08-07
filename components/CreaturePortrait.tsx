"use client";

import type { CSSProperties } from "react";
import type { CreatureState } from "@/lib/types";
import { useArtStyle } from "./ArtStyleProvider";

export type Creature = "panda" | "squirrel" | "lion" | "bird" | "beaver";

const RASTER_SPRITE: Record<Creature, string> = {
  beaver: "/battle/heroes/vesper-beaver-pixel.png",
  squirrel: "/battle/heroes/moss-squirrel-pixel.png",
  lion: "/battle/heroes/ari-lion-pixel.png",
  bird: "/battle/heroes/aurelia-bird-pixel.png",
  panda: "/battle/heroes/pax-panda-pixel.png",
};

export function CreaturePortrait({
  creature,
  state = "resting",
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
  const isRaster = artStyle === "sprite";
  const hasInternalMotion = !isRaster && (creature === "bird" || creature === "squirrel");
  const src = isRaster
    ? RASTER_SPRITE[creature]
    : `/creatures/${artStyle}/${creature}/${state}.svg${paused && hasInternalMotion ? "#motion-paused" : ""}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={width}
      height={isRaster ? width : Math.round((width * 250) / 220)}
      className={`creature-sprite creature-${creature} creature-state-${state} creature-art-${artStyle} ${className}`}
      style={style}
    />
  );
}
