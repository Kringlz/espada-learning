import React from "react";
import { createPortal } from "react-dom";

export function CelebrationLayer({
  children,
  contained = false,
}: {
  children: React.ReactNode;
  fullScreen?: boolean;
  contained?: boolean;
}) {
  // Outside transformed lesson cards: the sky drawing belongs to the viewport.
  if (typeof document === "undefined") return null;
  const layer = (
    <div
      aria-hidden
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      {children}
    </div>
  );
  return contained ? layer : createPortal(layer, document.body);
}
