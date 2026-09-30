import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { readImportFile } from "./importFile";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Txt,
  Pill,
  Field,
  Notice,
  Disclosure,
  styles,
  colors,
} from "../components/ui";
import { uid } from "../core/ids";
import { lessonService } from "./service";
import {
  ImportPreview,
  LessonPackage,
  LessonContent,
  LessonQuestion,
  SummaryBlock,
} from "./types";
import { parseLessonPackage } from "./validation";
import { LessonSummary, difficultyNames } from "./LessonLibrary";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Не удалось сохранить. Повторите попытку.";
export function LessonAdmin({
  lessonId,
  importOnly,
  close,
}: {
  lessonId: string | null;
  importOnly: boolean;
  close: () => void;
}) {
  const { actor, state } = useLearning(),
    api = useMemo(() => lessonService(actor.id), [actor.id]);
  const [pkg, setPkg] = useState<LessonPackage | null>(null),
    [json, setJson] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [previewLesson, setPreviewLesson] = useState(false),
    [questionIndex, setQuestionIndex] = useState<number | null>(null),
    [topicSearch, setTopicSearch] = useState("");
  const receipt = useRef(uid()),
    validated = useRef<LessonPackage | null>(null);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (actor.role !== "admin" || importOnly) return;
    void run(async () => {
      const data = await api.export(lessonId);
      if (!lessonId) {
        const course = data.courses[0] ?? {
          id: `course-${uid()}`,
          title: "Математика",
          order: 1,
        };
        const section = data.sections.find((s) => s.courseId === course.id) ?? {
          id: `section-${uid()}`,
          courseId: course.id,
          title: "Новый раздел",
          order: 1,
        };
        data.courses = [course];
        data.sections = [section];
        data.lessons = [
          {
            id: `lesson-${uid()}`,
            sectionId: section.id,
            topicId: state.topics[0].id,
            title: "Новый урок",
            order: 1,
            summary: [{ kind: "paragraph", text: "Краткий конспект урока." }],
            videoUrl: null,
            sources: [],
            demo: false,
            status: "draft",
            test: { passScore: 7 },
            questions: [],
          },
        ];
      }
      setPkg(data);
    });
  }, [api, lessonId, importOnly]);
  if (actor.role !== "admin")
    return (
      <Notice tone="error">
        Управление уроками доступно только администратору.
      </Notice>
    );
  function invalidate() {
    setPreview(null);
    validated.current = null;
    receipt.current = uid();
    setMessage("");
  }
  const lesson = pkg?.lessons[0];
  function change(patch: Partial<LessonContent>) {
    if (busy || !pkg || !lesson) return;
    invalidate();
    setPkg({ ...pkg, lessons: [{ ...lesson, ...patch }] });
  }
  function question(patch: Partial<LessonQuestion>) {
    if (questionIndex === null || !lesson) return;
    change({
      questions: lesson.questions.map((q, i) =>
        i === questionIndex ? { ...q, ...patch } : q,
      ),
    });
  }
  async function validate() {
    await run(async () => {
      const data = parseLessonPackage(importOnly ? json : JSON.stringify(pkg));
      const result = await api.import(data, true);
      validated.current = data;
      receipt.current = uid();
      setPreview(result);
    });
  }
  async function save() {
    if (!validated.current) return;
    await run(async () => {
      await api.import(validated.current!, false, receipt.current);
      setMessage(
        "Сохранено в базе. Повторный импорт с теми же id обновит эти материалы.",
      );
      setPreview(null);
      validated.current = null;
    });
  }
  const q = questionIndex === null ? null : lesson?.questions[questionIndex];
  return (
    <View style={{ gap: 14 }}>
      <Button secondary icon="arrow-left" disabled={busy} onPress={close}>
        К урокам
      </Button>
      <Txt size={24} weight="700">
        {importOnly
          ? "Импорт уроков"
          : lessonId
            ? "Редактор урока"
            : "Новый урок"}
      </Txt>
      {!!error && <Notice tone="error">{error}</Notice>}
      {!!message && <Notice tone="success">{message}</Notice>}
      {busy && <Txt color={colors.muted}>Проверяем и сохраняем…</Txt>}
      {importOnly ? (
        <Card>
          <Txt>
            Загрузите JSON версии 1 или вставьте его текст. Сначала проверьте
            пакет, затем подтвердите сохранение.
          </Txt>
          <Txt size={13} color={colors.muted}>
            Образец: content/demo-lessons.json в репозитории. Инструкция:
            docs/LESSONS.md. Пропущенные уроки и вопросы не удаляются.
          </Txt>
          <Button
            secondary
            icon="upload"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ["application/json", "text/plain"],
                  copyToCacheDirectory: true,
                });
                if (result.canceled) return;
                const asset = result.assets[0];
                if ((asset.size ?? 0) > 2000000)
                  throw Error("Разделите пакет на файлы до 2 МБ.");
                const content = await readImportFile(asset);
                invalidate();
                setJson(content);
              })
            }
          >
            Выбрать JSON-файл
          </Button>
          <Field
            label="JSON-пакет"
            multiline
            value={json}
            editable={!busy}
            onChangeText={(v) => {
              invalidate();
              setJson(v);
            }}
          />
        </Card>
      ) : lesson && pkg ? (
        <>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            <Button
              small
              secondary
              selected={!previewLesson}
              icon="edit-2"
              onPress={() => setPreviewLesson(false)}
            >
              Редактирование
            </Button>
            <Button
              small
              secondary
              selected={previewLesson}
              icon="eye"
              onPress={() => setPreviewLesson(true)}
            >
              Предпросмотр
            </Button>
            <Pill tone={lesson.status === "published" ? "green" : "gold"}>
              {lesson.status === "published" ? "Опубликован" : "Черновик"}
            </Pill>
          </View>
          {previewLesson ? (
            <>
              <Txt size={22} weight="700">
                {lesson.title}
              </Txt>
              <LessonSummary lesson={lesson} />
              <Txt color={colors.muted}>
                Предпросмотр несохранённых материалов. Ответы ниже видит только
                администратор.
              </Txt>
              {lesson.questions.map((item, i) => (
                <Card key={item.id}>
                  <Pill>{difficultyNames[item.difficulty]}</Pill>
                  <Txt weight="600">
                    {i + 1}. {item.prompt}
                  </Txt>
                  {item.options.map((o) => (
                    <Txt key={o.id}>
                      {item.correctOptionIds.includes(o.id) ? "✓ " : "○ "}
                      {o.text}
                    </Txt>
                  ))}
                  <Txt color={colors.muted}>{item.explanation}</Txt>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <Field
                  label="Название урока"
                  value={lesson.title}
                  editable={!busy}
                  onChangeText={(title) => change({ title })}
                />
                <Txt size={12} color={colors.muted}>
                  ID: {lesson.id} · постоянный идентификатор для повторного
                  импорта
                </Txt>
                <Field
                  label="Порядок в разделе"
                  numeric
                  value={String(lesson.order)}
                  editable={!busy}
                  onChangeText={(v) => change({ order: Number(v) })}
                />
                <Disclosure
                  title={`Раздел: ${pkg.sections.find((s) => s.id === lesson.sectionId)?.title ?? "Выберите"}`}
                  icon="folder"
                >
                  {pkg.sections.map((s) => (
                    <Button
                      key={s.id}
                      small
                      secondary
                      selected={s.id === lesson.sectionId}
                      onPress={() => change({ sectionId: s.id })}
                    >
                      {pkg.courses.find((c) => c.id === s.courseId)?.title} /{" "}
                      {s.title}
                    </Button>
                  ))}
                  <Txt size={13} color={colors.muted}>
                    Новые курсы и разделы можно добавить через JSON-импорт.
                  </Txt>
                </Disclosure>
                <Disclosure
                  title={`Тема: ${state.topics.find((t) => t.id === lesson.topicId)?.title ?? "Выберите"}`}
                  icon="git-branch"
                >
                  <Field
                    label="Поиск темы"
                    value={topicSearch}
                    onChangeText={setTopicSearch}
                  />
                  {state.topics
                    .filter((t) =>
                      t.title
                        .toLocaleLowerCase()
                        .includes(topicSearch.toLocaleLowerCase()),
                    )
                    .map((t) => (
                      <Button
                        key={t.id}
                        small
                        secondary
                        selected={lesson.topicId === t.id}
                        onPress={() => change({ topicId: t.id })}
                      >
                        {t.title}
                      </Button>
                    ))}
                </Disclosure>
                <Field
                  label="Видео: HTTPS-ссылка (необязательно)"
                  value={lesson.videoUrl ?? ""}
                  editable={!busy}
                  onChangeText={(v) => change({ videoUrl: v || null })}
                />
                <Txt size={12} color={colors.muted}>
                  Прямой видеофайл воспроизводится в приложении; ссылка на
                  видеосервис открывается отдельно.
                </Txt>
                <Button
                  secondary
                  small
                  icon={lesson.demo ? "check-square" : "square"}
                  onPress={() => change({ demo: !lesson.demo })}
                >
                  Демонстрационный материал: {lesson.demo ? "да" : "нет"}
                </Button>
              </Card>
              <Disclosure title="Конспект урока" icon="file-text" initiallyOpen>
                {lesson.summary.map((b, i) => (
                  <Card key={i}>
                    <View style={[styles.row, { flexWrap: "wrap" }]}>
                      {(
                        [
                          ["paragraph", "Текст"],
                          ["heading", "Заголовок"],
                          ["example", "Пример"],
                          ["list", "Список"],
                        ] as const
                      ).map(([kind, label]) => (
                        <Button
                          key={kind}
                          small
                          secondary
                          selected={b.kind === kind}
                          onPress={() =>
                            change({
                              summary: lesson.summary.map((x, j) =>
                                j === i ? { ...x, kind } : x,
                              ),
                            })
                          }
                        >
                          {label}
                        </Button>
                      ))}
                    </View>
                    <Field
                      label={`Блок ${i + 1}`}
                      multiline
                      value={b.text}
                      editable={!busy}
                      onChangeText={(text) =>
                        change({
                          summary: lesson.summary.map((x, j) =>
                            j === i ? { ...x, text } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      small
                      secondary
                      disabled={lesson.summary.length === 1}
                      icon="trash-2"
                      onPress={() =>
                        change({
                          summary: lesson.summary.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Убрать блок
                    </Button>
                  </Card>
                ))}
                <Button
                  secondary
                  icon="plus"
                  onPress={() =>
                    change({
                      summary: [
                        ...lesson.summary,
                        { kind: "paragraph", text: "" } as SummaryBlock,
                      ],
                    })
                  }
                >
                  Добавить блок
                </Button>
              </Disclosure>
              <Disclosure title="Источники" icon="book">
                {lesson.sources.map((s, i) => (
                  <Card key={i}>
                    <Field
                      label={`Источник ${i + 1}: название`}
                      value={s.title}
                      onChangeText={(title) =>
                        change({
                          sources: lesson.sources.map((x, j) =>
                            j === i ? { ...x, title } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label={`Источник ${i + 1}: HTTPS-ссылка (необязательно)`}
                      value={s.url ?? ""}
                      onChangeText={(url) =>
                        change({
                          sources: lesson.sources.map((x, j) =>
                            j === i ? { ...x, url } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      secondary
                      small
                      onPress={() =>
                        change({
                          sources: lesson.sources.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Убрать источник
                    </Button>
                  </Card>
                ))}
                <Button
                  secondary
                  icon="plus"
                  onPress={() =>
                    change({ sources: [...lesson.sources, { title: "" }] })
                  }
                >
                  Добавить источник
                </Button>
              </Disclosure>
              <Disclosure
                title={`Банк вопросов · ${lesson.questions.length}`}
                icon="help-circle"
                initiallyOpen
              >
                <Txt size={13}>
                  Простых:{" "}
                  {
                    lesson.questions.filter((q) => q.difficulty === "easy")
                      .length
                  }{" "}
                  · Средних:{" "}
                  {
                    lesson.questions.filter((q) => q.difficulty === "medium")
                      .length
                  }{" "}
                  · Сложных:{" "}
                  {
                    lesson.questions.filter((q) => q.difficulty === "hard")
                      .length
                  }
                  . Для публикации минимум 4 / 4 / 2.
                </Txt>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  {lesson.questions.map((item, i) => (
                    <Button
                      key={item.id}
                      small
                      secondary
                      selected={i === questionIndex}
                      onPress={() => setQuestionIndex(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    small
                    secondary
                    icon="plus"
                    onPress={() => {
                      change({
                        questions: [
                          ...lesson.questions,
                          {
                            id: `q-${uid()}`,
                            difficulty: "easy",
                            type: "single",
                            prompt: "",
                            options: [
                              { id: "a", text: "" },
                              { id: "b", text: "" },
                            ],
                            correctOptionIds: ["a"],
                            explanation: "",
                          },
                        ],
                      });
                      setQuestionIndex(lesson.questions.length);
                    }}
                  >
                    Добавить
                  </Button>
                </View>
                {q && (
                  <Card>
                    <Txt weight="700">Вопрос {questionIndex! + 1}</Txt>
                    <Txt size={12} color={colors.muted}>
                      ID: {q.id}
                    </Txt>
                    <Field
                      label="Текст вопроса"
                      multiline
                      value={q.prompt}
                      onChangeText={(prompt) => question({ prompt })}
                    />
                    <View style={[styles.row, { flexWrap: "wrap" }]}>
                      {(["easy", "medium", "hard"] as const).map((d) => (
                        <Button
                          key={d}
                          small
                          secondary
                          selected={q.difficulty === d}
                          onPress={() => question({ difficulty: d })}
                        >
                          {difficultyNames[d]}
                        </Button>
                      ))}
                    </View>
                    <View style={[styles.row, { flexWrap: "wrap" }]}>
                      {(
                        [
                          ["single", "Один ответ"],
                          ["multiple", "Несколько ответов"],
                        ] as const
                      ).map(([type, label]) => (
                        <Button
                          key={type}
                          secondary
                          small
                          selected={q.type === type}
                          onPress={() =>
                            question({
                              type,
                              correctOptionIds:
                                type === "single"
                                  ? q.correctOptionIds.slice(0, 1)
                                  : q.correctOptionIds,
                            })
                          }
                        >
                          {label}
                        </Button>
                      ))}
                    </View>
                    {q.options.map((o, i) => (
                      <View key={o.id} style={{ gap: 6 }}>
                        <Field
                          label={`Вариант ${i + 1}`}
                          value={o.text}
                          onChangeText={(text) =>
                            question({
                              options: q.options.map((x) =>
                                x.id === o.id ? { ...x, text } : x,
                              ),
                            })
                          }
                        />
                        <Button
                          small
                          secondary
                          selected={q.correctOptionIds.includes(o.id)}
                          icon={
                            q.correctOptionIds.includes(o.id)
                              ? "check-square"
                              : "square"
                          }
                          onPress={() =>
                            question({
                              correctOptionIds:
                                q.type === "single"
                                  ? [o.id]
                                  : q.correctOptionIds.includes(o.id)
                                    ? q.correctOptionIds.filter(
                                        (id) => id !== o.id,
                                      )
                                    : [...q.correctOptionIds, o.id],
                            })
                          }
                        >
                          {q.correctOptionIds.includes(o.id)
                            ? "Правильный ответ"
                            : "Отметить правильным"}
                        </Button>
                      </View>
                    ))}
                    <View style={[styles.row, { flexWrap: "wrap" }]}>
                      <Button
                        small
                        secondary
                        disabled={q.options.length >= 8}
                        icon="plus"
                        onPress={() =>
                          question({
                            options: [
                              ...q.options,
                              { id: `option-${uid()}`, text: "" },
                            ],
                          })
                        }
                      >
                        Добавить вариант
                      </Button>
                    </View>
                    <Field
                      label="Объяснение правильного ответа"
                      multiline
                      value={q.explanation}
                      onChangeText={(explanation) => question({ explanation })}
                    />
                  </Card>
                )}
              </Disclosure>
              <Card>
                <Field
                  label="Проходной балл (от 1 до 10)"
                  value={String(lesson.test.passScore)}
                  numeric
                  onChangeText={(v) =>
                    change({ test: { passScore: Number(v) } })
                  }
                />
                <Txt size={13} color={colors.muted}>
                  7/10 — демонстрационный порог, пока не согласовано другое
                  значение. Старые попытки сохранят свой порог.
                </Txt>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  <Button
                    secondary
                    selected={lesson.status !== "published"}
                    icon="edit"
                    onPress={() => change({ status: "draft" })}
                  >
                    Черновик / снять с публикации
                  </Button>
                  <Button
                    secondary
                    selected={lesson.status === "published"}
                    icon="globe"
                    onPress={() => change({ status: "published" })}
                  >
                    Опубликовать
                  </Button>
                </View>
                <Txt size={13}>
                  Статус изменится после проверки и сохранения ниже.
                </Txt>
              </Card>
            </>
          )}
        </>
      ) : null}
      {(importOnly || pkg) && (
        <Button
          icon="check-circle"
          disabled={busy}
          onPress={() => void validate()}
        >
          Проверить перед сохранением
        </Button>
      )}
      {preview && (
        <Card>
          <Notice tone="success">
            Проверка пройдена. В базе пока ничего не изменилось.
          </Notice>
          <Txt>
            Курсов: {preview.courses} · разделов: {preview.sections} · уроков:{" "}
            {preview.lessons} · вопросов: {preview.questions}
          </Txt>
          <Txt>
            Новых уроков: {preview.createdLessons}. Обновятся:{" "}
            {preview.updatedLessons}.
          </Txt>
          <Txt size={13}>
            Без явно указанного статуса уроки сохраняются как черновики.
            Отсутствующие в пакете уроки и вопросы остаются в базе.
          </Txt>
          <Button disabled={busy} icon="save" onPress={() => void save()}>
            Сохранить в базе
          </Button>
        </Card>
      )}
    </View>
  );
}
