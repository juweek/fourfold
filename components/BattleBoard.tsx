"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Crown, RefreshCw, Shield, Skull, Sparkles, Swords } from "lucide-react";
import {
  ARENA_THEMES,
  ARENA_TILES,
  HERO_TILE,
  TILE_SPRITE_RISE,
  arenaKey,
  arenaPosition,
  battleAtmosphere,
  battleElevation,
  battleEnemyPlacements,
  battleProgress,
  battleTerrain,
  battleTerritory,
  enemySpritePath,
  enemyTier,
  tileSpritePath,
  tileSpriteScale,
  type ArenaCoordinate,
  type ArenaTheme,
  type EnemyTier,
} from "@/lib/battle";
import { DOMAIN_META, DOMAINS } from "@/lib/domains";
import { dailyXpPercent } from "@/lib/progress";
import type { Domain, DomainProgress, Task, TodaySnapshot } from "@/lib/types";
import { MotifGlyph } from "./MotifGlyph";

const HERO_SIZE: Record<Domain, string> = { work: "9.4%", gourmet: "7%", body: "11.7%", finance: "9.2%", life: "11%" };
const HERO_SPRITE: Record<Domain, string> = {
  work: "/battle/heroes/vesper-beaver-pixel.png",
  gourmet: "/battle/heroes/moss-squirrel-pixel.png",
  body: "/battle/heroes/ari-lion-pixel.png",
  finance: "/battle/heroes/aurelia-bird-pixel.png",
  life: "/battle/heroes/pax-panda-pixel.png",
};
const THEME_META: Record<ArenaTheme, { label: string; description: string }> = {
  grass: { label: "Meadow", description: "Route grass, wildflowers and worn dirt paths" },
  cinder: { label: "Cinder", description: "The scorched dark-red siege field" },
  volcano: { label: "Volcano", description: "Basalt plates over living lava" },
};
const THEME_STORAGE_KEY = "fourfold:arena-theme";
const COMPACT_BOARD = "(max-width: 767px)";

