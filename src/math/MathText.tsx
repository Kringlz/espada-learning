import React from "react";
import { RichText } from "../course/RichText";

export function MathText({
  text,
  size = 18,
  color,
  bold = false,
}: {
  text: string;
  size?: number;
  color?: string;
  bold?: boolean;
}) {
  return (
    <RichText
      runs={[{ text }]}
      size={size}
      color={color}
      weight={bold ? "600" : "400"}
    />
  );
}
