import React, { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Txt, useUITheme, Disclosure } from "../../components/ui";
import { backend } from "../../services/supabase";
import { useLearning } from "../../services/context";
import { course, parseProgress, progressKey } from "../model";
import {
  latestPractice,
  practiceSnapshots,
  type SharedPractice,
} from "./sharing";
export function PracticeSummary({
  studentId,
  compact = false,
}: {
  studentId: string;
  compact?: boolean;
}) {
  const { actor, mode } = useLearning(),
    { colors } = useUITheme();
  const [rows, setRows] = useState<SharedPractice[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [epoch, setEpoch] = useState(0);
  useEffect(() => {
    let live = true;
    setRows([]);
    setLoading(true);
    setError("");
    (async () => {
      if (mode !== "supabase") {
        const progress = parseProgress(
          await AsyncStorage.getItem(progressKey(studentId)),
        );
        return practiceSnapshots(progress).map((s) => ({
          topic_id: s.topicId,
          correct: s.correct,
          incorrect: s.incorrect,
          completed: s.completed,
          finished: s.finished,
          passed: !!progress[s.topicId]?.trainer?.mastered,
          observed_at: s.updatedAt,
        }));
      }
      if (!backend) throw Error("Нет подключения");
      const { data, error } = await backend
        .from("trainer_practice")
        .select(
          "topic_id,correct,incorrect,completed,finished,passed,observed_at",
        )
        .eq("student_id", studentId);
      if (error) throw error;
      return latestPractice(data ?? []);
    })()
      .then((data) => {
        if (live) setRows(latestPractice(data));
      })
      .catch(() => {
        if (live) setError("Не удалось загрузить практику.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [actor.id, studentId, epoch, mode]);
  if (compact)
    return (
      <View style={{ gap: 4 }}>
        <Txt size={13} color={colors.muted}>
          Тренажёры
        </Txt>
        <Txt size={14}>
          {loading
            ? "Загрузка…"
            : error ||
              (rows.length
                ? `${rows.length} тем · ${rows.filter((r) => r.passed).length} пройдено`
                : "Практика ещё не передана")}
        </Txt>
      </View>
    );
  return (
    <View testID="shared-practice" style={{ gap: 18, paddingVertical: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Txt size={24} weight="600">
          Тренажёры
        </Txt>
        <Button
          small
          secondary
          icon="refresh-cw"
          onPress={() => setEpoch((n) => n + 1)}
        >
          Обновить практику
        </Button>
      </View>
      <Txt size={13} color={colors.muted}>
        Последняя практика по темам · верно с первой попытки
      </Txt>
      {loading ? (
        <Txt color={colors.muted}>Загрузка…</Txt>
      ) : error ? (
        <Txt accessibilityRole="alert" color={colors.red}>
          {error}
        </Txt>
      ) : !rows.length ? (
        <Txt color={colors.muted}>
          {mode !== "supabase"
            ? "На этом устройстве ещё нет практики ученика."
            : "Ученик ещё не передал результаты тренажёров."}
        </Txt>
      ) : (
        rows.map((r) => {
          const total = r.correct + r.incorrect,
            accuracy = total ? Math.round((r.correct / total) * 100) : 0;
          return (
            <View
              key={r.topic_id}
              style={{
                gap: 9,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <Txt size={17} weight="600">
                {course.find((t) => t.id === r.topic_id)?.title ?? r.topic_id}
              </Txt>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 18,
                  flexWrap: "wrap",
                }}
              >
                <Txt size={23} color={colors.green}>
                  {r.correct} / {total}
                </Txt>
                <Txt color={colors.muted}>{accuracy}%</Txt>
                <Txt size={13} color={r.passed ? colors.green : colors.muted}>
                  {r.passed ? "Пройдено" : "В практике"}
                </Txt>
              </View>
              <View
                accessibilityLabel={`Точность ${accuracy}%`}
                style={{
                  height: 4,
                  backgroundColor: colors.line,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: `${accuracy}%`,
                    backgroundColor: colors.green,
                  }}
                />
              </View>
            </View>
          );
        })
      )}
      <Disclosure title="Как считается">
        <Txt size={13} color={colors.muted}>
          Прохождение: завершить не меньше 15 заданий с точностью от 80%. Это
          практика с устройств ученика, отдельно от оценок учителя.
        </Txt>
      </Disclosure>
    </View>
  );
}
