import React from "react";
import { View, useWindowDimensions } from "react-native";
import { Txt } from "./ui";
import { Starfield, StarGlyph } from "./Starfield";
import { sectionIllustrations } from "./SectionIllustrations";
import { topicIllustration } from "../core/topicIllustration";
export function topicCover(title: string, subject = "") {
  return sectionIllustrations[topicIllustration(title, subject)];
}
export function TopicCover({
  title,
  themeTitle = title,
  subject,
  eyebrow,
  starId,
}: {
  title: string;
  themeTitle?: string;
  subject?: string;
  eyebrow?: string;
  starId?: string;
}) {
  const compact = useWindowDimensions().width < 600;
  return (
    <View
      style={{
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: "#0B1120",
        borderWidth: 1,
        borderColor: "#2A354E",
        padding: compact ? 26 : 38,
        gap: 20,
        alignItems: "center",
      }}
    >
      <Starfield height={360} />
      <Txt size={10} color="#9EACCA" style={{ letterSpacing: 2.5 }}>
        {eyebrow ?? "МАТЕМАТИКА · НОВОЕ ОТКРЫТИЕ"}
      </Txt>
      <StarGlyph
        id={starId ?? themeTitle}
        size={160}
        selected
        color={subject === "geometry" ? "#B8DFD9" : "#C2CDFF"}
      />
      <Txt
        accessibilityRole="header"
        size={compact ? 28 : 38}
        color="#EDF1FC"
        weight="400"
        style={{ textAlign: "center", letterSpacing: -0.8 }}
      >
        {title}
      </Txt>
      <Txt size={13} color="#9EACCA">
        Ещё одна звезда в твоей вселенной знаний
      </Txt>
    </View>
  );
}
