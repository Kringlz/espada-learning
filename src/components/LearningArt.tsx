import React from "react";
import { Image } from "react-native";
import { sectionIllustrations } from "./SectionIllustrations";

export type ArtKind =
  | "numbers"
  | "fractions"
  | "geometry"
  | "equations"
  | "graph"
  | "compass"
  | "decimal"
  | "percent"
  | "ratio";
export const artPalette = {
  numbers: "#E8EDD8",
  fractions: "#F3E2C7",
  geometry: "#E3E8EF",
  equations: "#EAE2ED",
  graph: "#E3EAE3",
  compass: "#EAEEDB",
  decimal: "#E0EAE5",
  percent: "#F0DFD1",
  ratio: "#E8E2EF",
};
export function topicArt(title: string, subject?: string): ArtKind {
  if (subject === "geometry") return "geometry";
  if (/десятич/i.test(title)) return "decimal";
  if (/процент|смес/i.test(title)) return "percent";
  if (/пропорц|отношен/i.test(title)) return "ratio";
  if (/дроб/i.test(title)) return "fractions";
  if (/функц|график|производн|интеграл/i.test(title)) return "graph";
  if (/уравнен|неравен|выражен|степен|корн|многочлен/i.test(title))
    return "equations";
  return "numbers";
}

/** Decorative Streamline artwork, kept separate from instructional diagrams. */
export function LearningArt({
  kind,
  size = 150,
}: {
  kind: ArtKind;
  size?: number;
}) {
  const keys: Record<ArtKind, keyof typeof sectionIllustrations> = {
    numbers: "numbers",
    fractions: "fractions",
    geometry: "geometry",
    equations: "algebra",
    graph: "graphs",
    compass: "progress",
    decimal: "decimals",
    percent: "percent",
    ratio: "ratio",
  };
  const key = keys[kind];
  return (
    <Image
      source={sectionIllustrations[key].image}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size * 0.8,
        borderRadius: 16,
        backgroundColor: "#F7F4E9",
      }}
    />
  );
}