// Phones pay for every extra tile bitmap they decode, so the board drops to the lite tile set there.
function useBoardDetail() {
  const [detail, setDetail] = useState<"full" | "lite">("full");
  useEffect(() => {
    const query = window.matchMedia(COMPACT_BOARD);
    const sync = () => setDetail(query.matches ? "lite" : "full");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return detail;
}
const ENEMY_NAME: Record<EnemyTier, string> = { 1: "Inkling Skirmisher", 2: "Burden Raider", 3: "Crown Titan" };
const STATE_LABEL: Record<DomainProgress["state"], string> = {
  resting: "Awaiting orders",
  radiant: "Radiant",
  steady: "Battle ready",
  drifting: "Gathering strength",
  slipping: "Weakened",
  dormant: "Critical",
};

type EnemyPlacement = ArenaCoordinate & { delay: number; mirrored: boolean };
type PlacedTask = { task: Task; placement: EnemyPlacement };

function piecePosition(coordinate: ArenaCoordinate, battleDate: string, extras: Record<string, string | number> = {}) {
  const position = arenaPosition(coordinate, battleDate);
  return {
    left: `${position.centerX}%`,
    top: `${position.centerY}%`,
    ...extras,
  } as CSSProperties;
}

function EnemyToken({ task, placement, battleDate }: PlacedTask & { battleDate: string }) {
  const tier = enemyTier(task.points);
  const meta = DOMAIN_META[task.domain];
  const style = piecePosition(placement, battleDate, {
    "--domain": meta.color,
    "--domain-light": meta.light,
    "--piece-delay": `${placement.delay}s`,
    "--piece-flip": placement.mirrored ? -1 : 1,
    zIndex: 150 + (placement.column + placement.row) * 3 + tier,
  });
  const description = `${task.title}, ${task.points} point${task.points === 1 ? "" : "s"}`;

  return (
    <span
      className={`battle-piece enemy-miniature enemy-tier-${tier}`}
      style={style}
      role="img"
      aria-label={`${description}, ${ENEMY_NAME[tier]}`}
      title={`${task.title} · ${task.points} pts · ${ENEMY_NAME[tier]}`}
    >
      <i className="miniature-base" aria-hidden="true"/>
      {/* Generated raster art is intentionally a plain checked-in asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enemySpritePath(tier)} alt="" aria-hidden="true" decoding="async"/>
      <b className="enemy-points">{task.points}</b>
    </span>
  );
}

function HeroToken({ domain, progress, index, claimedTiles, battleDate }: { domain: Domain; progress: DomainProgress; index: number; claimedTiles: number; battleDate: string }) {
  const meta = DOMAIN_META[domain];
  const resolve = Math.round(dailyXpPercent(progress.todayXp, progress.paceXp));
  const coordinate = HERO_TILE[domain];
  const style = piecePosition(coordinate, battleDate, {
    "--domain": meta.color,
    "--domain-light": meta.light,
    "--hero-size": HERO_SIZE[domain],
    "--resolve": `${resolve}%`,
    "--piece-delay": `${-index * 0.55}s`,
    zIndex: 230 + (coordinate.column + coordinate.row) * 3,
  });

  return (
    <span
      className={`battle-piece hero-miniature hero-${domain}`}
      style={style}
      data-state={progress.state}
      role="img"
      aria-label={`${meta.name}, ${STATE_LABEL[progress.state]}, ${resolve}% daily resolve, ${claimedTiles} tiles claimed`}
      title={`${meta.name} · ${STATE_LABEL[progress.state]} · ${progress.todayXp} XP today · ${claimedTiles} tiles claimed`}
    >
      <i className="miniature-base" aria-hidden="true"/>
      {/* Generated raster art is intentionally a plain checked-in asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-sprite-pixel" src={HERO_SPRITE[domain]} alt="" aria-hidden="true" decoding="async"/>
      <span className="hero-plate"><b>{meta.name}</b><small>{STATE_LABEL[progress.state]}</small></span>
      <span className="hero-resolve" aria-hidden="true"><i/></span>
    </span>
  );
}

function ThreatLegend({ tier, label, range }: { tier: EnemyTier; label: string; range: string }) {
  return (
    <div className={`legend-enemy enemy-tier-${tier}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enemySpritePath(tier)} alt="" aria-hidden="true" decoding="async"/>
      <span><b>{label}</b><small>{range}</small></span>
    </div>
  );
}

export function BattleBoard() {
  const [data, setData] = useState<TodaySnapshot | null>(null);
  const [error, setError] = useState("");
  const [arenaTheme, setArenaTheme] = useState<ArenaTheme>("grass");
  const detail = useBoardDetail();
  const viewportRef = useRef<HTMLDivElement>(null);
  const chooseTheme = useCallback((theme: ArenaTheme) => {
    setArenaTheme(theme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* private mode — the pick just won't stick */ }
  }, []);
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/today", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not summon the battle board.");
      setData(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not summon the battle board.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  // Read after mount rather than in the initial state so server and client markup match.
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (ARENA_THEMES as readonly string[]).includes(saved)) setArenaTheme(saved as ArenaTheme);
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!data || !viewport || viewport.scrollWidth <= viewport.clientWidth) return;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [data]);

  if (error) return <main className="page-shell"><div className="error-state"><p>{error}</p><button className="ghost-button" onClick={load}><RefreshCw size={15}/> Retry</button></div></main>;
  if (!data) return <main className="page-shell battle-page"><div className="battle-skeleton"><div/><div/><div/><div/><div/></div></main>;

  const party = battleProgress(data.tasks);
  const atmosphere = battleAtmosphere(party.progress);
  const openTasks = data.tasks.filter((task) => !task.completed_at);
  const bosses = openTasks.filter((task) => enemyTier(task.points) === 3).length;
  const byDomain = Object.fromEntries(data.progress.map((item) => [item.domain, item])) as Record<Domain, DomainProgress>;
  const dateLabel = new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const territory = battleTerritory(data.tasks, data.date);
  const enemyPlacements = battleEnemyPlacements(data.tasks, territory, data.date);
  const placedTasks: PlacedTask[] = openTasks.flatMap((task) => {
    const placement = enemyPlacements.get(task.id);
    return placement ? [{ task, placement }] : [];
  });
  const enemyTiles = new Set(placedTasks.map(({ placement }) => arenaKey(placement)));
  const heroTileOwners = new Map(Object.entries(HERO_TILE).map(([domain, coordinate]) => [arenaKey(coordinate), domain as Domain]));

  return (
    <main className="page-shell battle-page">
      <div className="page-heading battle-heading">
        <div><span className="eyebrow">Week {data.week} · Daily tactics map</span><h1>Battle Board</h1><p>{dateLabel} · Every completed point captures ground.</p></div>
        <div className="battle-turn"><Swords size={16}/><span>{atmosphere === "ascendant" ? "Victory push" : atmosphere === "turning" ? "The tide is turning" : "Opening battle"}</span></div>
      </div>

      <section className="battle-hud" aria-label="Battle summary">
        <div><Shield size={16}/><span>Party resolve</span><strong>{party.progress}%</strong></div>
        <div><Skull size={16}/><span>Active foes</span><strong>{openTasks.length}</strong></div>
        <div><Crown size={16}/><span>Boss threats</span><strong>{bosses}</strong></div>
        <div><Sparkles size={16}/><span>Tiles claimed</span><strong>{territory.claimedTotal}</strong></div>
      </section>

      <section className={`battle-map atmosphere-${atmosphere} arena-theme-${arenaTheme}`} aria-label={`Isometric daily territory battle board, ${party.progress}% complete`}>
        <header className="battle-domain-ledger">
          {DOMAINS.map((domain) => {
            const stats = battleProgress(data.tasks, domain);
            const meta = DOMAIN_META[domain];
            return (
              <div style={{ "--domain": meta.color, "--domain-light": meta.light } as CSSProperties} key={domain}>
                <MotifGlyph domain={domain}/><span><b>{meta.name}</b><small>{territory.claimedByDomain[domain]} tiles claimed</small></span><i style={{ width: `${stats.progress}%` }}/>
              </div>
            );
          })}
        </header>

        <div className="arena-theme-picker">
          <span>Terrain</span>
          <div role="group" aria-label="Arena terrain">
            {ARENA_THEMES.map((theme) => (
              <button
                className={arenaTheme === theme ? "active" : ""}
                type="button"
                aria-pressed={arenaTheme === theme}
                title={THEME_META[theme].description}
                onClick={() => chooseTheme(theme)}
                key={theme}
              >
                <i className={`theme-swatch theme-swatch-${theme}`} aria-hidden="true"/>
                {THEME_META[theme].label}
              </button>
            ))}
          </div>
        </div>

        <div className="battle-swipe-hint" aria-hidden="true">Swipe to survey the field ↔</div>
        <div className="battle-grid-viewport" ref={viewportRef}>
          <div className="arena-perspective">
            <div className="isometric-board territory-arena">
              <div className="arena-bed" aria-hidden="true"/>
              {ARENA_TILES.map((tile) => {
                const position = arenaPosition(tile, data.date);
                const elevation = battleElevation(tile, data.date);
                const terrain = battleTerrain(tile, data.date);
                const key = arenaKey(tile);
                const claim = territory.claims.get(key);
                const heroOwner = heroTileOwners.get(key);
                const isEnemy = enemyTiles.has(key);
                const owner = claim?.domain ?? heroOwner;
                const meta = owner ? DOMAIN_META[owner] : null;
                const className = [
                  "arena-tile",
                  `terrain-${terrain.variant}`,
                  `elevation-${elevation}`,
                  claim && "is-claimed",
                  isEnemy && "is-enemy",
                  heroOwner && "is-hero",
                ].filter(Boolean).join(" ");
                return (
                  <i
                    className={className}
                    style={{
                      left: `${position.x}%`, top: `${position.y}%`, width: `${position.width}%`, height: `${position.height}%`,
                      zIndex: 5 + (tile.column + tile.row) * 2 + elevation * 2,
                      "--tile-sprite": `url("${tileSpritePath(arenaTheme, terrain, elevation, detail)}")`,
                      "--tile-scale": tileSpriteScale(elevation),
                      "--tile-rise": `${-TILE_SPRITE_RISE * 100}%`,
                      "--claim-order": claim?.order ?? 0,
                      ...(meta ? { "--domain": meta.color, "--domain-light": meta.light } : {}),
                    } as CSSProperties}
                    data-owner={owner ?? "threat"}
                    aria-hidden="true"
                    key={key}
                  >
                    {(claim || heroOwner || isEnemy) && <i className="tile-marker"/>}
                  </i>
                );
              })}
              <div className="arena-heart" aria-hidden="true"><i/><b>IV</b></div>
              {placedTasks.map(({ task, placement }) => <EnemyToken task={task} placement={placement} battleDate={data.date} key={task.id}/>) }
              {DOMAINS.map((domain, index) => <HeroToken domain={domain} progress={byDomain[domain]} index={index} claimedTiles={territory.claimedByDomain[domain]} battleDate={data.date} key={domain}/>) }
            </div>
          </div>
        </div>
        <footer className="battle-map-caption"><span><b>Daily seed</b> {data.date}</span><span><b>Domain color</b> Captured territory</span><span><b>1 quest point</b> 1 claimed tile</span></footer>
      </section>

      <section className="battle-legend card" aria-label="Enemy threat legend">
        <div><span className="eyebrow">Threat codex</span><h2>Quest weight becomes the enemy</h2><p>One permanent miniature family; infinite daily formations.</p></div>
        <ThreatLegend tier={1} label="Skirmisher" range="1–5 pts"/>
        <ThreatLegend tier={2} label="Raider" range="6–10 pts"/>
        <ThreatLegend tier={3} label="Crown Titan" range="11+ pts"/>
      </section>
    </main>
  );
}
