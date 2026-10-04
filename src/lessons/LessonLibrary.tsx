import { useRewards } from "../engagement/RewardContext";
import { Confetti } from "../components/Motion";
import { useUITheme } from "../components/ui";
import { TopicCover, topicCover } from "../components/TopicCover";
import { MathText } from "../math/MathText";
import { LessonText } from "../components/LessonText";
import { useScreenScroll } from "../components/ScreenScroll";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, View } from "react-native";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Txt,
  Pill,
  Notice,
  Disclosure,
  Field,
  styles,
  colors,
  dateText,
} from "../components/ui";
import { LessonVideo } from "../components/LessonVideo";
import { uid } from "../core/ids";
import {
  lessonService,
  lessonStorageReady,
  missingLessonStorage,
  isLessonPreview,
} from "./service";
import {
  AttemptSummary,
  LessonAttempt,
  LessonCatalog,
  PublicLesson,
} from "./types";
import { LessonAdmin } from "./LessonAdmin";
export const difficultyNames = {
  easy: "Простой",
  medium: "Средний",
  hard: "Сложный",
};
const errText = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Не удалось выполнить действие. Повторите попытку.";
export function LessonSummary({
  lesson,
}: {
  lesson: Pick<PublicLesson, "summary" | "videoUrl" | "sources" | "demo">;
}) {
  const { colors, styles } = useUITheme();
  const { award } = useRewards();
  return (
    <View style={{ gap: 12 }}>
      {lesson.demo && (
        <Notice tone="info">
          Демонстрационный урок · материал для проверки работы приложения.
        </Notice>
      )}
      <Card
        style={{
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
          padding: 22,
          gap: 26,
        }}
      >
        {lesson.summary.map((b, i) => (
          <View
            key={i}
            style={
              b.kind === "example"
                ? {
                    padding: 20,
                    backgroundColor: colors.light,
                    borderRadius: 18,
                    gap: 12,
                  }
                : { gap: 10 }
            }
          >
            {b.kind === "example" && (
              <Txt size={13} weight="700" color="#826018">
                Разберём пример
              </Txt>
            )}
            {b.kind === "heading" ? (
              <Txt accessibilityRole="header" size={25} weight="700">
                {b.text}
              </Txt>
            ) : b.kind === "list" ? (
              <LessonText
                text={b.text
                  .split("\n")
                  .map((line) =>
                    /^\s*(?:[•*-]|\d+[.)])\s/.test(line) || !line.trim()
                      ? line
                      : `• ${line}`,
                  )
                  .join("\n")}
              />
            ) : (
              <LessonText text={b.text} />
            )}
          </View>
        ))}
      </Card>
      {lesson.videoUrl && (
        <Disclosure title="Видеоурок" icon="video" initiallyOpen>
          {lesson.videoUrl ? (
            /\.(mp4|webm|m3u8)(\?|$)/i.test(lesson.videoUrl) ? (
              <LessonVideo
                key={lesson.videoUrl}
                video={{
                  url: lesson.videoUrl,
                  attribution: "",
                  captioned: false,
                }}
                seconds={0}
                onSave={() => {}}
                onWatched={() =>
                  award([{ kind: "video", id: `source:${lesson.videoUrl}` }])
                }
              />
            ) : (
              <Button
                icon="external-link"
                onPress={() => void Linking.openURL(lesson.videoUrl!)}
              >
                Открыть видеоурок
              </Button>
            )
          ) : (
            <Txt color={colors.muted}>Видеоурок скоро появится.</Txt>
          )}
        </Disclosure>
      )}
      <Disclosure title="Источники" icon="book">
        {lesson.sources.length ? (
          lesson.sources.map((s, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Txt size={13}>{s.title}</Txt>
              {!!s.url && (
                <Button
                  small
                  secondary
                  icon="external-link"
                  onPress={() => void Linking.openURL(s.url!)}
                >
                  Открыть источник
                </Button>
              )}
            </View>
          ))
        ) : (
          <Txt color={colors.muted}>Источники пока не добавлены.</Txt>
        )}
      </Disclosure>
    </View>
  );
}
export function LessonLibrary({
  topicId,
  back,
  initialAttemptId,
}: {
  initialAttemptId?: string;
  topicId?: string;
  back?: () => void;
}) {
  const { colors, styles } = useUITheme();
  const { actor } = useLearning();
  const api = useMemo(() => lessonService(actor.id), [actor.id]);
  const [catalog, setCatalog] = useState<LessonCatalog | null>(null),
    [history, setHistory] = useState<AttemptSummary[]>([]),
    [lesson, setLesson] = useState<PublicLesson | null>(null),
    [attempt, setAttempt] = useState<LessonAttempt | null>(null);
  const [admin, setAdmin] = useState<{ id: string | null } | null>(null),
    [importing, setImporting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  useScreenScroll(
    `${lesson?.id ?? "catalog"}:${attempt?.id ?? ""}:${admin?.id ?? ""}:${importing}`,
  );
  const startKey = useRef(uid());
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    const [c, h] = await Promise.all([
      api.catalog(),
      actor.role === "student" ? api.history(null) : Promise.resolve([]),
    ]);
    setCatalog(c);
    setLesson((previous) =>
      previous ? (c.lessons.find((l) => l.id === previous.id) ?? null) : null,
    );
    setHistory(h);
  }
  useEffect(() => {
    if (lessonStorageReady)
      void run(async () => {
        await load();
        if (initialAttemptId) setAttempt(await api.attempt(initialAttemptId));
      });
  }, [api]);
  async function open(id: string) {
    await run(async () => {
      setLesson(await api.read(id));
      startKey.current = uid();
    });
  }
  async function start(id: string) {
    await run(async () => {
      const a = await api.start(id, startKey.current);
      setAttempt(a);
      await load();
    });
  }
  function leaveAttempt() {
    setAttempt(null);
    startKey.current = uid();
    void run(load);
  }
  if (!lessonStorageReady)
    return (
      <View style={{ gap: 12 }}>
        {back && (
          <Button secondary icon="arrow-left" onPress={back}>
            Назад к теме
          </Button>
        )}
        <Card>
          <Txt size={22} weight="700">
            Уроки и тесты
          </Txt>
          <Notice tone="info">{missingLessonStorage}</Notice>
          <Txt size={13} color={colors.muted}>
            Существующие материалы доступны в дереве тем. Для новых тестов
            необходимо подключение к общей базе.
          </Txt>
        </Card>
      </View>
    );
  if (admin || importing)
    return (
      <LessonAdmin
        lessonId={admin?.id ?? null}
        importOnly={importing}
        close={() => {
          setAdmin(null);
          setImporting(false);
          void run(load);
        }}
      />
    );
  if (attempt)
    return (
      <TestAttempt
        key={attempt.id}
        initial={attempt}
        back={initialAttemptId && back ? back : leaveAttempt}
        backLabel={initialAttemptId ? "К прогрессу" : "К урокам"}
        retry={() => {
          const id = attempt.lessonId;
          startKey.current = uid();
          void start(id);
        }}
        retryBusy={busy}
        retryError={error}
      />
    );
  return (
    <View style={{ gap: 14 }}>
      {isLessonPreview && (
        <Notice tone="info">
          Локальный предпросмотр · уроки и попытки сохраняются в PostgreSQL.
          Вход использует тестовые аккаунты.
        </Notice>
      )}
      {(lesson || back) && (
        <Button
          secondary
          small
          icon="arrow-left"
          onPress={lesson ? () => setLesson(null) : back!}
        >
          {lesson
            ? "К списку уроков"
            : initialAttemptId
              ? "К прогрессу"
              : "Назад к теме"}
        </Button>
      )}
      {!!error && <Notice tone="error">{error}</Notice>}
      {busy && (
        <Txt accessibilityLiveRegion="polite" color={colors.muted}>
          Загрузка…
        </Txt>
      )}
      {lesson ? (
        <>
          <View style={styles.row}>
            <Pill
              tone={lesson.status === "published" ? "green" : "gold"}
              icon={lesson.status === "published" ? "check" : "edit"}
            >
              {lesson.status === "published" ? "Опубликован" : "Черновик"}
            </Pill>
          </View>
          <TopicCover title={lesson.title} eyebrow="МАТЕМАТИКА · УРОК" />
          <LessonSummary lesson={lesson} />
          {actor.role === "admin" && (
            <Button icon="edit-2" onPress={() => setAdmin({ id: lesson.id })}>
              Редактировать урок и вопросы
            </Button>
          )}
          <Card>
            <Txt size={19} weight="700">
              Проверка знаний
            </Txt>
            <Txt>
              10 вопросов: 4 простых, 4 средних, 2 сложных. Каждый ответ — 1
              балл.
            </Txt>
            <Txt>
              Для нескольких ответов нужно выбрать все верные варианты и ни
              одного лишнего. Частичных баллов нет.
            </Txt>
            <Pill icon="flag">
              Проходной балл: {lesson.test.passScore} из 10
            </Pill>
            {lesson.demo && (
              <Txt size={13} color={colors.muted}>
                Исходный демонстрационный порог — 7/10; для этого урока
                действует значение выше. Окончательный порог будет согласован
                отдельно.
              </Txt>
            )}
            {!lesson.testReady && (
              <Notice tone="error">
                Тест не готов. Нужно минимум 4 простых, 4 средних и 2 сложных
                вопроса. Сейчас: {lesson.questionCounts.easy} /{" "}
                {lesson.questionCounts.medium} / {lesson.questionCounts.hard}.
              </Notice>
            )}
            {actor.role === "student" ? (
              <Button
                icon="play"
                disabled={busy || !lesson.testReady}
                onPress={() => void start(lesson.id)}
              >
                {history.some(
                  (a) => a.lessonId === lesson.id && a.status === "in_progress",
                )
                  ? "Продолжить тест"
                  : "Начать тест"}
              </Button>
            ) : (
              <Txt size={13} color={colors.muted}>
                Проходить тесты можно из аккаунта ученика. Администратору
                доступен просмотр вопросов в редакторе.
              </Txt>
            )}
          </Card>
        </>
      ) : (
        <>
          <Txt size={24} weight="700">
            Уроки и тесты
          </Txt>
          {actor.role === "admin" && (
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Button icon="plus" onPress={() => setAdmin({ id: null })}>
                Создать урок
              </Button>
              <Button
                secondary
                icon="upload"
                onPress={() => setImporting(true)}
              >
                Импорт JSON
              </Button>
            </View>
          )}
          <Field label="Найти урок" value={search} onChangeText={setSearch} />
          {catalog?.courses.map((c) => {
            const sections = catalog.sections
              .filter((s) => s.courseId === c.id)
              .map((s) => ({
                ...s,
                lessons: catalog.lessons.filter(
                  (l) =>
                    l.sectionId === s.id &&
                    (!topicId || l.topicId === topicId) &&
                    l.title
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                ),
              }))
              .filter((s) => s.lessons.length);
            return sections.length ? (
              <View key={c.id} style={{ gap: 10 }}>
                <Txt weight="700" size={19}>
                  {c.title}
                </Txt>
                {sections.map((s) => (
                  <View key={s.id} style={{ gap: 8 }}>
                    <Txt size={13} color={colors.muted}>
                      {s.title}
                    </Txt>
                    {s.lessons.map((l) => {
                      const attempts = history.filter(
                          (a) => a.lessonId === l.id,
                        ),
                        unfinished = attempts.find(
                          (a) => a.status === "in_progress",
                        ),
                        last = attempts.find((a) => a.status === "submitted");
                      return (
                        <Card key={l.id}>
                          <Image
                            source={topicCover(l.title).image}
                            accessible={false}
                            resizeMode="cover"
                            style={{
                              width: "100%",
                              height: 150,
                              borderRadius: 16,
                            }}
                          />
                          <View style={[styles.row, { flexWrap: "wrap" }]}>
                            <Txt
                              style={{ flex: 1, minWidth: 160 }}
                              weight="700"
                            >
                              {l.order}. {l.title}
                            </Txt>
                            {l.demo && <Pill tone="gold">Демо</Pill>}
                            {l.status === "draft" && (
                              <Pill tone="neutral" icon="edit">
                                Черновик
                              </Pill>
                            )}
                          </View>
                          <Txt size={13} color={colors.muted}>
                            {unfinished
                              ? "Есть незавершённая попытка"
                              : last
                                ? `Последний результат: ${last.score}/10`
                                : "Конспект · видео · тест"}
                          </Txt>
                          <Button
                            secondary
                            small
                            icon={unfinished ? "play" : "book-open"}
                            disabled={busy}
                            onPress={() => void open(l.id)}
                          >
                            Открыть урок
                          </Button>
                        </Card>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : null;
          })}
          {catalog &&
            !catalog.lessons.some(
              (l) =>
                (!topicId || l.topicId === topicId) &&
                l.title
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
            ) && (
              <Card>
                <Txt>Уроков пока нет{search ? " по этому запросу" : ""}.</Txt>
                <Txt color={colors.muted}>
                  Они появятся после публикации администратором.
                </Txt>
              </Card>
            )}
          <Button
            secondary
            small
            icon="refresh-cw"
            disabled={busy}
            onPress={() => void run(load)}
          >
            Обновить список
          </Button>
        </>
      )}
      {actor.role === "student" && (
        <Disclosure title="Мои попытки" icon="clock" initiallyOpen>
          {history.filter((a) => !lesson || a.lessonId === lesson.id).length ===
          0 ? (
            <Txt color={colors.muted}>
              Попыток пока нет. Начните тест в уроке.
            </Txt>
          ) : (
            history
              .filter((a) => !lesson || a.lessonId === lesson.id)
              .map((a) => (
                <View
                  key={a.id}
                  style={{
                    gap: 6,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Txt weight="600">{a.lesson.title}</Txt>
                  <Txt size={13}>
                    {dateText(a.startedAt)} ·{" "}
                    {a.status === "in_progress"
                      ? "Не завершён"
                      : `${a.score}/10 · ${a.score! >= a.passScore ? "Пройден" : "Нужно повторить"}`}
                  </Txt>
                  <Button
                    secondary
                    small
                    icon={a.status === "in_progress" ? "play" : "check-circle"}
                    disabled={busy}
                    onPress={() =>
                      void run(async () => setAttempt(await api.attempt(a.id)))
                    }
                  >
                    {a.status === "in_progress"
                      ? "Продолжить попытку"
                      : "Посмотреть результат"}
                  </Button>
                </View>
              ))
          )}
        </Disclosure>
      )}
    </View>
  );
}
function TestAttempt({
  initial,
  back,
  backLabel = "К урокам",
  retry,
  retryBusy,
  retryError,
}: {
  initial: LessonAttempt;
  back: () => void;
  backLabel?: string;
  retry: () => void;
  retryBusy: boolean;
  retryError: string;
}) {
  const { colors, styles } = useUITheme();
  const { actor } = useLearning();
  const api = useMemo(() => lessonService(actor.id), [actor.id]);
  const { award } = useRewards();
  const [burst, setBurst] = useState(0);
  const [attempt, setAttempt] = useState(initial),
    [answers, setAnswers] = useState(initial.answers),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const q = attempt.questions[index],
    complete = attempt.status === "submitted",
    answered = answers.filter((a) => a.optionIds.length).length;
  useScreenScroll(`${attempt.id}:${attempt.status}:${index}`);
  async function save(next: LessonAttempt["answers"]) {
    setBusy(true);
    setError("");
    setAnswers(next);
    setDirty(true);
    try {
      const a = await api.save(attempt, next);
      setAttempt(a);
      setAnswers(a.answers);
      setDirty(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }
  function choose(id: string) {
    const old = answers.find((a) => a.ordinal === q.ordinal)?.optionIds ?? [];
    const optionIds =
      q.type === "single"
        ? [id]
        : old.includes(id)
          ? old.filter((x) => x !== id)
          : [...old, id];
    void save([
      ...answers.filter((a) => a.ordinal !== q.ordinal),
      { ordinal: q.ordinal, optionIds },
    ]);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const a = await api.submit(attempt);
      if (a.status === "submitted")
        award(
          a.questions
            .filter((q) => {
              const picked =
                a.answers.find((answer) => answer.ordinal === q.ordinal)
                  ?.optionIds ?? [];
              return (
                !!q.correctOptionIds?.length &&
                picked.length === q.correctOptionIds.length &&
                picked.every((id) => q.correctOptionIds!.includes(id))
              );
            })
            .map((q) => ({
              kind: "question" as const,
              id: `lesson:${a.lessonId}:${a.lesson.revision}:${q.id}`,
            })),
        );
      if (
        a.status === "submitted" &&
        a.score !== null &&
        a.score >= a.passScore
      )
        setBurst((value) => value + 1);
      setAttempt(a);
      setAnswers(a.answers);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      <Confetti burst={burst} />
      <Button
        secondary
        small
        icon="arrow-left"
        disabled={busy || dirty}
        onPress={back}
      >
        {backLabel}
      </Button>
      <Txt size={24} weight="700">
        {attempt.lesson.title}
      </Txt>
      {attempt.lesson.demo && <Pill tone="gold">Демонстрационный тест</Pill>}
      {!!(error || retryError) && (
        <Notice tone="error">{error || retryError}</Notice>
      )}
      {complete ? (
        <>
          <Card style={{ backgroundColor: colors.light, padding: 24 }}>
            <Txt size={27} weight="700">
              Проверка завершена!
            </Txt>
            <Pill
              icon={
                attempt.score! >= attempt.passScore
                  ? "check-circle"
                  : "rotate-ccw"
              }
              tone={attempt.score! >= attempt.passScore ? "green" : "gold"}
            >
              {attempt.score! >= attempt.passScore
                ? "Тест пройден"
                : "Попробуйте ещё раз"}
            </Pill>
            <Txt size={34} weight="700">
              {attempt.score} / 10
            </Txt>
            <Txt>
              Проходной балл: {attempt.passScore}. Завершено:{" "}
              {dateText(attempt.submittedAt!)}.
            </Txt>
            <Txt size={13} color={colors.muted}>
              Результат сохранён. Ниже можно разобрать каждый ответ.
            </Txt>
            <Button icon="rotate-ccw" disabled={retryBusy} onPress={retry}>
              {retryBusy ? "Подготовка…" : "Пройти ещё раз"}
            </Button>
          </Card>
          {attempt.questions.map((item) => {
            const picked =
                answers.find((a) => a.ordinal === item.ordinal)?.optionIds ??
                [],
              correct = item.correctOptionIds ?? [],
              ok =
                picked.length === correct.length &&
                picked.every((x) => correct.includes(x));
            const labels = (ids: string[]) =>
              ids
                .map((id) => item.options.find((o) => o.id === id)?.text ?? id)
                .join("; ");
            return (
              <Card key={item.ordinal}>
                <View style={styles.row}>
                  <Pill
                    icon={ok ? "check-circle" : "x-circle"}
                    tone={ok ? "green" : "gold"}
                  >
                    {ok ? "1 балл" : "0 баллов"}
                  </Pill>
                  <Txt size={13}>{difficultyNames[item.difficulty]}</Txt>
                </View>
                <MathText text={`${item.ordinal}. ${item.prompt}`} bold />
                <MathText
                  text={`Ваш ответ: ${labels(picked) || "Нет ответа"}`}
                />
                <MathText text={`Правильный ответ: ${labels(correct)}`} bold />
                <MathText text={item.explanation ?? ""} color={colors.muted} />
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <Card>
            <View style={styles.row}>
              <Pill icon="edit-3">Вопрос {index + 1} из 10</Pill>
              <Txt size={13}>Ответов: {answered}/10</Txt>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.line,
              }}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${answered * 10}%`,
                  backgroundColor: colors.green,
                }}
              />
            </View>
            <Txt
              size={13}
              accessibilityLiveRegion="polite"
              color={dirty ? colors.orange : colors.muted}
            >
              {busy
                ? "Сохраняем ответ…"
                : dirty
                  ? "Ответ не сохранён. Повторите сохранение."
                  : "Сохранено в базе. Можно вернуться позже."}
            </Txt>
          </Card>
          <View style={[styles.row, { flexWrap: "wrap", gap: 6 }]}>
            {attempt.questions.map((item, n) => (
              <Button
                key={n}
                small
                secondary
                selected={index === n}
                disabled={busy || dirty}
                label={`Вопрос ${n + 1}${answers.some((a) => a.ordinal === item.ordinal && a.optionIds.length) ? ", ответ сохранён" : ""}`}
                icon={
                  answers.some(
                    (a) => a.ordinal === item.ordinal && a.optionIds.length,
                  )
                    ? "check"
                    : undefined
                }
                onPress={() => setIndex(n)}
              >
                {n + 1}
              </Button>
            ))}
          </View>
          <Card>
            <Pill tone="neutral">{difficultyNames[q.difficulty]}</Pill>
            <MathText text={q.prompt} size={20} bold />
            <Txt size={13} color={colors.muted}>
              {q.type === "single"
                ? "Выберите один ответ."
                : "Выберите все верные ответы. Балл начисляется только за точное совпадение всего набора."}
            </Txt>
            {q.options.map((o) => {
              const selected = answers
                .find((a) => a.ordinal === q.ordinal)
                ?.optionIds.includes(o.id);
              return (
                <Button
                  key={o.id}
                  math
                  secondary
                  selected={!!selected}
                  icon={selected ? "check-circle" : "circle"}
                  disabled={busy || dirty}
                  onPress={() => choose(o.id)}
                >
                  {o.text}
                </Button>
              );
            })}
          </Card>
          {dirty && !busy && (
            <Button icon="save" onPress={() => void save(answers)}>
              Повторить сохранение
            </Button>
          )}
          {!!error && !busy && (
            <Button
              secondary
              icon="refresh-cw"
              onPress={() => {
                setBusy(true);
                void api
                  .attempt(attempt.id)
                  .then((a) => {
                    setAttempt(a);
                    setAnswers(a.answers);
                    setDirty(false);
                    setError("");
                  })
                  .catch((e) => setError(errText(e)))
                  .finally(() => setBusy(false));
              }}
            >
              Восстановить сохранённую попытку
            </Button>
          )}
          <View style={styles.row}>
            <Button
              secondary
              icon="arrow-left"
              disabled={index === 0 || busy || dirty}
              onPress={() => setIndex(index - 1)}
            >
              Назад
            </Button>
            {index < 9 ? (
              <Button
                icon="arrow-right"
                disabled={busy || dirty}
                onPress={() => setIndex(index + 1)}
              >
                Далее
              </Button>
            ) : (
              <Button
                icon="check"
                disabled={answered !== 10 || busy || dirty}
                onPress={() => void submit()}
              >
                Сдать тест
              </Button>
            )}
          </View>
          <Txt size={13} color={colors.muted}>
            4 простых · 4 средних · 2 сложных. За каждый верный ответ — 1 балл.
            Для сдачи ответьте на все 10 вопросов.
          </Txt>
        </>
      )}
    </View>
  );
}
