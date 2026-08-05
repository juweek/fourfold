import type { Score } from "@/lib/types";

export function ScoreRing({ score, pulse = false }: { score: Score; pulse?: boolean }) {
  const value = score.total ?? 0;
  const base = Math.min(100, value);
  const bonus = Math.max(0, value - 100);
  return (
    <div className={`score-ring ${pulse ? "is-pulsing" : ""}`} aria-label={score.total === null ? "No score yet" : `Today score: ${score.total} percent`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="score-track" cx="60" cy="60" r="49" pathLength="100" />
        <circle className="score-progress" cx="60" cy="60" r="49" pathLength="100" strokeDasharray={`${base} 100`} />
        {bonus > 0 && <circle className="score-bonus" cx="60" cy="60" r="56" pathLength="100" strokeDasharray={`${bonus * 10} 100`} />}
      </svg>
      <span>{score.total === null ? "—" : score.total}</span>
      {score.total !== null && <small>%</small>}
    </div>
  );
}
