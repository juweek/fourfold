import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import { CreaturePortrait } from "./CreaturePortrait";
import type { CreatureState, Domain } from "@/lib/types";
import type { Creature } from "./CreaturePortrait";
import { useArtStyle } from "./ArtStyleProvider";

export type CreatureStateMap = Partial<Record<Creature, CreatureState>>;

const MEMBER_WIDTH: Record<Creature, number> = { bird: 150, squirrel: 90, beaver: 154, lion: 150, panda: 190 };

export function PartyPortrait({
  states = {},
  className = "",
  paused = false,
  activeDomain,
  onSelectDomain,
}: {
  states?: CreatureStateMap;
  className?: string;
  paused?: boolean;
  activeDomain?: Domain;
  onSelectDomain?: (domain: Domain) => void;
}) {
  const { artStyle } = useArtStyle();
  return (
    <div className={`party-portrait art-style-${artStyle} ${onSelectDomain ? "is-interactive" : ""} ${className}`} role={onSelectDomain ? "group" : "img"} aria-label="The five Fourfold party members together">
      {DOMAINS.map((domain) => {
        const creature = DOMAIN_META[domain].creature;
        if (!onSelectDomain) return <CreaturePortrait creature={creature} state={states[creature] ?? "resting"} className={`party-${creature}`} width={MEMBER_WIDTH[creature]} paused={paused} key={domain}/>;
        return (
          <button
            type="button"
            className={`party-member party-${creature} ${activeDomain === domain ? "active" : ""}`}
            onClick={() => onSelectDomain(domain)}
            aria-pressed={activeDomain === domain}
            aria-label={`Filter quests by ${DOMAIN_META[domain].label}`}
            key={domain}
          >
            <CreaturePortrait creature={creature} state={states[creature] ?? "resting"} width={MEMBER_WIDTH[creature]} paused={paused}/>
          </button>
        );
      })}
    </div>
  );
}
