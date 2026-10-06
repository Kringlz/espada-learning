import { useSounds } from "../engagement/Sounds";
import { useUITheme } from "./ui";
import React from "react";
import { Image, ImageSourcePropType, Pressable, View } from "react-native";
import { Icon, Txt, colors } from "./ui";
import { ArtKind, artPalette, LearningArt } from "./LearningArt";

export function VisualCard({
  title,
  caption,
  kind,
  onPress,
  compact = false,
  horizontal = false,
  progress,
  label,
  cover,
}: {
  title: string;
  caption?: string;
  kind: ArtKind;
  onPress: () => void;
  compact?: boolean;
  horizontal?: boolean;
  progress?: number;
  label?: string;
  cover?: { image: ImageSourcePropType; color: string };
}) {
  const { colors, styles, dark } = useUITheme();
  const { play } = useSounds();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={() => {
        play("open");
        onPress();
      }}
      style={({ pressed }) => ({
        backgroundColor: dark
          ? colors.white
          : (cover?.color ?? artPalette[kind]),
        borderRadius: 26,
        padding: compact ? 16 : 22,
        flex: 1,
        gap: 10,
        opacity: pressed ? 0.8 : 1,
        minHeight: horizontal ? 132 : compact ? 190 : 245,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: "hidden",
      })}
    >
      <View
        style={{
          flexDirection: horizontal ? "row" : "column",
          alignItems: horizontal ? "center" : "stretch",
          flex: 1,
          gap: horizontal ? 14 : 10,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            flex: horizontal || cover ? undefined : 1,
          }}
        >
          {cover ? (
            <Image
              source={cover.image}
              accessible={false}
              resizeMode="contain"
              style={{
                width: horizontal ? 108 : "100%",
                height: horizontal ? 108 : compact ? 140 : 175,
                borderRadius: 18,
              }}
            />
          ) : (
            <LearningArt
              kind={kind}
              size={horizontal ? 96 : compact ? 112 : 166}
            />
          )}
        </View>
        <View style={{ flex: horizontal ? 1 : undefined, gap: 7 }}>
          <Txt
            size={compact ? 17 : 20}
            weight="700"
            style={{ lineHeight: compact ? 22 : 26 }}
          >
            {title}
          </Txt>
          {!!caption && (
            <Txt size={12} color={colors.muted}>
              {caption}
            </Txt>
          )}
        </View>
      </View>
      {!horizontal && (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 27,
            height: 27,
            borderRadius: 15,
            backgroundColor: colors.white,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow-up-right" size={15} />
        </View>
      )}
      {progress !== undefined && progress > 0 && (
        <View
          accessibilityLabel={`Прочитано ${Math.round(progress)}%`}
          style={{ height: 4, backgroundColor: "#FFFFFF90", borderRadius: 3 }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 3,
              width: `${Math.min(100, progress)}%`,
              backgroundColor: colors.green,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}
