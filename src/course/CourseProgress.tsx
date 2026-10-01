import { useUITheme } from "../components/ui";
import React from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  colors,
  styles,
} from "../components/ui";
import { course } from "./model";
import { useCourseProgress } from "./storage";
import { quizStats } from "./quiz";

export function CourseProgress({
  openCourse,
}: {
  openCourse: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { actor } = useLearning();
  const { progress, ready, error } = useCourseProgress(actor.id);
  const started = course.filter((t) => progress[t.id]?.updatedAt);
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
  return (
    <Card>
      <View style={styles.row}>
        <Icon name="sun" color={colors.green} />
        <Txt size={22} weight="700">
          Мои занятия
        </Txt>
      </View>
      {error ? (
        <Txt color={colors.red} accessibilityRole="alert">
          {error}
        </Txt>
      ) : !ready ? (
        <Txt>Загружаем прогресс…</Txt>
      ) : (
        <>
          <View style={[styles.row, { flexWrap: "wrap", gap: 24 }]}>
            <View>
              <Txt size={32} weight="700">
                {read}
              </Txt>
              <Txt color={colors.muted}>тем прочитано</Txt>
            </View>
            <View>
              <Txt size={32} weight="700">
                {independent}
              </Txt>
              <Txt color={colors.muted}>решено самостоятельно</Txt>
            </View>
            <View>
              <Txt size={32} weight="700">
                {assisted}
              </Txt>
              <Txt color={colors.muted}>решено с подсказками</Txt>
            </View>
          </View>
          <Txt size={12} color={colors.muted}>
            Тренировочные тесты на этом устройстве
          </Txt>
          {!!repeat.length && (
            <Disclosure
              title={`Хочу повторить · ${repeat.length}`}
              icon="refresh-cw"
            >
              {repeat.map((t) => (
                <Button key={t.id} secondary onPress={() => openCourse(t.id)}>
                  {t.title}
                </Button>
              ))}
            </Disclosure>
          )}
          {!!started.length && (
            <Disclosure title="Мои темы" icon="book-open">
              {started.map((t) => (
                <View key={t.id} style={{ gap: 8 }}>
                  <Txt weight="600">{t.title}</Txt>
                  <Txt size={13} color={colors.muted}>
                    Прочитано {progress[t.id].readPages.length} из{" "}
                    {t.pages.length} частей
                  </Txt>
                  <Button small secondary onPress={() => openCourse(t.id)}>
                    Продолжить
                  </Button>
                </View>
              ))}
            </Disclosure>
          )}
          {!started.length && (
            <Button onPress={() => openCourse(course[0].id)} icon="arrow-right">
              Начать первую тему
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
