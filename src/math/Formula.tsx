import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
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
  if (!math)
    return (
      <Text selectable style={{ fontSize: size, color }}>
        {source}
      </Text>
    );
  return (
    <View
      accessible
      accessibilityLabel={source}
      style={{
        maxWidth: "100%",
        paddingVertical: 4,
        marginHorizontal: 2,
        ...(display ? { width: "100%", alignItems: "center" } : {}),
      }}
    >
      <ScrollView horizontal contentContainerStyle={{ alignItems: "center" }}>
        <SvgXml
          xml={math.svg}
          width={math.width * size}
          height={math.height * size}
          color={color}
        />
      </ScrollView>
    </View>
  );
}
