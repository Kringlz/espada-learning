import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Txt, useUITheme } from "../components/ui";
import { RichText } from "../course/RichText";
import { mathSegments } from "./notation";

/** Educational copy: preserve prose and render mathematical spans with bundled TeX. */
export function MathCopy({
  children,
  size,
  color,
  weight = "400",
  style,
  prose = false,
  ...props
}: React.ComponentProps<typeof Txt>) {
  const { clarity } = useUITheme();
  const parts = React.Children.toArray(children);
  if (!parts.every((p) => typeof p === "string" || typeof p === "number"))
    return (
      <Txt {...props} {...{ size, color, weight, style }}>
        {children}
      </Txt>
    );
  const text = parts.join("");
  if (!prose && !mathSegments(text).some((s) => s.latex))
    return (
      <Txt {...props} {...{ size, color, weight, style }}>
        {children}
      </Txt>
    );
  const flat = StyleSheet.flatten(style);
  return (
    <View
      {...props}
      accessibilityRole={undefined}
      style={[{ minWidth: 0 }, style as StyleProp<ViewStyle>]}
    >
      <RichText
        runs={[{ text }]}
        size={size ?? (clarity ? 18 : 15)}
        color={color}
        weight={Number(weight) >= 600 ? "600" : "400"}
        heading={props.accessibilityRole === "header"}
        align={flat?.textAlign}
      />
    </View>
  );
}
