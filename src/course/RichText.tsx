import React from "react";
import { Text } from "react-native";
import { TextRun } from "./content";
import { colors } from "../components/ui";
export type RichTextProps = {
  runs: TextRun[];
  size?: number;
  weight?: "400" | "600" | "700";
  color?: string;
  heading?: boolean;
};
const superscript: Record<string, string> = Object.fromEntries(
  Array.from("0123456789+-−=()abcdefghijklmnopqrstuvwxyz").map((c, i) => [
    c,
    Array.from("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ𐞥ʳˢᵗᵘᵛʷˣʸᶻ")[i],
  ]),
);
const subscript: Record<string, string> = Object.fromEntries(
  Array.from("0123456789+-−=()aehijklmnoprstuvx").map((c, i) => [
    c,
    Array.from("₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ")[i],
  ]),
);
function nativeScript(run: TextRun) {
  if (!run.script) return run.text;
  const alphabet = run.script === "sup" ? superscript : subscript;
  return [...run.text].every((c) => alphabet[c] || c === " ")
    ? [...run.text].map((c) => alphabet[c] ?? c).join("")
    : `${run.script === "sup" ? "^" : "_"}(${run.text})`;
}
export function RichText({
  runs,
  size = 17,
  weight = "400",
  color = colors.ink,
  heading,
}: RichTextProps) {
  return (
    <Text
      selectable
      accessibilityRole={heading ? "header" : undefined}
      style={{
        fontSize: size,
        lineHeight: size * 1.7,
        fontWeight: weight,
        color,
      }}
    >
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontWeight: r.bold ? "700" : undefined,
            fontStyle: r.italic ? "italic" : undefined,
          }}
        >
          {nativeScript(r)}
        </Text>
      ))}
    </Text>
  );
}
