import React from "react";
import { renderMath } from "./render";

export function Formula({
  latex,
  source,
  size,
  color,
  display = false,
}: {
  latex: string;
  source: string;
  size: number;
  color: string;
  display?: boolean;
}) {
  const math = renderMath(latex);
  if (!math) return <span>{source}</span>;
  const svg = math.svg
    .replace(/width="[^"]*"/, `width="${math.width * size}"`)
    .replace(/height="[^"]*"/, `height="${math.height * size}"`)
    .replace(/style="[^"]*"/, 'style="display:block"');
  return (
    <span
      role="math"
      aria-label={source}
      title={source}
      style={{
        display: display ? "block" : "inline-block",
        maxWidth: "100%",
        overflowX: "auto",
        verticalAlign: `${-math.depth * size - 4}px`,
        padding: "4px 1px",
        color,
        lineHeight: 0,
        margin: display ? "10px 0" : "0 2px",
        textAlign: display ? "center" : undefined,
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "inline-block" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </span>
  );
}
