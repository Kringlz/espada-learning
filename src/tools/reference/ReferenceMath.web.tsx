import React from "react";
import { referenceMathLayout } from "./layout";
import { renderMath } from "../../math/render";
/** Scroll the formula itself, never shrink the textbook glyphs to fit the viewport. */
export function ReferenceMath({
  latex,
  spoken,
  color,
}: {
  latex: string;
  spoken: string;
  color: string;
}) {
  const math = renderMath(referenceMathLayout(latex));
  if (!math) return <span style={{ color, fontSize: 18 }}>{spoken}</span>;
  const size = 24;
  const svg = math.svg
    .replace(/width="[^"]*"/, `width="${math.width * size}"`)
    .replace(/height="[^"]*"/, `height="${math.height * size}"`)
    .replace(/style="[^"]*"/, 'style="display:block"');
  return (
    <div
      tabIndex={0}
      role="math"
      aria-label={spoken}
      data-reference-formula
      style={{
        color,
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "auto",
        padding: "5px 0 9px",
        scrollbarWidth: "thin",
        scrollbarColor: `${color} transparent`,
        borderRadius: 4,
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "block", width: "max-content", margin: "0" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
