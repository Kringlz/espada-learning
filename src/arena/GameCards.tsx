import { MathCopy as Txt } from "../math/MathCopy";
import React from "react";
import { Pressable, View } from "react-native";
import { Card, useUITheme } from "../components/ui";
import { ArenaQuestion, Review } from "./model";

const tileColors = ["#D62C50", "#2461CA", "#A66A00", "#16805B"];
const symbols = ["▲", "◆", "●", "■"];
export function Answers({
  question,
  selected,
  reveal,
  disabled,
  choose,
}: {
  question: ArenaQuestion;
  selected?: number | null;
  reveal: boolean;
  disabled: boolean;
  choose: (index: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {question.choices.map((choice, i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={`Ответ ${choice}${reveal && question.answer === i ? ", верный" : ""}`}
          accessibilityState={{ disabled, selected: selected === i }}
          disabled={disabled}
          onPress={() => choose(i)}
          style={({ pressed }) => ({
            width: "47%",
            flexGrow: 1,
            minHeight: 88,
            padding: 15,
            borderRadius: 18,
            backgroundColor: tileColors[i],
            borderWidth: 3,
            borderColor:
              selected === i || (reveal && question.answer === i)
                ? "#FFFFFF"
                : "transparent",
            opacity:
              reveal && question.answer !== i ? 0.55 : pressed ? 0.75 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          })}
        >
          <Txt color="#FFFFFF" size={18}>
            {reveal && question.answer === i ? "✓" : symbols[i]}
          </Txt>
          <Txt
            color="#FFFFFF"
            size={27}
            weight="800"
            style={{ flex: 1, textAlign: "center" }}
          >
            {choice}
          </Txt>
          {selected === i && (
            <Txt color="#FFFFFF" size={13}>
              Твой
            </Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}
export function ReviewList({ rows }: { rows: Review[] }) {
  const { colors } = useUITheme();
  const mistakes = rows.filter((r) => r.choice !== r.answer);
  return (
    <Card style={{ gap: 14 }}>
      <Txt size={22} weight="800">
        {mistakes.length ? "Разберём ошибки" : "Все ответы верные!"}
      </Txt>
      {!mistakes.length && (
        <Txt color={colors.muted}>Отличная точность. Попробуй другую тему.</Txt>
      )}
      {mistakes.map((r, i) => (
        <View
          key={i}
          style={{
            paddingVertical: 12,
            borderTopWidth: 1,
            borderColor: colors.line,
            gap: 4,
          }}
        >
          <Txt weight="700">{r.prompt}</Txt>
          <Txt size={14} color={colors.muted}>
            {r.choice === null
              ? "Время истекло"
              : `Твой ответ: ${r.choices[r.choice]}`}
          </Txt>
          <Txt color={colors.green}>{r.explanation}</Txt>
        </View>
      ))}
    </Card>
  );
}
