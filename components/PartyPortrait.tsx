import { CreaturePortrait } from "./CreaturePortrait";
import type { CreatureState } from "@/lib/types";

type StateMap = Partial<Record<"panda" | "squirrel" | "lion" | "bird" | "beaver", CreatureState>>;

export function PartyPortrait({ states = {}, className = "" }: { states?: StateMap; className?: string }) {
  return (
    <div className={`party-portrait ${className}`} role="img" aria-label="The five Fourfold party members together">
      <CreaturePortrait creature="bird" state={states.bird ?? "steady"} className="party-bird" width={150} />
      <CreaturePortrait creature="squirrel" state={states.squirrel ?? "steady"} className="party-squirrel" width={90} />
      <CreaturePortrait creature="beaver" state={states.beaver ?? "steady"} className="party-beaver" width={154} />
      <CreaturePortrait creature="lion" state={states.lion ?? "steady"} className="party-lion" width={150} />
      <CreaturePortrait creature="panda" state={states.panda ?? "steady"} className="party-panda" width={190} />
    </div>
  );
}
