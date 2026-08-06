import { CreaturePortrait } from "./CreaturePortrait";
import type { CreatureState } from "@/lib/types";

type StateMap = Partial<Record<"panda" | "squirrel" | "lion" | "bird" | "beaver", CreatureState>>;

export function PartyPortrait({ states = {}, className = "", paused = false }: { states?: StateMap; className?: string; paused?: boolean }) {
  return (
    <div className={`party-portrait ${className}`} role="img" aria-label="The five Fourfold party members together">
      <CreaturePortrait creature="bird" state={states.bird ?? "resting"} className="party-bird" width={150} paused={paused} />
      <CreaturePortrait creature="squirrel" state={states.squirrel ?? "resting"} className="party-squirrel" width={90} paused={paused} />
      <CreaturePortrait creature="beaver" state={states.beaver ?? "resting"} className="party-beaver" width={154} paused={paused} />
      <CreaturePortrait creature="lion" state={states.lion ?? "resting"} className="party-lion" width={150} paused={paused} />
      <CreaturePortrait creature="panda" state={states.panda ?? "resting"} className="party-panda" width={190} paused={paused} />
    </div>
  );
}
