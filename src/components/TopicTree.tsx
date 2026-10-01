import { useUITheme } from "./ui";
import { translate } from "../i18n";
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useLearning } from "../services/context";
import { sections } from "../data/outline";
import { topicMastery } from "../core/reports";
import {
  Button,
  Card,
  Txt,
  Field,
  Pill,
  Icon,
  Disclosure,
  colors,
  styles,
} from "./ui";
export function TopicTree({ openTopic }: { openTopic: (id: string) => void }) {
  const { colors, styles } = useUITheme();
  const { state, actor } = useLearning();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(["section-01"]);
  const isStudent = actor.role === "student";
  const curriculum = state.topics.filter((t) => t.sectionId);
  const known = curriculum.filter(
    (t) => topicMastery(state, actor.id, t.id).status === "Освоено",
  ).length;
  const ready = curriculum.filter((t) => t.videos?.length || t.video).length;
  const matches = (title: string, order?: number) =>
    !query.trim() ||
    `${order ?? ""} ${title}`
      .toLocaleLowerCase("ru-RU")
      .includes(query.trim().toLocaleLowerCase("ru-RU"));
  const filtered = sections.filter((s) =>
    state.topics.some(
      (t) =>
        t.sectionId === s.id && (matches(t.title, t.order) || matches(s.title)),
    ),
  );
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Pill>МАТЕМАТИКА · 108 ТЕМ</Pill>
        <Txt size={27} weight="600">
          Темы
        </Txt>
        <Txt color={colors.muted}>
          От первых чисел до уравнений и геометрии. Откройте раздел и выберите
          следующий шаг.
        </Txt>
      </View>
      <Card style={{ backgroundColor: colors.light }}>
        <Txt weight="600">
          {isStudent
            ? `Освоено ${known} из ${curriculum.length} тем`
            : `Видео добавлены: ${ready} из 108 тем`}
        </Txt>
        <Txt size={13} color={colors.muted}>
          {isStudent
            ? "Это охват программы, а не оценка способностей. Все темы открыты. Просмотр урока не заменяет проверку."
            : "22 раздела по вашей программе. Откройте тему, чтобы добавить или посмотреть видеоурок."}
        </Txt>
      </Card>
      <Field
        label="Найти тему"
        placeholder="Название или номер темы"
        value={query}
        onChangeText={setQuery}
      />
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          icon="chevrons-down"
          small
          secondary
          onPress={() => setExpanded(sections.map((s) => s.id))}
        >
          Развернуть всё
        </Button>
        <Button
          small
          secondary
          icon="chevrons-up"
          onPress={() => setExpanded([])}
        >
          Свернуть всё
        </Button>
      </View>
      {!filtered.length && (
        <Txt>Ничего не найдено. Попробуйте другое название.</Txt>
      )}
      {filtered.map((section) => {
        const topics = curriculum
          .filter((t) => t.sectionId === section.id)
          .sort((a, b) => a.order! - b.order!);
        const open = !!query.trim() || expanded.includes(section.id);
        const completed = topics.filter(
          (t) => topicMastery(state, actor.id, t.id).status === "Освоено",
        ).length;
        return (
          <View key={section.id} style={{ gap: 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${section.number}. ${section.title}`}
              onPress={() =>
                setExpanded((x) =>
                  x.includes(section.id)
                    ? x.filter((id) => id !== section.id)
                    : [...x, section.id],
                )
              }
              style={{
                backgroundColor: colors.light,
                padding: 13,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Txt size={20} color={colors.green} weight="600">
                {String(section.number).padStart(2, "0")}
              </Txt>
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={16} weight="600">
                  {section.title}
                </Txt>
                <Txt size={12} color={colors.muted}>
                  Темы {section.start}
                  {section.end !== section.start ? `–${section.end}` : ""}
                  {isStudent ? ` · освоено: ${completed}/${topics.length}` : ""}
                </Txt>
              </View>
              <Icon name={open ? "chevron-up" : "chevron-down"} />
            </Pressable>
            {open && (
              <View
                style={{
                  marginLeft: 12,
                  borderLeftWidth: 2,
                  borderColor: "#D1DBCA",
                  paddingLeft: 10,
                  paddingTop: 12,
                  gap: 10,
                }}
              >
                {topics
                  .filter(
                    (t) => matches(t.title, t.order) || matches(section.title),
                  )
                  .map((t) => {
                    const skill = topicMastery(state, actor.id, t.id);
                    const count = (t.videos?.length ?? 0) + (t.video ? 1 : 0);
                    const visited = state.activities.some(
                      (a) => a.studentId === actor.id && a.topicId === t.id,
                    );
                    return (
                      <Pressable
                        key={t.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Тема ${t.order}. ${t.title}`}
                        onPress={() => openTopic(t.id)}
                        style={{
                          backgroundColor: "white",
                          borderWidth: 1,
                          borderColor: colors.line,
                          borderRadius: 14,
                          padding: 12,
                          gap: 10,
                        }}
                      >
                        <View
                          style={[styles.row, { alignItems: "flex-start" }]}
                        >
                          <View
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              backgroundColor:
                                skill.status === "Освоено"
                                  ? colors.green
                                  : colors.light,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Txt
                              size={12}
                              weight="600"
                              color={
                                skill.status === "Освоено"
                                  ? "white"
                                  : colors.green
                              }
                            >
                              {t.order}
                            </Txt>
                          </View>
                          <Txt weight="600" style={{ flex: 1 }}>
                            {t.title}
                          </Txt>
                          <Icon name="chevron-right" size={17} />
                        </View>
                        <View style={[styles.row, { flexWrap: "wrap" }]}>
                          {isStudent && (
                            <Pill
                              icon={
                                skill.status === "Освоено"
                                  ? "check-circle"
                                  : skill.status === "Получается"
                                    ? "trending-up"
                                    : skill.status === "Изучаю"
                                      ? "clock"
                                      : "circle"
                              }
                              tone={
                                skill.status === "Ещё не проверяли"
                                  ? "neutral"
                                  : "green"
                              }
                            >
                              {skill.status}
                              {visited && skill.status === "Ещё не проверяли"
                                ? " · Открывали урок"
                                : ""}
                            </Pill>
                          )}
                          <Txt size={12} color={colors.muted}>
                            {count ? `Видео: ${count}` : "Видео пока нет"}
                            {t.practice ? " · Есть практика" : ""}
                          </Txt>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </View>
        );
      })}
      <Disclosure title="Дополнительная практика" icon="book-open">
        <Txt size={13} color={colors.muted}>
          Материалы первой версии, сохранённые вместе с результатами.
        </Txt>
        {state.topics
          .filter((t) => !t.sectionId)
          .map((t) => (
            <Button key={t.id} secondary onPress={() => openTopic(t.id)}>
              {t.title}
            </Button>
          ))}
      </Disclosure>
    </View>
  );
}
