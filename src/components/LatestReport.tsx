import { useUITheme } from "./ui";
import React from "react";
import { View } from "react-native";
import { latestReportInsights } from "../core/reportInsights";
import { hasMaterial } from "../core/reports";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Pill,
  Txt,
  colors,
  dateText,
} from "./ui";
import { ResultRadar } from "./ResultRadar";
import { LearningArt } from "./LearningArt";

export function LatestReport({
  studentId,
  openResult,
  openTopic,
}: {
  studentId: string;
  openResult: (id: string) => void;
  openTopic: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state, actor } = useLearning();
  const data = latestReportInsights(state, studentId);
  if (!data)
    return (
      <Card style={{ alignItems: "center", padding: 30, gap: 14 }}>
        <LearningArt kind="compass" size={220} />
        <Txt size={24} weight="700">
          Твоя карта скоро появится
        </Txt>
        <Txt
          color={colors.muted}
          style={{ textAlign: "center", maxWidth: 350 }}
        >
          Пройди офлайн-тест. Учитель добавит результаты, и ты увидишь свои
          сильные стороны.
        </Txt>
      </Card>
    );
  const { report, template, earlier, areas, strongest, repeat, uniform } = data;
  const next = repeat
    .flatMap((a) => a.topicIds)
    .map((id) => state.topics.find((t) => t.id === id))
    .find((t) => t && hasMaterial(t));
  return (
    <Card style={{ padding: 22, gap: 20, borderWidth: 0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Txt size={23} weight="700">
            Карта результатов
          </Txt>
          <Txt size={12} color={colors.muted}>
            Последний офлайн-тест
          </Txt>
          <Txt size={12} color={colors.muted}>
            {dateText(report.date)}
          </Txt>
        </View>
        <View
          accessibilityLabel={`Оценка ${report.grade} из ${template.scale.max}`}
          style={{
            width: 64,
            height: 72,
            backgroundColor: colors.light,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt size={32} weight="700" color={colors.green}>
            {report.grade}
          </Txt>
          <Txt size={11} color={colors.muted}>
            из {template.scale.max}
          </Txt>
        </View>
      </View>
      {report.demo && <Pill tone="gold">Учебные данные</Pill>}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 20,
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexBasis: 300,
            flexShrink: 1,
            maxWidth: "100%",
            minWidth: 0,
            backgroundColor: colors.light,
            paddingVertical: 8,
            borderRadius: 26,
          }}
        >
          <ResultRadar template={template} report={report} earlier={earlier} />
        </View>
        <View
          style={{
            flexGrow: 1,
            flexBasis: 260,
            flexShrink: 1,
            maxWidth: "100%",
            minWidth: 0,
            gap: 14,
          }}
        >
          {!!strongest.length && (
            <View
              style={{
                backgroundColor: colors.light,
                borderRadius: 24,
                padding: 20,
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="star" color={colors.green} size={20} />
                <Txt size={13} color={colors.green} weight="600">
                  {uniform
                    ? "Ровный результат"
                    : data.measuredCount === 1
                      ? "Проверенный раздел"
                      : "Сильная сторона"}
                </Txt>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <Txt size={20} weight="700" style={{ flex: 1 }}>
                  {uniform
                    ? "Все разделы"
                    : strongest.map((a) => a.label).join(" · ")}
                </Txt>
                <Txt size={30} weight="700" color={colors.green}>
                  {strongest[0].value}%
                </Txt>
              </View>
            </View>
          )}
          {!!repeat.length && (
            <View
              style={{
                backgroundColor: colors.light,
                borderRadius: 24,
                padding: 20,
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon name="target" color={colors.orange} size={20} />
                <Txt size={13} color={colors.orange} weight="600">
                  {uniform ? "Закрепим знания" : "Немного практики"}
                </Txt>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <Txt size={20} weight="700" style={{ flex: 1 }}>
                  {uniform
                    ? "Выбери любой раздел"
                    : repeat.map((a) => a.label).join(" · ")}
                </Txt>
                {!uniform && (
                  <Txt size={30} weight="700" color={colors.orange}>
                    {repeat[0].value}%
                  </Txt>
                )}
              </View>
              {next && (
                <Button
                  icon="arrow-right"
                  label={`Повторить: ${next.title}`}
                  onPress={() => openTopic(next.id)}
                >
                  {actor.role === "parent"
                    ? "Материалы для повторения"
                    : "Потренироваться"}
                </Button>
              )}
            </View>
          )}
          {!!data.total && (
            <View style={{ flexDirection: "row", gap: 12, padding: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt size={28} weight="700">
                  {data.correct}
                  <Txt size={17} color={colors.muted}>
                    {" "}
                    / {data.total}
                  </Txt>
                </Txt>
                <Txt size={12} color={colors.muted}>
                  ответов верно
                </Txt>
              </View>
              {!!data.comparedCount && (
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt size={28} weight="700" color={colors.green}>
                    ↑ {data.improved.length}
                    <Txt size={17} color={colors.muted}>
                      {" "}
                      / {data.comparedCount}
                    </Txt>
                  </Txt>
                  <Txt size={12} color={colors.muted}>
                    разделов лучше
                  </Txt>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      <Disclosure title="Подробнее о тесте" icon="bar-chart-2">
        <Txt weight="700">{template.name}</Txt>
        {areas.map((a) => (
          <View key={a.id} style={{ gap: 6, paddingVertical: 7 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              <Txt style={{ flex: 1 }} weight="600">
                {a.label}
              </Txt>
              <Txt color={colors.green}>
                {a.value === null ? "—" : `${a.value}%`}
              </Txt>
            </View>
            {a.value !== null && (
              <View
                style={{
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: colors.light,
                }}
              >
                <View
                  style={{
                    height: 6,
                    width: `${a.value}%`,
                    borderRadius: 4,
                    backgroundColor: colors.green,
                  }}
                />
              </View>
            )}
            <Txt size={13} color={colors.muted}>
              {a.value === null
                ? "Нет данных"
                : `${a.result!.correct} из ${a.result!.total} верно`}
              {a.change !== null ? ` · раньше ${a.previous}%` : ""}
            </Txt>
          </View>
        ))}
        <Txt size={12} color={colors.muted}>
          {earlier
            ? `Сравнение с ${dateText(earlier.date)}. Сложность тестов может отличаться.`
            : "Сравнение появится после следующей сопоставимой работы."}
        </Txt>
        <Button secondary onPress={() => openResult(report.id)}>
          Открыть работу
        </Button>
      </Disclosure>
    </Card>
  );
}
