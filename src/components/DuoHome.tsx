import { MathIllustration } from "./MathIllustrations";
import { reviewSuggestions } from "../core/reports";
import React, { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { course, grades } from "../course/model";
import { useCourseProgress } from "../course/storage";
import { useLearning } from "../services/context";
import { nextLesson, lessonStatus } from "../course/journey";
import { courseContent } from "../course/content";
import { Button, Card, Disclosure, Icon, Txt, useUITheme } from "./ui";
import { StreakButton } from "./StreakButton";
import { PointsDetails } from "./PointsDetails";
import { useRewards } from "../engagement/RewardContext";
import { DuoJourney } from "./DuoJourney";
import { KnowledgePreview } from "./ClarityCards";
import { MyGroups } from "./Groups";

export function DuoHome({
  openCourse,
  openTopic,
  navigate,
}: {
  openCourse: (id: string) => void;
  openTopic: (id: string) => void;
  navigate: (tab: string) => void;
}) {
  const { colors } = useUITheme();
  const { actor, state } = useLearning();
  const storage = useCourseProgress(actor.id);
  const rewards = useRewards();
  const [chosenGrade, setGrade] = useState<number | null>(null);
  const latest = useMemo(
    () =>
      [...course]
        .filter((t) => storage.progress[t.id]?.updatedAt)
        .sort((a, b) =>
          storage.progress[b.id].updatedAt.localeCompare(
            storage.progress[a.id].updatedAt,
          ),
        )[0],
    [storage.progress],
  );
  const grade = chosenGrade ?? latest?.grade ?? 5;
  const topics = course.filter((t) => t.grade === grade);
  const next = nextLesson(topics, storage.progress);
  const completed = topics.filter(
    (t) => lessonStatus(t, storage.progress).complete,
  ).length;
  const wide = useWindowDimensions().width >= 1120;
  const homework = state.assignments.filter(
    (a) => a.studentId === actor.id && !a.completedAt,
  );
  const completedHomework = state.assignments.filter(
    (a) => a.studentId === actor.id && a.completedAt,
  );
  const suggestions = reviewSuggestions(state, actor.id);
  const nextIndex = next ? topics.indexOf(next) : 0;
  const start = Math.max(0, nextIndex - 1);
  const visible = topics.slice(start, start + 5);
  return (
    <View
      style={{ width: "100%", maxWidth: 1040, alignSelf: "center", gap: 24 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Txt size={28} weight="700" style={{ flex: 1 }}>
          Привет, {actor.name.split(" ")[0]}!
        </Txt>
        <StreakButton />
        <PointsDetails>
          {(open) => (
            <Button
              secondary
              small
              icon="star"
              onPress={open}
              label={`Очки: ${rewards.points}. Как получить очки`}
            >
              {rewards.ready ? rewards.points : "…"}
            </Button>
          )}
        </PointsDetails>
      </View>
      <View
        style={{
          backgroundColor: "#5125AD",
          borderRadius: 24,
          padding: 22,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, gap: 14 }}>
            <Txt size={wide ? 32 : 26} weight="800" color="#FFFFFF">
              Время учиться
            </Txt>
            <Button
              small
              onPress={() => (next ? openCourse(next.id) : navigate("Learn"))}
            >
              Продолжить
            </Button>
          </View>
          <View style={{ width: "43%", maxWidth: 240 }}>
            <MathIllustration kind="learn" height={140} decorative />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Button secondary icon="zap" onPress={() => navigate("Arena")}>
          Арена
        </Button>
        <Button secondary icon="hash" onPress={() => navigate("Calculator")}>
          Инструменты
        </Button>
      </View>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 28,
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: wide ? undefined : "100%",
            minWidth: 0,
            gap: 12,
          }}
        >
          {!wide && homework.length > 0 && (
            <Button
              fullWidth
              secondary
              icon="clipboard"
              onPress={() => openTopic(homework[0].topicId)}
            >
              От учителя:{" "}
              {state.topics
                .find((t) => t.id === homework[0].topicId)
                ?.title.split(":")[0] ?? "Задание"}
            </Button>
          )}
          <Disclosure title={`${grade} класс · Математика`} icon="grid">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {grades.map((g) => (
                <Button
                  key={g}
                  small
                  secondary
                  selected={g === grade}
                  onPress={() => setGrade(g)}
                >
                  {g} класс
                </Button>
              ))}
            </View>
          </Disclosure>
          <View
            style={{
              backgroundColor: colors.primary,
              padding: 24,
              borderRadius: 20,
              borderBottomWidth: 5,
              borderColor: colors.green,
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={13} weight="700" color={colors.onPrimary}>
                  МАЛЕНЬКИМИ ШАГАМИ
                </Txt>
                <Txt size={25} weight="700" color={colors.onPrimary}>
                  {next
                    ? courseContent[next.id].pages[0].title
                    : "Выбери своё открытие"}
                </Txt>
              </View>
              <Icon name="flag" size={32} color={colors.onPrimary} />
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Пройдено уроков в классе"
              accessibilityValue={{
                min: 0,
                max: topics.length,
                now: completed,
              }}
              style={{
                height: 8,
                backgroundColor: colors.green,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${(completed / Math.max(1, topics.length)) * 100}%`,
                  backgroundColor: colors.onPrimary,
                }}
              />
            </View>
          </View>
          {!storage.ready ? (
            <Card>
              <Txt>Загружаем твой путь…</Txt>
            </Card>
          ) : (
            <DuoJourney
              topics={visible}
              progress={storage.progress}
              open={(t) => openCourse(t.id)}
            />
          )}
          {!!storage.error && (
            <Card>
              <Txt color={colors.red} accessibilityRole="alert">
                {storage.error}
              </Txt>
              <Button secondary onPress={storage.retry}>
                Повторить
              </Button>
            </Card>
          )}
          <Button
            fullWidth
            secondary
            icon="grid"
            onPress={() => navigate("Learn")}
          >
            Все уроки
          </Button>
        </View>
        <View style={{ width: wide ? 290 : "100%", gap: 20 }}>
          {!!homework.length && (
            <Card style={{ gap: 16 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Icon name="clipboard" color={colors.green} />
                <Txt size={20} weight="700" style={{ flex: 1 }}>
                  От учителя
                </Txt>
                <Txt weight="700">{homework.length}</Txt>
              </View>
              {homework.slice(0, 3).map((a) => (
                <Button
                  key={a.id}
                  secondary
                  fullWidth
                  onPress={() => openTopic(a.topicId)}
                >
                  {state.topics
                    .find((t) => t.id === a.topicId)
                    ?.title.split(":")[0] ?? "Задание"}
                </Button>
              ))}
              {homework.length > 3 && (
                <Disclosure
                  title={`Ещё задания · ${homework.length - 3}`}
                  icon="list"
                >
                  {homework.slice(3).map((a) => (
                    <Button
                      key={a.id}
                      secondary
                      fullWidth
                      onPress={() => openTopic(a.topicId)}
                    >
                      {state.topics
                        .find((t) => t.id === a.topicId)
                        ?.title.split(":")[0] ?? "Задание"}
                    </Button>
                  ))}
                </Disclosure>
              )}
            </Card>
          )}
          {!!completedHomework.length && (
            <Disclosure
              title={`Выполнено · ${completedHomework.length}`}
              icon="check-circle"
            >
              {completedHomework.map((a) => (
                <Button
                  key={a.id}
                  secondary
                  fullWidth
                  onPress={() => openTopic(a.topicId)}
                >
                  {state.topics
                    .find((t) => t.id === a.topicId)
                    ?.title.split(":")[0] ?? "Задание"}
                </Button>
              ))}
            </Disclosure>
          )}
          {!!suggestions.length && (
            <Disclosure title="Что повторить" icon="refresh-cw">
              {suggestions.map((r) => (
                <Button
                  secondary
                  fullWidth
                  key={r.topicId}
                  onPress={() => openTopic(r.topicId)}
                >
                  {state.topics
                    .find((t) => t.id === r.topicId)
                    ?.title.split(":")[0] ?? "Повторить тему"}
                </Button>
              ))}
            </Disclosure>
          )}
          <KnowledgePreview compact onPress={() => navigate("Progress")} />
          <MyGroups />
        </View>
      </View>
    </View>
  );
}
