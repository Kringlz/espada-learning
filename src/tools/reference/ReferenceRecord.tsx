import { MathCopy as Txt } from "../../math/MathCopy";
import React from "react";
import { View } from "react-native";
import { useUITheme } from "../../components/ui";
import { ReferenceEntry, referenceTopics } from "./data";
import { ReferenceMath } from "./ReferenceMath";
import { ReferenceDiagram } from "./ReferenceDiagram";

/** All of a record is present in the reading flow, including every condition. */
export function ReferenceRecord({
  item,
  showTopic,
}: {
  item: ReferenceEntry;
  showTopic: boolean;
}) {
  const { colors, dark } = useUITheme();
  const accent = dark ? "#A8D5B8" : "#326B4B";
  return (
    <View
      testID={`reference-entry-${item.id}`}
      style={{
        gap: 10,
        paddingVertical: 26,
        borderBottomWidth: 1,
        borderColor: colors.line,
        minWidth: 0,
      }}
    >
      {showTopic && (
        <Txt size={12} color={accent}>
          {referenceTopics.find((t) => t.id === item.topic)?.title}
        </Txt>
      )}
      <Txt size={18} weight="600" accessibilityRole="header">
        {item.title}
      </Txt>
      {!!item.formulas.length && (
        <View style={{ gap: 4, minWidth: 0, paddingVertical: 4 }}>
          {item.formulas.map((formula, i) => (
            <ReferenceMath
              key={`${item.id}-${i}`}
              {...formula}
              color={colors.ink}
            />
          ))}
        </View>
      )}
      <ReferenceDiagram id={item.id} />
      {!!item.rule && (
        <Txt size={16} style={{ lineHeight: 24 }}>
          {item.rule}
        </Txt>
      )}
      {!!item.notation && (
        <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
          {item.notation}
        </Txt>
      )}
      <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
        Условия: {item.conditions}
      </Txt>
    </View>
  );
}
