import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import type { DomainProgress } from "@/lib/types";
import { PartyPortrait } from "./PartyPortrait";

function hash(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return Math.abs(result);
}

function healthLabel(xp: number, pace: number) {
  if (xp >= pace * 0.9) return "thriving";
  if (xp >= pace * 0.45) return "steady";
  return "resting";
}

export function GardenScene({ progress, expanded = false }: { progress: DomainProgress[]; expanded?: boolean }) {
  const byDomain = Object.fromEntries(progress.map((item) => [item.domain, item])) as Record<string, DomainProgress>;
  const tiers = {
    panda: byDomain.work?.tier ?? 1,
    squirrel: byDomain.gourmet?.tier ?? 1,
    lion: byDomain.body?.tier ?? 1,
    bird: byDomain.finance?.tier ?? 1,
  } as const;
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
      <PartyPortrait tiers={tiers} className="garden-party" />
      <div className="garden-labels">
        {DOMAINS.map((domain) => {
          const item = byDomain[domain];
          return <span key={domain}><i style={{ background: DOMAIN_META[domain].color }} />{healthLabel(item?.weekXp ?? 0, item?.paceXp ?? 80)}</span>;
        })}
      </div>
    </section>
  );
}
