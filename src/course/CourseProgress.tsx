import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { LearningArt } from "../components/LearningArt";
import { courseContent } from "./content";
import { course } from "./model";
import { useCourseProgress } from "./storage";
import { quizStats } from "./quiz";

export function CourseProgress({
  openCourse,
}: {
  openCourse: (id: string) => void;
}) {
  const { colors } = useUITheme();
  const { actor } = useLearning();
  const { progress, ready, error, retry } = useCourseProgress(actor.id);
  const [showAll, setShowAll] = useState(false);
  const started = course
    .filter((t) => progress[t.id]?.updatedAt)
    .sort((a, b) =>
      progress[b.id].updatedAt.localeCompare(progress[a.id].updatedAt),
    );
  const read = started.filter(
    (t) => progress[t.id].readPages.length === t.pages.length,
  ).length;
  const independent = started.reduce(
    (n, t) => n + quizStats(progress[t.id].quiz).independent,
    0,
  );
  const assisted = started.reduce(
    (n, t) => n + quizStats(progress[t.id].quiz).assisted,
    0,
  );
  const repeat = started.filter(
    (t) =>
      quizStats(progress[t.id].quiz).incorrect > 0 ||
      Object.values(progress[t.id].reviewed).includes("repeat"),
  );
  const last = started[0];
  const fraction = last
    ? progress[last.id].readPages.length / last.pages.length
    : 0;
  if (!ready)
    return (
      <Card>
        <Txt accessibilityRole={error ? "alert" : undefined}>
          {error || "Загружаем прогресс…"}
        </Txt>
      </Card>
    );
  return (
    <View style={{ gap: 20 }}>
      {!!error && (
        <Card>
          <Txt color={colors.red} accessibilityRole="alert">
            {error}
          </Txt>
          <Button secondary onPress={retry}>
            Повторить сохранение
          </Button>
        </Card>
      )}
      {last ? (
        <Card
          style={{
            backgroundColor: colors.light,
            borderWidth: 0,
            padding: 24,
            gap: 20,
          }}
        >
          <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
            <View
              accessible
              accessibilityLabel={`Прочитано ${progress[last.id].readPages.length} из ${last.pages.length} частей`}
              style={{
                width: 82,
                height: 82,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg
                width={82}
                height={82}
                style={{ position: "absolute" }}
                accessible={false}
              >
                <Circle
                  cx={41}
                  cy={41}
                  r={35}
                  fill="none"
                  stroke={colors.white}
                  strokeWidth={6}
                />
                <Circle
                  cx={41}
                  cy={41}
                  r={35}
                  fill="none"
                  stroke={colors.green}
                  strokeWidth={6}
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={2 * Math.PI * 35 * (1 - fraction)}
                  strokeLinecap="round"
                  rotation={-90}
                  origin="41, 41"
                />
              </Svg>
              <Icon
                name={fraction === 1 ? "check" : "book-open"}
                size={27}
                color={colors.green}
              />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Txt size={12} weight="600" color={colors.green}>
                ПРОДОЛЖИМ?
              </Txt>
              <Txt size={22} weight="700">
                {courseContent[last.id].pages[0].title}
              </Txt>
              <Txt size={13} color={colors.muted}>
                Прочитано {progress[last.id].readPages.length} из{" "}
                {last.pages.length} частей
              </Txt>
            </View>
          </View>
          <Button icon="arrow-right" onPress={() => openCourse(last.id)}>
            Продолжить тему
          </Button>
        </Card>
      ) : (
        <Card style={{ alignItems: "center", padding: 28 }}>
          <LearningArt kind="compass" size={130} />
          <Txt size={24} weight="700" style={{ textAlign: "center" }}>
            Всё начинается с первой темы
          </Txt>
          <Txt color={colors.muted} style={{ textAlign: "center" }}>
            Читай, пробуй и наблюдай за своим ростом.
          </Txt>
          <Button icon="arrow-right" onPress={() => openCourse(course[0].id)}>
            Начать учиться
          </Button>
        </Card>
      )}
      {!!started.length && (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              {
                count: read,
                label: "Прочитано тем",
                icon: "book-open" as const,
              },
              {
                count: independent + assisted,
                label: "Решено заданий",
                icon: "check-circle" as const,
              },
            ].map((item) => (
              <Card key={item.label} style={{ flex: 1, padding: 18, gap: 6 }}>
                <Icon name={item.icon} color={colors.green} />
                <Txt size={32} weight="700">
                  {item.count}
                </Txt>
                <Txt size={13} color={colors.muted}>
                  {item.label}
                </Txt>
              </Card>
            ))}
          </View>
          <Txt size={12} color={colors.muted}>
            {independent} самостоятельно · {assisted} с подсказками · на этом
            устройстве
          </Txt>
          <View style={{ gap: 12 }}>
            <Txt size={20} weight="700">
              Последние темы
            </Txt>
            {started.slice(0, showAll ? undefined : 3).map((topic) => {
              const count = progress[topic.id].readPages.length;
              return (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${topic.title}. Прочитано ${count} из ${topic.pages.length} частей. Открыть тему`}
                  onPress={() => openCourse(topic.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Icon
                    name={
                      count === topic.pages.length
                        ? "check-circle"
                        : "book-open"
                    }
                    color={colors.green}
                  />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Txt weight="600">
                      {courseContent[topic.id].pages[0].title}
                    </Txt>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 4,
                        backgroundColor: colors.line,
                      }}
                    >
                      <View
                        style={{
                          width: `${(100 * count) / topic.pages.length}%`,
                          height: 4,
                          borderRadius: 4,
                          backgroundColor: colors.green,
                        }}
                      />
                    </View>
                  </View>
                  <Txt size={12} color={colors.muted}>
                    {count}/{topic.pages.length}
                  </Txt>
                  <Icon name="chevron-right" size={16} />
                </Pressable>
              );
            })}
            {started.length > 3 && (
              <Button small secondary onPress={() => setShowAll(!showAll)}>
                {showAll ? "Свернуть" : `Все темы · ${started.length}`}
              </Button>
            )}
          </View>
          {!!repeat.length && (
            <Disclosure
              title={`Повторить · ${repeat.length}`}
              icon="refresh-cw"
            >
              {repeat.map((topic) => (
                <Button
                  secondary
                  key={topic.id}
                  onPress={() => openCourse(topic.id)}
                >
                  {topic.title}
                </Button>
              ))}
            </Disclosure>
          )}
        </>
      )}
    </View>
  );
}
