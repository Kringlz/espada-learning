import React from "react";
import { TextRun } from "./content";
import { colors } from "../components/ui";

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
  size = 17,
  weight = "400",
  color = colors.ink,
  heading,
}: RichTextProps) {
  const Tag = heading ? "h3" : "p";
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.7,
        color,
        userSelect: "text",
        overflowWrap: "anywhere",
      }}
    >
      {runs.map((r, i) => {
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
