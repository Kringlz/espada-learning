import { PointsDetails } from "./PointsDetails";
import { StreakButton } from "./StreakButton";
import { MyGroups } from "./Groups";
import { AtlasImage } from "./AtlasImage";
import React from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { useLearning } from "../services/context";
import { useRewards } from "../engagement/RewardContext";
import { levelFor, levels } from "../engagement/rewards";
import { latestReportInsights } from "../core/reportInsights";
import { reportsFor } from "../core/reports";
import { useCourseProgress } from "../course/storage";
import { course } from "../course/model";
import { courseContent } from "../course/content";
import { topicCover } from "./TopicCover";
import { ResultRadar } from "./ResultRadar";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  dateText,
  useUITheme,
} from "./ui";

export function ClarityProgress({
  openCourse,
  openResult,
  details,
  children,
}: {
  openCourse?: (id: string) => void;
  openResult: (id: string) => void;
  details: () => void;
  children?: React.ReactNode;
}) {
  const { colors, styles } = useUITheme();
  const wide = useWindowDimensions().width >= 760;
  const { actor, state } = useLearning();
  const rewards = useRewards();
  const storage = useCourseProgress(actor.id);
  const data = latestReportInsights(state, actor.id);
  const reports = reportsFor(state, actor.id);
  const current = levels[levelFor(rewards.points)];
  const next = levels[levelFor(rewards.points) + 1];
  const levelPercent = next
    ? Math.min(
        100,
        ((rewards.points - current.points) / (next.points - current.points)) *
          100,
      )
    : 100;
  const started = course
    .filter((t) => storage.progress[t.id]?.updatedAt)
    .sort((a, b) =>
      storage.progress[b.id].updatedAt.localeCompare(
        storage.progress[a.id].updatedAt,
      ),
    );
  const read = started.reduce(
    (count, t) => count + storage.progress[t.id].readPages.length,
    0,
  );
  return (
    <View
      style={{ maxWidth: 1040, width: "100%", alignSelf: "center", gap: 28 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Txt
          size={wide ? 42 : 30}
          weight="700"
          style={{ letterSpacing: -1, flex: 1 }}
        >
          Мои успехи
        </Txt>
        <StreakButton />
      </View>
      <MyGroups />
      <View style={{ flexDirection: "row", gap: 14 }}>
        <PointsDetails>
          {(open) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Очки: ${rewards.points}. Как получить очки`}
              onPress={open}
              style={[
                styles.card,
                {
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: colors.warning,
                  padding: wide ? 26 : 18,
                  gap: 8,
                },
              ]}
            >
              <Icon name="star" size={26} color={colors.green} />
              <Txt size={38} weight="700">
                {rewards.ready ? rewards.points : "…"}
              </Txt>
              <Txt size={16} color={colors.muted}>
                Очки
              </Txt>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={
                  next ? `До уровня ${next.name}` : "Все уровни открыты"
                }
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(levelPercent),
                }}
                style={{
                  height: 6,
                  borderRadius: 6,
                  backgroundColor: colors.line,
                }}
              >
                <View
                  style={{
                    width: `${levelPercent}%`,
                    height: 6,
                    borderRadius: 6,
                    backgroundColor: colors.green,
                  }}
                />
              </View>
              <Txt size={14} color={colors.muted}>
                {current.name}
              </Txt>
            </Pressable>
          )}
        </PointsDetails>
        <Card
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: colors.light,
            padding: wide ? 26 : 18,
            gap: 8,
          }}
        >
          <Icon name="book-open" size={26} color={colors.green} />
          <Txt size={38} weight="700">
            {storage.ready ? read : "…"}
          </Txt>
          <Txt size={16} color={colors.muted}>
            Разделов прочитано
          </Txt>
        </Card>
      </View>
      {(rewards.error || storage.error) && (
        <Card>
          <Txt accessibilityRole="alert" color={colors.red}>
            {rewards.error || storage.error}
          </Txt>
          <Button
            onPress={() => {
              rewards.retry();
              storage.retry();
            }}
          >
            Повторить
          </Button>
        </Card>
      )}
      <Card style={{ padding: wide ? 28 : 20, gap: 20 }}>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Txt size={26} weight="700" style={{ flex: 1 }}>
            Карта знаний
          </Txt>
          {data && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть результат работы"
              onPress={() => openResult(data.report.id)}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: colors.light,
              }}
            >
              <Icon name="arrow-up-right" />
            </Pressable>
          )}
        </View>
        {data ? (
          <>
            <Txt size={14} color={colors.muted}>
              {dateText(data.report.date)}
              {data.report.demo ? " · учебный пример" : ""}
            </Txt>
            <View
              style={{
                flexDirection: wide ? "row" : "column",
                alignItems: "center",
                gap: wide ? 36 : 24,
              }}
            >
              <View
                style={{ width: wide ? "42%" : "100%", alignItems: "center" }}
              >
                <ResultRadar
                  compact
                  template={data.template}
                  report={data.report}
                />
              </View>
              <View
                style={{
                  flex: wide ? 1 : undefined,
                  width: wide ? undefined : "100%",
                  gap: 18,
                }}
              >
                {data.areas.map((area) => (
                  <View key={area.id} style={{ gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <AtlasImage
                        source={topicCover(area.label).image}
                        accessible={false}
                        resizeMode="contain"
                        style={{ width: 32, height: 32 }}
                      />
                      <Txt size={17} style={{ flex: 1 }}>
                        {area.label}
                      </Txt>
                      <Txt size={17} weight="700">
                        {area.value === null ? "—" : `${area.value}%`}
                      </Txt>
                    </View>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel={area.label}
                      accessibilityValue={
                        area.value === null
                          ? { text: "Нет данных" }
                          : { min: 0, max: 100, now: area.value }
                      }
                      style={{
                        height: 6,
                        borderRadius: 6,
                        backgroundColor: colors.light,
                      }}
                    >
                      <View
                        style={{
                          width: `${area.value ?? 0}%`,
                          height: 6,
                          borderRadius: 6,
                          backgroundColor: colors.green,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 30, alignItems: "center", gap: 20 }}>
            <Icon name="compass" size={64} color={colors.green} />
            <Txt color={colors.muted}>Появится после первой работы</Txt>
          </View>
        )}
      </Card>
      {!!started.length && openCourse && (
        <View style={{ gap: 18 }}>
          <Txt size={26} weight="700">
            Твой путь
          </Txt>
          {started.slice(0, 3).map((t) => {
            const p = storage.progress[t.id];
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`Продолжить: ${courseContent[t.id].pages[0].title}`}
                onPress={() => openCourse(t.id)}
                style={({ pressed }) => ({
                  padding: 20,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.white,
                  gap: 16,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <AtlasImage
                    source={topicCover(t.title, t.subject).image}
                    accessible={false}
                    resizeMode="contain"
                    style={{ width: 48, height: 48 }}
                  />
                  <Txt size={20} weight="600" style={{ flex: 1 }}>
                    {courseContent[t.id].pages[0].title}
                  </Txt>
                  <Icon name="arrow-right" size={20} />
                </View>
                <View
                  style={{ flexDirection: "row", gap: 5 }}
                  accessibilityLabel={`Прочитано ${p.readPages.length} из ${t.pages.length} разделов`}
                >
                  {t.pages.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 6,
                        backgroundColor: p.readPages.includes(i)
                          ? colors.green
                          : colors.line,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Disclosure title="История работ" icon="clock">
        {reports.map((r) => (
          <Button key={r.id} secondary small onPress={() => openResult(r.id)}>
            Работа · {dateText(r.date)}
            {r.demo ? " · демо" : ""}
          </Button>
        ))}
        {children}
        <Button secondary onPress={details}>
          Все результаты
        </Button>
      </Disclosure>
    </View>
  );
}
