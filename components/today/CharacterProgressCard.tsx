import type { CSSProperties } from "react";
import { DOMAIN_META } from "@/lib/domains";
import { dailyXpPercent, weeklyXpPercent } from "@/lib/progress";
import type { Domain, DomainProgress } from "@/lib/types";
import { CreaturePortrait } from "../CreaturePortrait";

const SPRITE_WIDTH: Record<Domain, number> = {
  work: 64,
  gourmet: 44,
  body: 58,
  finance: 58,
  life: 76,
};

function levelProgressPercent(progress: DomainProgress) {
  if (progress.level === 10) return 100;
  const levelRange = progress.nextLevelXp - progress.levelStartXp;
  return Math.max(0, Math.min(100, ((progress.xp - progress.levelStartXp) / levelRange) * 100));
}

function signedXp(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function CharacterProgressCard({
  progress,
  active,
  paused,
  onSelect,
}: {
  progress: DomainProgress;
  active: boolean;
  paused: boolean;
  onSelect: (domain: Domain) => void;
}) {
  const meta = DOMAIN_META[progress.domain];
  const style = { "--domain": meta.color, "--domain-light": meta.light } as CSSProperties;

  return (
    <button
      type="button"
      className={`character-card card ${active ? "active" : ""}`}
      style={style}
      onClick={() => onSelect(progress.domain)}
      aria-pressed={active}
      aria-label={`Filter quests by ${meta.label}`}
    >
      <CreaturePortrait creature={meta.creature} state={progress.state} width={SPRITE_WIDTH[progress.domain]} paused={paused}/>
      <div className="character-info">
        <div><h3>{meta.name}</h3><span>{meta.className}</span></div>
        <b>Lv {progress.level}</b>
        <div className="xp-track"><i style={{ width: `${levelProgressPercent(progress)}%` }}/></div>
        <small>{progress.xp} / {progress.nextLevelXp} XP</small>
      </div>
      <div className="micro-progress">
        <span>T <b>{signedXp(progress.todayXp)}</b><i><em style={{ width: `${dailyXpPercent(progress.todayXp, progress.paceXp)}%` }}/></i></span>
        <span>W <b>{signedXp(progress.weekXp)}</b><i><em style={{ width: `${weeklyXpPercent(progress.weekXp, progress.paceXp)}%` }}/></i></span>
      </div>
    </button>
  );
}
