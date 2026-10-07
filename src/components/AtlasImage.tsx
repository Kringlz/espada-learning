import React from "react";
import { Image, ImageProps, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useTheme } from "../theme/Theme";

/** Shared section artwork; the legacy name keeps existing card callers compatible. */
export function AtlasImage({
  style,
  source,
  accessible,
  accessibilityLabel,
  ...props
}: ImageProps) {
  const { dark } = useTheme();
  const uri =
    source && typeof source === "object" && !Array.isArray(source)
      ? source.uri
      : undefined;
  const xml = uri?.startsWith("data:image/svg+xml;utf8,")
    ? decodeURIComponent(uri.slice("data:image/svg+xml;utf8,".length))
    : null;
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={[
        style,
        {
          overflow: "hidden",
          backgroundColor: dark ? "#000" : "#EFEADE",
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {xml ? (
        <SvgXml
          xml={xml}
          color={dark ? "#F2E8CF" : "#294638"}
          width="86%"
          height="86%"
        />
      ) : (
        <Image
          {...props}
          source={source}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </View>
  );
}
