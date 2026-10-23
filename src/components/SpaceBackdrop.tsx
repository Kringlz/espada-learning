import React, { useId } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "../theme/Theme";

/** A quiet, fixed star field keeps reading surfaces part of the home universe. */
export function SpaceBackdrop() {
  const { dark } = useTheme();
  const id = useId().replace(/:/g, "");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor="#9860D9" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#6C41AB" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="160" cy="650" rx="600" ry="490" fill={`url(#${id})`} />
        <Ellipse cx="1050" cy="160" rx="620" ry="540" fill={`url(#${id})`} />
        {Array.from({ length: 72 }, (_, i) => (
          <Circle
            key={i}
            cx={(i * 7919 + 71) % 1200}
            cy={(i * 1877 + 19) % 900}
            r={i % 13 === 0 ? 1.1 : 0.55}
            fill="#DBCAFA"
            opacity={0.07 + (i % 5) * 0.025}
          />
        ))}
      </Svg>
    </View>
  );
}
