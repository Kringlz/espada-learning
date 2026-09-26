import { LessonLibrary } from "../lessons/LessonLibrary";
import { translate } from "../i18n";
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { Activity } from "../core/types";
import { uid } from "../core/ids";
import { checkQuestions } from "../core/engine";
import { topicMastery, reviewSuggestions } from "../core/reports";
import {
  Steps,
  Button,
  Card,
  Txt,
  Icon,
  Pill,
  colors,
  styles,
  Choice,
} from "../components/ui";
import { VideoLessons } from "../components/VideoLessons";
export function Lesson({
  topicId,
  back,
  openTopic,
}: {
  topicId: string;
  back: () => void;
  openTopic: (id: string) => void;
}) {
  const { state: s, actor, dispatch, saving } = useLearning();
  const t = s.topics.find((t) => t.id === topicId)!;
  const persisted = s.activities.find(
    (a) => a.studentId === actor.id && a.topicId === topicId,
  );
  const [activity, setActivity] = useState<Activity>(
    () =>
      persisted ?? {
        id: uid(),
        studentId: actor.id,
        topicId,
        stage: "lesson",
        answers: {},
        questionIds: checkQuestions(s, actor.id, t).map((q) => q.id),
        attemptId: uid(),
        videoSeconds: 0,
        updatedAt: new Date().toISOString(),
      },
  );
  const [hint, setHint] = useState(false);
  const [guided, setGuided] = useState<number | null>(null);
  const [practiceChecked, setPracticeChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!persisted)
      void dispatch({ type: "saveActivity", activity }).catch(() =>
        setError(
          "This lesson visit was not saved. You can retry by continuing to practice.",
        ),
      );
  }, []);
  useEffect(() => {
    if (persisted) setActivity(persisted);
  }, [persisted?.updatedAt, persisted?.stage]);
  const [storedLessons, setStoredLessons] = useState(false);
  const [viewLesson, setViewLesson] = useState(false);
  const stage = viewLesson ? "lesson" : activity.stage;
  const qs = activity.questionIds.map((id) =>
    t.checks.find((q) => q.id === id)!,
  );
  const submitted = s.attempts.find((a) => a.id === activity.attemptId);
  const current = topicMastery(s, actor.id, topicId);
  const next = reviewSuggestions(s, actor.id).find(
    (r) => r.topicId !== topicId,
  );
  async function save(patch: Partial<Activity>) {
    const next = { ...activity, ...patch };
    try {
      await dispatch({ type: "saveActivity", activity: next });
      setActivity(next);
      setError("");
    } catch {
      setError("Your last change was not saved. Please try again.");
    }
  }
  async function submit() {
    try {
      await dispatch({
        type: "submitAttempt",
        attempt: {
          id: activity.attemptId,
          studentId: actor.id,
          topicId,
          at: new Date().toISOString(),
          answers: qs.map((q) => ({
            questionId: q.id,
            choice: activity.answers[q.id],
            assisted: false,
          })),
        },
      });
      setActivity({ ...activity, stage: "complete" });
      setError("");
    } catch {
      setError(
        "Your check was not confirmed. Your answers are still here; retrying will not create a duplicate.",
      );
    }
  }
  if (storedLessons)
    return (
      <LessonLibrary topicId={topicId} back={() => setStoredLessons(false)} />
    );
  return (
    <View
      style={{ gap: 16, maxWidth: 900, width: "100%", alignSelf: "center" }}
    >
      <Button secondary small onPress={back} icon="arrow-left">
        Back to learning
      </Button>
      <View>
        <Pill icon={stage === "complete" ? "check-circle" : "book-open"}>
          {stage === "complete"
            ? "CHECK COMPLETE"
            : t.practice
              ? `ШАГ ${stage === "lesson" ? 1 : stage === "practice" ? 2 : 3} ИЗ 3`
              : "МАТЕРИАЛЫ ТЕМЫ"}
        </Pill>
        <Txt size={27} weight="600" style={{ marginTop: 12 }}>
          {t.title}
        </Txt>
        <Txt color={colors.muted}>{t.objective}</Txt>
      </View>
      <Button secondary icon="book-open" onPress={() => setStoredLessons(true)}>
        Уроки и тесты по этой теме
      </Button>
      {activity.stage !== "lesson" && (
        <Button secondary small onPress={() => setViewLesson(!viewLesson)}>
          {viewLesson
            ? activity.stage === "complete"
              ? "К результатам проверки"
              : "Вернуться к практике"
            : "Смотреть урок"}
        </Button>
      )}
      {t.practice && (
        <Steps
          labels={["Урок", "Практика", "Проверка"]}
          current={{ lesson: 0, practice: 1, check: 2, complete: 3 }[stage]}
        />
      )}
      {Boolean(error) && (
        <Card style={{ backgroundColor: "#FFF2EF" }}>
          <Txt color={colors.red} accessibilityRole="alert">
            {error}
          </Txt>
        </Card>
      )}
      {stage === "lesson" && (
        <>
          {!!t.lesson && (
            <Card>
              <Txt size={22} weight="600">
                Let’s make it click.
              </Txt>
              <Txt size={17}>{t.lesson}</Txt>
              <View
                style={{
                  backgroundColor: "#F3F5ED",
                  padding: 22,
                  borderRadius: 12,
                  gap: 10,
                }}
              >
                <Txt size={12} weight="700" color={colors.green}>
                  A WORKED EXAMPLE
                </Txt>
                <Txt size={19}>{t.example}</Txt>
              </View>
              {t.prerequisites.length > 0 && (
                <Txt size={13} color={colors.muted}>
                  Builds on:{" "}
                  {t.prerequisites
                    .map((id) => s.topics.find((t) => t.id === id)?.title)
                    .join(" · ")}
                </Txt>
              )}
            </Card>
          )}
          <VideoLessons topic={t} />
          {t.practice && !viewLesson && (
            <Button
              disabled={saving}
              onPress={() => void save({ stage: "practice" })}
              icon="arrow-right"
            >
              Try guided practice
            </Button>
          )}
          {!t.practice && (
            <Txt color={colors.muted}>
              Практические задания к этой теме ещё не добавлены.
            </Txt>
          )}
        </>
      )}
      {stage === "practice" && t.practice && (
        <Card>
          <Pill tone="gold">A SAFE PLACE TO TRY</Pill>
          <Txt size={22} weight="600">
            {t.practice.prompt}
          </Txt>
          {t.practice.choices.map((c, i) => (
            <Choice
              key={i}
              label={c}
              selected={guided === i}
              onPress={() => {
                setGuided(i);
                setPracticeChecked(false);
              }}
            />
          ))}
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            <Button
              disabled={guided === null}
              onPress={() => setPracticeChecked(true)}
            >
              Check my answer
            </Button>
            <Button secondary onPress={() => setHint(true)} icon="help-circle">
              Show a hint
            </Button>
          </View>
          {hint && <Txt color={colors.muted}>Hint: {t.practice.hint}</Txt>}
          {practiceChecked && (
            <View
              style={{
                gap: 12,
                backgroundColor: colors.light,
                padding: 20,
                borderRadius: 12,
              }}
            >
              <Txt weight="600">
                {guided === t.practice.answer
                  ? "That’s it. Nicely worked out."
                  : "Let’s look at the method together."}
              </Txt>
              <Txt>{t.practice.explanation}</Txt>
              <Txt size={12} color={colors.muted}>
                Практика с подсказками помогает разобраться. Состояние темы
                меняют самостоятельные проверки.
              </Txt>
              <Button
                disabled={saving}
                onPress={() => void save({ stage: "check" })}
              >
                Ready for an independent check
              </Button>
            </View>
          )}
        </Card>
      )}
      {stage === "check" && (
        <>
          <Card>
            <Txt size={20} weight="600">
              A small check, on your own.
            </Txt>
            <Txt color={colors.muted}>
              Three questions, no timer. Try these without hints so your teacher
              can see what feels clear. Your answers save after each choice.
            </Txt>
            <Txt size={12} color={colors.muted}>
              Можно повторить эти вопросы. Повтор тех же вопросов не добавляет
              подтверждений освоения.
            </Txt>
          </Card>
          {qs.map((q, i) => (
            <Card key={q.id}>
              <Txt size={12} weight="600" color={colors.muted}>
                ВОПРОС {i + 1} ИЗ {qs.length}
              </Txt>
              <Txt size={21} weight="600">
                {q.prompt}
              </Txt>
              {q.choices.map((c, j) => (
                <Choice
                  key={j}
                  label={c}
                  selected={activity.answers[q.id] === j}
                  onPress={() => {
                    if (!saving)
                      void save({
                        answers: { ...activity.answers, [q.id]: j },
                      });
                  }}
                />
              ))}
            </Card>
          ))}
          <Button
            disabled={
              saving || qs.some((q) => activity.answers[q.id] === undefined)
            }
            onPress={() => void submit()}
            icon="check"
          >
            Finish my check
          </Button>
          <Txt size={12} color={colors.muted}>
            {saving
              ? "Saving your answer…"
              : "Saved answers stay here if you leave and come back."}
          </Txt>
        </>
      )}
      {stage === "complete" && (
        <>
          <Card style={{ backgroundColor: "#EEF3E8" }}>
            <Icon name="check-circle" size={35} color={colors.green} />
            <Txt size={29} weight="600">
              One more step forward.
            </Txt>
            <Txt size={19}>
              {submitted
                ? `${submitted.answers.filter((a) => t.checks.find((q) => q.id === a.questionId)?.answer === a.choice).length} из ${submitted.answers.length} верно`
                : "Your previous check is complete."}
            </Txt>
            <Txt>{current.status}</Txt>
            <Txt size={13} color={colors.muted}>
              Ответов по теме: {current.count}. Новые самостоятельные проверки
              подтверждают состояние темы. Результаты работ учителя остаются
              отдельными.
            </Txt>
            <Txt size={13} color={colors.muted}>
              If this still feels confusing after practice, show the questions
              below to your teacher at your next session.
            </Txt>
          </Card>
          {submitted?.answers.map((a) => {
            const q = t.checks.find((q) => q.id === a.questionId)!;
            return (
              <Card key={a.questionId}>
                <Pill
                  icon={q.answer === a.choice ? "check-circle" : "rotate-ccw"}
                  tone={q.answer === a.choice ? "green" : "gold"}
                >
                  {q.answer === a.choice ? "Understood" : "Worth another look"}
                </Pill>
                <Txt weight="600">{q.prompt}</Txt>
                <Txt size={14}>
                  Your answer: {q.choices[a.choice]} · Correct answer:{" "}
                  {q.choices[q.answer]}
                </Txt>
                <Txt color={colors.muted}>{q.explanation}</Txt>
              </Card>
            );
          })}
          <Card>
            <Txt size={20} weight="600">
              Where to next?
            </Txt>
            {next ? (
              <>
                <Txt color={colors.muted}>{next.reason}</Txt>
                <Button
                  onPress={() => openTopic(next.topicId)}
                  icon="arrow-right"
                >
                  {s.topics.find((t) => t.id === next.topicId)?.title}
                </Button>
              </>
            ) : (
              <Button onPress={back}>Explore your learning</Button>
            )}
            <Button
              secondary
              disabled={saving}
              onPress={() =>
                void save({
                  stage: "lesson",
                  answers: {},
                  questionIds: checkQuestions(s, actor.id, t).map((q) => q.id),
                  attemptId: uid(),
                })
              }
            >
              Revisit this topic
            </Button>
          </Card>
        </>
      )}
    </View>
  );
}
