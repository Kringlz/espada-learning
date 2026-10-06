import React, { useId } from "react";
import {
  Image,
  ImageProps,
  ImageStyle,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Defs,
  Filter,
  FeColorMatrix,
  Image as SvgImage,
} from "react-native-svg";
import { useTheme } from "../theme/Theme";
import { sectionIllustrations } from "./SectionIllustrations";

/** Original plates, enlarged in their frame; dark plates use ivory ink on black. */
export function AtlasImage({ style, source, ...props }: ImageProps) {
  const { dark } = useTheme();
  const filterId = `atlas-${useId().replace(/:/g, "")}`;
  const wideInstrument =
    source === sectionIllustrations.numbers.image ||
    source === sectionIllustrations.algebra.image;
  const imageFrame: ImageStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
    ...(wideInstrument
      ? { width: "160%", left: "-30%", transform: [{ rotate: "-36deg" }] }
      : {}),
  };
  return (
    <View
      style={[
        style,
        {
          overflow: "hidden",
          backgroundColor: dark ? "#000000" : "#EFEADE",
          borderRadius: 8,
        },
      ]}
    >
      {dark ? (
        <View style={imageFrame} pointerEvents="none" accessible={false}>
          <Svg width="100%" height="100%">
            <Defs>
              <Filter id={filterId} x="0%" y="0%" width="100%" height="100%">
                {/* Invert luminance into warm ivory; paper becomes pure black. */}
                <FeColorMatrix
                  type="matrix"
                  values="-.189 -.635 -.064 0 .888 -.172 -.577 -.058 0 .807 -.133 -.446 -.045 0 .624 0 0 0 1 0"
                />
              </Filter>
            </Defs>
            <SvgImage
              href={source}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              filter={`url(#${filterId})`}
            />
          </Svg>
        </View>
      ) : (
        <Image
          {...props}
          source={source}
          resizeMode="contain"
          style={[
            StyleSheet.absoluteFill,
            imageFrame,
            Platform.OS === "web" &&
              ({
                mixBlendMode: "multiply",
                filter: "grayscale(1) contrast(1.18) sepia(.25)",
              } as ImageStyle & { mixBlendMode: "multiply"; filter: string }),
          ]}
        />
      )}
    </View>
  );
}
