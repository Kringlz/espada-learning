import React, { useState } from "react";
import { Pressable, View } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Field,
  Icon,
  Pill,
  Txt,
  useUITheme,
} from "../components/ui";
import { useScreenScroll } from "../components/ScreenScroll";
import { MathText } from "../math/MathText";
import { CourseContent } from "./CourseContent";
import { courseContent } from "./content";
import { CourseTopic, emptyProgress } from "./model";
import { splitPractice } from "./practice";
import {
  applyQuizAction,
  emptyAttempt,
  QuizAction,
  quizQuestion,
  quizStats,
} from "./quiz";
import { useCourseProgress } from "./storage";

export function CoursePractice({
  topic,
  storage,
  next,
  back,
}: {
  topic: CourseTopic;
  storage: ReturnType<typeof useCourseProgress>;
  next?: () => void;
  back: () => void;
}) {
  const { colors, styles } = useUITheme();
  const p = storage.progress[topic.id] ?? emptyProgress();
  const content = courseContent[topic.id].practice;
  const questions = splitPractice(content.questions).items;
  const answers = splitPractice(content.answers).items;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      questions.findIndex((q) => !p.quiz[q.number]?.submitted),
    ),
  );
  const [summary, setSummary] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const question = questions[index];
  const quiz = quizQuestion(topic.id, question.number);
  const attempt = p.quiz[question.number] ?? emptyAttempt();
  const stats = quizStats(p.quiz);
  const correct = attempt.selected === 0;
  useScreenScroll(`${topic.id}:test:${index}:${summary}`);
  function act(action: QuizAction) {
    storage.update(topic.id, (current) => ({
      quiz: {
        ...current.quiz,
        [question.number]: applyQuizAction(
          current.quiz[question.number],
          action,
          quiz.hints.length,
        ),
      },
    }));
  }
  function turn(n: number) {
    setIndex(n);
    setSummary(false);
    setConfirmRestart(false);
  }
  if (!storage.ready)
    return (
      <Card>
        <Txt>Загружаем тест…</Txt>
      </Card>
    );
  if (summary)
    return (
      <Card style={{ gap: 22 }}>
        <Icon
          name={stats.incorrect ? "book-open" : "check-circle"}
          size={36}
          color={colors.green}
        />
        <Txt size={28} weight="700">
          {stats.answered === questions.length
            ? "Тест пройден"
            : "Твой результат сейчас"}
        </Txt>
        <Txt size={20}>
          Верно {stats.independent + stats.assisted} из {stats.answered}{" "}
          проверенных
        </Txt>
        <View style={[styles.row, { flexWrap: "wrap", gap: 20 }]}>
          {[
            [stats.independent, "Самостоятельно"],
            [stats.assisted, "С подсказками"],
            [stats.incorrect, "Есть ошибки"],
          ].map(([count, label]) => (
            <View key={label} style={{ gap: 4 }}>
              <Txt size={30} weight="700">
                {count}
              </Txt>
              <Txt size={13} color={colors.muted}>
                {label}
              </Txt>
            </View>
          ))}
        </View>
        <Txt size={13} color={colors.muted}>
          Результат этой попытки сохранён на устройстве. Это тренировочный тест.
        </Txt>
        {stats.answered < questions.length && (
          <Button
            onPress={() =>
              turn(questions.findIndex((q) => !p.quiz[q.number]?.submitted))
            }
          >
            Продолжить · осталось {questions.length - stats.answered}
          </Button>
        )}
        {stats.incorrect > 0 && (
          <Button
            secondary
            icon="book-open"
            onPress={() =>
              turn(
                questions.findIndex(
                  (q) =>
                    p.quiz[q.number]?.submitted &&
                    p.quiz[q.number]?.selected !== 0,
                ),
              )
            }
          >
            Посмотреть ошибки
          </Button>
        )}
        <Disclosure title="Все задания" icon="list">
          {questions.map((q, i) => {
            const a = p.quiz[q.number];
            return (
              <Button small secondary key={q.number} onPress={() => turn(i)}>
                Задание {q.number} ·{" "}
                {!a?.submitted
                  ? "Не проверено"
                  : a.selected !== 0
                    ? "Ошибка"
                    : a.hintsShown
                      ? "С подсказками"
                      : "Самостоятельно"}
              </Button>
            );
          })}
        </Disclosure>
        {confirmRestart ? (
          <View style={{ gap: 10 }}>
            <Txt>
              Начать новую попытку? Ответы и подсказки этого теста будут
              сброшены.
            </Txt>
            <Button
              onPress={() => {
                storage.update(topic.id, { quiz: {} });
                turn(0);
              }}
            >
              Начать новую попытку
            </Button>
            <Button secondary onPress={() => setConfirmRestart(false)}>
              Отмена
            </Button>
          </View>
        ) : (
          <Button
            secondary
            icon="refresh-cw"
            onPress={() => setConfirmRestart(true)}
          >
            Пройти ещё раз
          </Button>
        )}
        {next && (
          <Button secondary icon="arrow-right" onPress={next}>
            К следующей теме
          </Button>
        )}
        <Button secondary onPress={back}>
          Вернуться к объяснению
        </Button>
      </Card>
    );
  return (
    <View style={{ gap: 18 }}>
      <Card style={{ gap: 20 }}>
        <View
          style={[
            styles.row,
            { justifyContent: "space-between", flexWrap: "wrap" },
          ]}
        >
          <Pill icon="check-square">
            Задание {index + 1} из {questions.length}
          </Pill>
          <Txt size={12} color={colors.muted}>
            Проверено {stats.answered}/{questions.length}
          </Txt>
        </View>
        <View
          style={{ height: 5, backgroundColor: colors.light, borderRadius: 4 }}
        >
          <View
            style={{
              width: `${(100 * stats.answered) / questions.length}%`,
              height: 5,
              borderRadius: 4,
              backgroundColor: colors.green,
            }}
          />
        </View>
        <CourseContent blocks={question.blocks} />
        <Txt size={13} color={colors.muted}>
          Выбери один верный ответ или ход решения.
        </Txt>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {quiz.choices.map((choice, position) => {
            const selected = attempt.selected === choice.id;
            const isCorrect = attempt.submitted && choice.id === 0;
            const isWrong = attempt.submitted && selected && !correct;
            const accent = isWrong ? colors.red : colors.green;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityLabel={`Вариант ${position + 1}: ${choice.text}`}
                accessibilityState={{
                  checked: selected,
                  disabled: attempt.submitted,
                }}
                disabled={attempt.submitted}
                onPress={() => act({ type: "select", choice: choice.id })}
                style={({ pressed }) => ({
                  borderWidth: 2,
                  borderColor: selected || isCorrect ? accent : colors.line,
                  backgroundColor:
                    selected || isCorrect ? colors.light : colors.white,
                  borderRadius: 18,
                  padding: 16,
                  gap: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      selected || isCorrect ? accent : colors.light,
                  }}
                >
                  {isCorrect || isWrong ? (
                    <Icon
                      name={isCorrect ? "check" : "x"}
                      size={17}
                      color={colors.onPrimary}
                    />
                  ) : (
                    <Txt
                      size={13}
                      weight="700"
                      color={selected ? colors.onPrimary : colors.muted}
                    >
                      {["А", "Б", "В"][position]}
                    </Txt>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <MathText text={choice.text} size={17} />
                </View>
              </Pressable>
            );
          })}
        </View>
        {quiz.hints.slice(0, attempt.hintsShown).map((hint, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.light,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Txt weight="600" size={13} color={colors.green}>
              Подсказка {i + 1} ·{" "}
              {i === 0 ? "Вспомни правило" : "Следующий шаг"}
            </Txt>
            <MathText text={hint} size={16} />
          </View>
        ))}
        {!attempt.submitted ? (
          <View style={{ gap: 12 }}>
            <Button
              icon="check"
              disabled={attempt.selected === null}
              onPress={() => act({ type: "submit" })}
            >
              Проверить ответ
            </Button>
            <Button
              secondary
              icon="help-circle"
              disabled={attempt.hintsShown === quiz.hints.length}
              onPress={() => act({ type: "hint" })}
            >
              {attempt.hintsShown === 0
                ? "Подсказка"
                : attempt.hintsShown < quiz.hints.length
                  ? "Ещё подсказка"
                  : "Все подсказки открыты"}
              {` · ${attempt.hintsShown}/${quiz.hints.length}`}
            </Button>
          </View>
        ) : (
          <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
            <Txt
              size={20}
              weight="700"
              color={correct ? colors.green : colors.red}
            >
              {correct
                ? attempt.hintsShown
                  ? "Верно, с подсказкой"
                  : "Верно! Самостоятельно"
                : "Пока неверно — давай разберём"}
            </Txt>
            {!correct && (
              <Txt size={13} color={colors.muted}>
                Правильный вариант отмечен галочкой.
              </Txt>
            )}
            <Disclosure
              key={`${question.number}-solution`}
              title="Ответ и разбор"
              icon="book-open"
            >
              <CourseContent
                blocks={
                  answers.find((a) => a.number === question.number)?.blocks ??
                  []
                }
              />
            </Disclosure>
          </View>
        )}
        <Disclosure title="Мои записи" icon="edit-3">
          <Field
            label="Записи к этой теме"
            placeholder="Моё решение…"
            value={p.notes}
            onChangeText={(notes) => storage.update(topic.id, { notes })}
            multiline
            maxLength={12000}
          />
        </Disclosure>
      </Card>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <Button
          secondary
          disabled={index === 0}
          onPress={() => turn(index - 1)}
        >
          Назад
        </Button>
        <Button
          icon="arrow-right"
          disabled={!attempt.submitted}
          onPress={() =>
            index + 1 === questions.length ? setSummary(true) : turn(index + 1)
          }
        >
          {index + 1 === questions.length ? "Подвести итог" : "Дальше"}
        </Button>
      </View>
      <Disclosure
        key={`${index}-jump`}
        title="Все задания и результат"
        icon="list"
      >
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {questions.map((q, i) => (
            <Button
              key={q.number}
              small
              secondary
              selected={index === i}
              label={`Перейти к заданию ${q.number}`}
              onPress={() => turn(i)}
            >
              {q.number}
              {p.quiz[q.number]?.submitted
                ? p.quiz[q.number].selected === 0
                  ? " ✓"
                  : " ·"
                : ""}
            </Button>
          ))}
        </View>
        <Button secondary onPress={() => setSummary(true)}>
          Посмотреть результат
        </Button>
      </Disclosure>
    </View>
  );
}
