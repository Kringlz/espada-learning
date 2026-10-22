import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Txt, useUITheme } from "./ui";
export function Brand({ compact = false }: { compact?: boolean }) {
  const { colors } = useUITheme();
  return (
    <View
      accessibilityLabel="Espada"
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <Svg width="35" height="40" viewBox="0 0 40 44" aria-hidden={true}>
        <Path
          d="M20 2 L23 17 L38 22 L23 25 L20 42 L17 25 L2 22 L17 17 Z"
          fill="none"
          stroke={colors.green}
          strokeWidth="1.2"
        />
        <Path
          d="M20 10 L22 20 L30 22 L22 24 L20 34 L18 24 L10 22 L18 20 Z"
          fill={colors.ink}
        />
        <Circle cx="32" cy="9" r="1.5" fill={colors.green} />
      </Svg>
      {!compact && (
        <Txt size={24} weight="500" style={{ letterSpacing: -0.8 }}>
          espada
          <Txt size={18} color={colors.green}>
            .
          </Txt>
        </Txt>
      )}
    </View>
  );
}
