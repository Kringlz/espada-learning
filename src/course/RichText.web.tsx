import { useUITheme } from "../components/ui";
import React from "react";
import { TextRun } from "./content";
import { mathRuns } from "../math/notation";
import { Formula } from "../math/Formula";

export type RichTextProps = {
  runs: TextRun[];
  size?: number;
  weight?: "400" | "600" | "700";
  color?: string;
  heading?: boolean;
};
/** Real text nodes, including semantic sup/sub, support selection, copying and screen readers. */
export function RichText({
  runs,
  size = 18,
  weight = "400",
  color: providedColor,
  heading,
}: RichTextProps) {
  const { colors, styles } = useUITheme();
  const color = providedColor ?? colors.ink;
  const Tag = heading ? "h3" : "p";
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: size,
        fontWeight: weight,
        lineHeight: heading ? 1.25 : 1.75,
        whiteSpace: "pre-wrap",
        color,
        userSelect: "text",
        overflowWrap: "anywhere",
      }}
    >
      {mathRuns(runs).map((r, i) => {
        if (r.latex)
          return (
            <Formula
              key={i}
              latex={r.latex}
              source={r.text}
              size={size}
              color={color}
              display={r.display}
            />
          );
        const value = (
          <span
            style={{
              fontWeight: r.bold ? 700 : undefined,
              fontStyle: r.italic ? "italic" : undefined,
            }}
          >
            {r.text}
          </span>
        );
        return r.script === "sup" ? (
          <sup key={i} style={{ fontSize: "0.76em", lineHeight: 0 }}>
            {value}
          </sup>
        ) : r.script === "sub" ? (
          <sub key={i} style={{ fontSize: "0.76em", lineHeight: 0 }}>
            {value}
          </sub>
        ) : (
          <React.Fragment key={i}>{value}</React.Fragment>
        );
      })}
    </Tag>
  );
}
