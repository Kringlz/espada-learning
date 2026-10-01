import { useUITheme } from "../components/ui";
import React from "react";
import { Text, View } from "react-native";
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
  size = 18,
  weight = "400",
  color: providedColor,
  heading,
}: RichTextProps) {
  const { colors, styles } = useUITheme();
  const color = providedColor ?? colors.ink;
  const segments = mathRuns(runs);
  if (segments.some((r) => r.latex))
    return (
      <View
        accessibilityRole={heading ? "header" : undefined}
        style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}
      >
        {segments.flatMap((r, i) =>
          r.latex
            ? [
                <Formula
                  key={i}
                  latex={r.latex}
                  source={r.text}
                  size={size}
                  color={color}
                  display={r.display}
                />,
              ]
            : r.text.split(/(\n|[^\S\n]+)/).map((text, j) =>
                text === "\n" ? (
                  <View key={`${i}:${j}`} style={{ width: "100%" }} />
                ) : (
                  <Text
                    key={`${i}:${j}`}
                    selectable
                    style={{
                      fontSize: size,
                      lineHeight: size * 1.75,
                      fontWeight: r.bold ? "700" : weight,
                      fontStyle: r.italic ? "italic" : undefined,
                      color,
                    }}
                  >
                    {nativeScript({ ...r, text })}
                  </Text>
                ),
              ),
        )}
      </View>
    );
  return (
    <Text
      selectable
      accessibilityRole={heading ? "header" : undefined}
      style={{
        fontSize: size,
        lineHeight: size * (heading ? 1.3 : 1.75),
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
