import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { Domain, DomainProgress } from "@/lib/types";
import { PartyPortrait, type CreatureStateMap } from "./PartyPortrait";

function hash(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return Math.abs(result);
}

export function GardenScene({
  progress,
  expanded = false,
  paused = false,
  activeDomain,
  onSelectDomain,
}: {
  progress: DomainProgress[];
  expanded?: boolean;
  paused?: boolean;
  activeDomain?: Domain;
  onSelectDomain?: (domain: Domain) => void;
}) {
  const byDomain = Object.fromEntries(progress.map((item) => [item.domain, item])) as Partial<Record<Domain, DomainProgress>>;
  const states = Object.fromEntries(DOMAINS.map((domain) => [DOMAIN_META[domain].creature, byDomain[domain]?.state ?? "resting"])) as CreatureStateMap;
  return (
    <section className={`garden-scene ${expanded ? "garden-expanded" : ""}`} aria-label="The party's seven-day momentum garden">
      <div className="garden-stars" aria-hidden="true"><i/><i/><i/><i/><i/></div>
      <div className="garden-moon" aria-hidden="true" />
      <div className="garden-hills garden-hills-back" aria-hidden="true" />
      <div className="garden-hills garden-hills-front" aria-hidden="true" />
      <div className="garden-patches" aria-hidden="true">
        {DOMAINS.map((domain) => {
          const item = byDomain[domain];
          const count = Math.max(2, Math.min(7, Math.ceil((item?.weekXp ?? 0) / Math.max(20, (item?.paceXp ?? 80) / 4))));
          return (
            <div className={`garden-patch patch-${domain}`} key={domain}>
              {Array.from({ length: count }, (_, index) => {
                const seed = hash(`${domain}-${index}`);
                const left = 7 + (seed % 84);
                const height = 11 + (seed % 20) + Math.min(22, (item?.weekXp ?? 0) / 12);
                return (
                  <span className={`garden-plant plant-${seed % 3}`} style={{ left: `${left}%`, height: `${height}px`, color: DOMAIN_META[domain].light, animationDelay: `${-(seed % 19) / 10}s` }} key={index}>
                    <i/><b/><em/>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <PartyPortrait states={states} className="garden-party" paused={paused} activeDomain={activeDomain} onSelectDomain={onSelectDomain}/>
    </section>
  );
}
