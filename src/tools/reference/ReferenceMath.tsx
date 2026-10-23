import React from "react";
import { referenceMathLayout } from "./layout";
import { Formula } from "../../math/Formula";
export function ReferenceMath({
  latex,
  spoken,
  color,
}: {
  latex: string;
  spoken: string;
  color: string;
}) {
  return (
    <Formula
      latex={referenceMathLayout(latex)}
      source={spoken}
      color={color}
      size={24}
      display
    />
  );
}
