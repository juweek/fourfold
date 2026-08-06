"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ArtStyle = "faceted" | "ink-spore";

type ArtStyleContextValue = {
  artStyle: ArtStyle;
  setArtStyle: (style: ArtStyle) => void;
};

const ArtStyleContext = createContext<ArtStyleContextValue | null>(null);

export function ArtStyleProvider({ children }: { children: React.ReactNode }) {
  const [artStyle, setArtStyleState] = useState<ArtStyle>("ink-spore");

  useEffect(() => {
    const saved = window.localStorage.getItem("ff_art_style");
    if (saved === "faceted" || saved === "ink-spore") setArtStyleState(saved);
  }, []);

  const value = useMemo<ArtStyleContextValue>(() => ({
    artStyle,
    setArtStyle(style) {
      setArtStyleState(style);
      window.localStorage.setItem("ff_art_style", style);
    },
  }), [artStyle]);

  return <ArtStyleContext.Provider value={value}>{children}</ArtStyleContext.Provider>;
}

export function useArtStyle() {
  const value = useContext(ArtStyleContext);
  if (!value) throw new Error("useArtStyle must be used inside ArtStyleProvider.");
  return value;
}

export function ArtStyleToggle() {
  const { artStyle, setArtStyle } = useArtStyle();
  return (
    <div className="art-style-toggle" role="group" aria-label="Creature art style">
      <button type="button" className={artStyle === "faceted" ? "active" : ""} aria-pressed={artStyle === "faceted"} onClick={() => setArtStyle("faceted")}>Faceted</button>
      <button type="button" className={artStyle === "ink-spore" ? "active" : ""} aria-pressed={artStyle === "ink-spore"} onClick={() => setArtStyle("ink-spore")}>Ink</button>
    </div>
  );
}
