import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useLearning } from "../services/context";
import { groupStudents } from "../core/groups";
import { Button, Card, Field, Icon, Txt, useUITheme } from "./ui";
export function GroupRoster({
  classId,
  onSelect,
}: {
  classId: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useLearning();
  const { colors } = useUITheme();
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const students = groupStudents(state, classId).sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );
  const rows = students.map((student) => {
    const work = state.assignments.filter(
      (a) => a.studentId === student.id && a.classId === classId,
    );
    return {
      student,
      total: work.length,
      done: work.filter((a) => a.completedAt).length,
    };
  });
  const matches = rows.filter(
    (r) =>
      r.student.name
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")) &&
      (!pendingOnly || r.done < r.total),
  );
  return (
    <Card style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Txt size={24} weight="700" style={{ flex: 1 }}>
          Ученики
        </Txt>
        <Txt size={20} color={colors.muted}>
          {students.length}
        </Txt>
      </View>
      {!!students.length && (
        <>
          <Field
            label="Найти ученика"
            value={query}
            onChangeText={setQuery}
            placeholder="Имя или фамилия"
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button
              small
              secondary
              selected={!pendingOnly}
              onPress={() => setPendingOnly(false)}
            >
              Все
            </Button>
            <Button
              small
              secondary
              selected={pendingOnly}
              onPress={() => setPendingOnly(true)}
            >
              Есть задания
            </Button>
          </View>
        </>
      )}
      {matches.map(({ student, total, done }) => (
        <Pressable
          key={student.id}
          accessibilityRole="button"
          accessibilityLabel={`Открыть прогресс: ${student.name}${total ? `. Задания группы: ${done} из ${total}` : ""}`}
          onPress={() => onSelect(student.id)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderColor: colors.line,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              backgroundColor: colors.light,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt weight="700" size={16}>
              {student.name
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
            <Txt size={18} weight="600">
              {student.name}
            </Txt>
            <Txt size={14} color={colors.muted}>
              {total
                ? `Задания группы · ${done} из ${total}`
                : "Нет заданий группы"}
            </Txt>
            {total > 0 && (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Задания: ${student.name}`}
                accessibilityValue={{ min: 0, max: total, now: done }}
                style={{
                  height: 4,
                  borderRadius: 4,
                  backgroundColor: colors.line,
                }}
              >
                <View
                  style={{
                    height: 4,
                    borderRadius: 4,
                    width: `${(done / total) * 100}%`,
                    backgroundColor: colors.green,
                  }}
                />
              </View>
            )}
          </View>
          <Icon name="chevron-right" size={20} />
        </Pressable>
      ))}
      {!matches.length && (
        <Txt color={colors.muted}>
          {!students.length
            ? "Пока нет учеников. Пригласите их по коду группы."
            : query.trim()
              ? "Никого не нашли. Попробуйте другое имя."
              : "Невыполненных заданий нет."}
        </Txt>
      )}
    </Card>
  );
}
