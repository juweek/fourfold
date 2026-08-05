import { CreaturePortrait } from "./CreaturePortrait";

type TierMap = Partial<Record<"panda" | "squirrel" | "lion" | "bird", 1 | 2 | 3>>;

export function PartyPortrait({ tiers = {}, className = "" }: { tiers?: TierMap; className?: string }) {
  return (
    <div className={`party-portrait ${className}`} role="img" aria-label="The four Fourfold party members together">
      <CreaturePortrait creature="bird" tier={tiers.bird ?? 1} className="party-bird" width={160} />
      <CreaturePortrait creature="squirrel" tier={tiers.squirrel ?? 1} className="party-squirrel" width={112} />
      <CreaturePortrait creature="panda" tier={tiers.panda ?? 1} className="party-panda" width={184} />
      <CreaturePortrait creature="lion" tier={tiers.lion ?? 1} className="party-lion" width={155} />
    </div>
  );
}
