import { AtlasImage } from "./AtlasImage";
import React, { useState } from "react";
import { Image, View, Platform } from "react-native";
import { Txt, useUITheme } from "./ui";
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
}: {
  title: string;
  themeTitle?: string;
  subject?: string;
  eyebrow?: string;
}) {
  const { clarity, colors } = useUITheme();
  const [width, setWidth] = useState(0);
  const cover = topicCover(themeTitle, subject);
  const wide = width >= 620;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: clarity ? colors.light : cover.color,
        padding: wide ? 32 : 22,
        gap: 20,
        flexDirection: wide ? "row" : "column",
        alignItems: "center",
      }}
    >
      <View
        style={{
          flex: wide ? 1 : undefined,
          width: wide ? undefined : "100%",
          gap: 22,
        }}
      >
        <Txt
          size={11}
          weight="600"
          color={clarity ? colors.muted : "#344E3C"}
          style={{ letterSpacing: 2 }}
        >
          {eyebrow ?? "МАТЕМАТИКА · КОНСПЕКТ"}
        </Txt>
        <Txt
          accessibilityRole="header"
          size={wide ? 40 : 30}
          color={clarity ? colors.ink : "#243E2D"}
          weight={clarity ? "700" : "400"}
          style={{
            fontFamily: clarity
              ? undefined
              : Platform.OS === "ios"
                ? "Georgia"
                : Platform.OS === "web"
                  ? "Georgia, serif"
                  : "serif",
            lineHeight: wide ? 47 : 37,
            letterSpacing: -0.6,
          }}
        >
          {clarity ? title.split(":")[0] : title}
        </Txt>
        {!clarity && (
          <View style={{ width: 52, height: 2, backgroundColor: "#839650" }} />
        )}
      </View>
      <AtlasImage
        source={cover.image}
        accessible={false}
        resizeMode="contain"
        style={{
          width: wide ? "38%" : "100%",
          height: wide ? 260 : 210,
          borderRadius: 18,
        }}
      />
    </View>
  );
}
