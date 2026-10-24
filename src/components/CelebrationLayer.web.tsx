import React from "react";
import { createPortal } from "react-dom";

export function CelebrationLayer({ children }: { children: React.ReactNode }) {
  // Outside transformed lesson cards: the sky drawing belongs to the viewport.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
