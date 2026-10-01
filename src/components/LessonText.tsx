import { useUITheme } from "./ui";
import React from "react";
import { Text, View } from "react-native";
import { formatLessonText } from "../lessons/formatText";
import { colors } from "./ui";
import { RichText } from "../course/RichText";

/** The source remains selectable text; only explicit formatting is interpreted. */
export function LessonText({ text }: { text: string }) {
  const { colors, styles } = useUITheme();
  return (
    <View style={{ gap: 18 }}>
      {formatLessonText(text).map((block, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          {block.kind === "item" && (
            <Text style={{ fontSize: 18, lineHeight: 30, color: colors.green }}>
              {/^\d/.test(block.marker!) ? block.marker : "•"}
            </Text>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <RichText
              heading={block.kind === "heading"}
              size={block.kind === "heading" ? 23 : 18}
              weight={block.kind === "heading" ? "700" : "400"}
              runs={block.text
                .split(/(\*\*[^*\n]+\*\*)/g)
                .map((part) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? { text: part.slice(2, -2), bold: true }
                    : { text: part },
                )}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
