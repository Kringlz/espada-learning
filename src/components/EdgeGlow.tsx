import React from "react";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { View } from "react-native";

export function EdgeGlow({ color = "#63D7AB" }: { color?: string }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={color} stopOpacity={0.52} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={-8} cy={52} rx={37} ry={66} fill={`url(#${id})`} />
        <Ellipse cx={108} cy={48} rx={37} ry={66} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
