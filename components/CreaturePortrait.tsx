import type { CSSProperties } from "react";

export type Creature = "panda" | "squirrel" | "lion" | "bird";

export function CreaturePortrait({
  creature,
  tier = 1,
  width = 110,
  className = "",
  style,
}: {
  creature: Creature;
  tier?: 1 | 2 | 3;
  width?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // Generated PNGs keep email rendering dependable and use the same tiered SVG originals.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/characters/${creature}-tier-${tier}.png`}
      alt=""
      aria-hidden="true"
      width={width}
      height={Math.round((width * 240) / 220)}
      className={className}
      style={style}
    />
  );
}
