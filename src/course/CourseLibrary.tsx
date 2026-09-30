import React, { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Asset } from "expo-asset";
import { pdfAssets } from "./pdfAssets";
import {
  Button,
  Card,
  Disclosure,
  Field,
  Pill,
  Txt,
  colors,
  styles,
} from "../components/ui";
import { useLearning } from "../services/context";
import { useScreenScroll } from "../components/ScreenScroll";
import {
  course,
  coursePartsLabel,
  CourseTopic,
  emptyProgress,
  grades,
  searchCourse,
  subjectName,
} from "./model";
import { useCourseProgress } from "./storage";
import { CourseContent } from "./CourseContent";
import { courseContent } from "./content";

export function CourseLibrary() {
  const { actor } = useLearning();
  return <CourseBrowser key={actor.id} actorId={actor.id} />;
}
function CourseBrowser({ actorId }: { actorId: string }) {
  const [grade, setGrade] = useState<number | null>(5);
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CourseTopic | null>(null);
  const storage = useCourseProgress(actorId);
  useScreenScroll(selected?.id ?? "math-course-catalog");
  const filtered = searchCourse(query, grade, subject);
  const last = course
    .filter((t) => storage.progress[t.id]?.updatedAt)
    .sort((a, b) =>
      storage.progress[b.id].updatedAt.localeCompare(
        storage.progress[a.id].updatedAt,
      ),
    )[0];
  const readCount = course.filter(
    (t) => storage.progress[t.id]?.readPages.length === t.pages.length,
  ).length;
  return (
    <View
      style={{ gap: 16, maxWidth: 1000, width: "100%", alignSelf: "center" }}
    >
      {!!storage.error && (
        <Card>
          <Txt color={colors.red} accessibilityRole="alert">
            {storage.error}
          </Txt>
          {storage.ready && (
            <Button secondary onPress={storage.retry}>
              Повторить сохранение
            </Button>
          )}
        </Card>
      )}
      {selected ? (
        <CourseReader
          key={selected.id}
          topic={selected}
          storage={storage}
          back={() => setSelected(null)}
          next={(topic) => setSelected(topic)}
        />
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Pill icon="book-open">МАТЕМАТИКА · 5–11 КЛАССЫ</Pill>
            <Txt size={30} weight="700">
              Выбери тему. Разберись. Попробуй.
            </Txt>
            <Txt color={colors.muted}>
              55 тем с объяснениями, примерами, чертежами и заданиями из ваших
              конспектов.
            </Txt>
          </View>
          <Card style={{ backgroundColor: colors.light }}>
            <Txt weight="600">
              Конспекты прочитаны: {readCount} из {course.length}
            </Txt>
            <Txt size={13} color={colors.muted}>
              Закладки, записи и отметки самопроверки сохраняются для этого
              профиля на этом устройстве. Они не являются оценкой учителя.
            </Txt>
            {last && (
              <Button
                secondary
                icon="arrow-right"
                onPress={() => setSelected(last)}
              >
                Продолжить: {last.title}
              </Button>
            )}
          </Card>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {grades.map((g) => (
              <Button
                key={g}
                small
                secondary
                selected={grade === g}
                onPress={() => setGrade(g)}
              >
                {g} класс
              </Button>
            ))}
            <Button
              small
              secondary
              selected={grade === null}
              onPress={() => setGrade(null)}
            >
              Все классы
            </Button>
          </View>
          <Field
            label="Поиск по темам"
            placeholder="Например: дроби, производная, G08-03"
            value={query}
            onChangeText={setQuery}
          />
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {[
              ["all", "Все предметы"],
              ["algebra", grade && grade <= 6 ? "Арифметика" : "Алгебра"],
              ["geometry", grade && grade >= 10 ? "Стереометрия" : "Геометрия"],
            ].map(([id, name]) => (
              <Button
                key={id}
                small
                secondary
                selected={subject === id}
                onPress={() => setSubject(id)}
              >
                {name}
              </Button>
            ))}
          </View>
          <Txt size={13} color={colors.muted}>
            Найдено тем: {filtered.length}
          </Txt>
          {!filtered.length && (
            <Card>
              <Txt>
                Темы не найдены. Измените запрос или выберите все классы.
              </Txt>
              <Button
                secondary
                onPress={() => {
                  setGrade(null);
                  setSubject("all");
                  setQuery("");
                }}
              >
                Сбросить фильтры
              </Button>
            </Card>
          )}
          {grades
            .filter((g) => filtered.some((t) => t.grade === g))
            .map((g) => (
              <View key={g} style={{ gap: 14 }}>
                <Txt size={24} weight="700">
                  {g} класс
                </Txt>
                {["algebra", "geometry"]
                  .filter((s) =>
                    filtered.some((t) => t.grade === g && t.subject === s),
                  )
                  .map((s) => (
                    <View key={s} style={{ gap: 10 }}>
                      <Txt size={18} weight="600">
                        {subjectName(g, s)}
                      </Txt>
                      {filtered
                        .filter((t) => t.grade === g && t.subject === s)
                        .map((t) => {
                          const p = storage.progress[t.id];
                          const read = p?.readPages.length ?? 0;
                          const reviewed = Object.keys(
                            p?.reviewed ?? {},
                          ).length;
                          return (
                            <Card key={t.id}>
                              <View
                                style={[
                                  styles.row,
                                  {
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                  },
                                ]}
                              >
                                <Pill tone="neutral">{t.id}</Pill>
                                {!!read && (
                                  <Pill>
                                    {read === t.pages.length
                                      ? "Конспект прочитан"
                                      : `Прочитано ${read}/${t.pages.length}`}
                                  </Pill>
                                )}
                              </View>
                              <Txt size={19} weight="600">
                                {t.title}
                              </Txt>
                              <Txt size={13} color={colors.muted}>
                                {coursePartsLabel(t.pages.length)} конспекта ·{" "}
                                {t.practice.count} заданий
                                {reviewed
                                  ? ` · разобрано ${reviewed}/${t.practice.count}`
                                  : ""}
                              </Txt>
                              <Button
                                secondary
                                icon="arrow-right"
                                onPress={() => setSelected(t)}
                              >
                                {p ? "Продолжить тему" : "Открыть тему"}
                              </Button>
                            </Card>
                          );
                        })}
                    </View>
                  ))}
              </View>
            ))}
        </>
      )}
    </View>
  );
}

type Storage = ReturnType<typeof useCourseProgress>;
function CourseReader({
  topic,
  storage,
  back,
  next,
}: {
  topic: CourseTopic;
  storage: Storage;
  back: () => void;
  next: (t: CourseTopic) => void;
}) {
  const p = storage.progress[topic.id] ?? emptyProgress();
  const [page, setPage] = useState(p.page);
  const [tab, setTab] = useState<"theory" | "practice">("theory");
  const [answers, setAnswers] = useState(false);
  const [hints, setHints] = useState(false);
  const [sourceError, setSourceError] = useState("");
  useEffect(() => {
    if (storage.ready) setPage(p.page);
  }, [storage.ready]);
  const content = courseContent[topic.id];
  const currentContent = content.pages[page];
  const following = course.filter(
    (t) => t.grade === topic.grade && t.subject === topic.subject,
  );
  const nextTopic =
    following[following.findIndex((t) => t.id === topic.id) + 1];
  useScreenScroll(`${topic.id}:${tab}:${page}`);
  function turn(index: number) {
    setPage(index);
    storage.update(topic.id, { page: index });
  }
  function markRead() {
    const readPages = [...new Set([...p.readPages, page])];
    const index = Math.min(page + 1, topic.pages.length - 1);
    storage.update(topic.id, { readPages, page: index });
    if (page === topic.pages.length - 1) setTab("practice");
    else setPage(index);
  }
  return (
    <>
      <Button small secondary icon="arrow-left" onPress={back}>
        К темам курса
      </Button>
      <Pill>
        {topic.grade} класс · {subjectName(topic.grade, topic.subject)} ·{" "}
        {topic.id}
      </Pill>
      <Txt size={27} weight="700">
        {topic.title}
      </Txt>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          secondary
          selected={tab === "theory"}
          icon="book-open"
          onPress={() => setTab("theory")}
        >
          Конспект
        </Button>
        <Button
          secondary
          selected={tab === "practice"}
          icon="edit-3"
          onPress={() => setTab("practice")}
        >
          Проверь себя · {topic.practice.count} заданий
        </Button>
      </View>
      {tab === "theory" ? (
        <>
          <Disclosure
            title={`Содержание темы · ${coursePartsLabel(topic.pages.length)}`}
            icon="list"
          >
            {topic.pages.map((pg, i) => (
              <Button
                key={pg.number}
                small
                secondary
                selected={page === i}
                onPress={() => turn(i)}
              >
                {i + 1}. {content.pages[i].title}
                {p.readPages.includes(i) ? " ✓" : ""}
              </Button>
            ))}
          </Disclosure>
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <Button
              secondary
              small
              disabled={page === 0}
              onPress={() => turn(page - 1)}
            >
              Назад
            </Button>
            <Txt size={13}>
              Часть {page + 1} из {topic.pages.length}
            </Txt>
            <Button
              secondary
              small
              disabled={page === topic.pages.length - 1}
              onPress={() => turn(page + 1)}
            >
              Далее
            </Button>
          </View>
          <View
            style={{
              width: "100%",
              maxWidth: 820,
              alignSelf: "center",
              paddingVertical: 12,
            }}
          >
            <CourseContent
              key={`${topic.id}-${page}`}
              blocks={currentContent.blocks}
            />
          </View>
          <Button disabled={!storage.ready} icon="check" onPress={markRead}>
            {page === topic.pages.length - 1
              ? "Прочитано — к самопроверке"
              : "Прочитано — следующая часть"}
          </Button>
        </>
      ) : (
        <>
          <Card style={{ backgroundColor: colors.light }}>
            <Txt weight="600">Сначала реши, затем сравни с ответами</Txt>
            <Txt>
              Выполни задания в тетради. Для доказательств и построений запиши
              ход решения. Подсказки и ответы можно открыть отдельно.
            </Txt>
            <Txt size={13} color={colors.muted}>
              Это самопроверка. Приложение не выставляет балл за собственные
              отметки.
            </Txt>
          </Card>
          <CourseContent blocks={content.practice.questions} />
          <Button
            secondary
            icon="help-circle"
            onPress={() => setHints((v) => !v)}
          >
            {hints ? "Скрыть подсказки" : "Показать подсказки"}
          </Button>
          {hints && <CourseContent blocks={content.practice.hints} />}
          <Field
            label="Мои записи к решению"
            placeholder="Запишите ход решения или вопросы к учителю"
            value={p.notes}
            onChangeText={(notes) => storage.update(topic.id, { notes })}
            multiline
            maxLength={12000}
            editable={storage.ready}
          />
          <Button icon="check-circle" onPress={() => setAnswers((v) => !v)}>
            {answers ? "Скрыть ответы" : "Я попробовал — открыть ответы"}
          </Button>
          {answers && (
            <>
              <CourseContent blocks={content.practice.answers} />
              <Card>
                <Txt size={20} weight="600">
                  Отметь результат самопроверки
                </Txt>
                <Txt color={colors.muted}>
                  Сравни не только ответ, но и ход решения. Можно изменить любую
                  отметку.
                </Txt>
                {Array.from({ length: topic.practice.count }, (_, i) =>
                  String(i + 1),
                ).map((n) => (
                  <View key={n} style={[styles.row, { flexWrap: "wrap" }]}>
                    <Txt weight="600">Задание {n}</Txt>
                    <Button
                      small
                      secondary
                      disabled={!storage.ready}
                      selected={p.reviewed[n] === "understood"}
                      label={`Задание ${n}: разобрался`}
                      onPress={() =>
                        storage.update(topic.id, {
                          reviewed: { ...p.reviewed, [n]: "understood" },
                        })
                      }
                    >
                      Разобрался
                    </Button>
                    <Button
                      small
                      secondary
                      disabled={!storage.ready}
                      selected={p.reviewed[n] === "repeat"}
                      label={`Задание ${n}: повторить`}
                      onPress={() =>
                        storage.update(topic.id, {
                          reviewed: { ...p.reviewed, [n]: "repeat" },
                        })
                      }
                    >
                      Повторить
                    </Button>
                  </View>
                ))}
                <Txt>
                  Разобрался:{" "}
                  {
                    Object.values(p.reviewed).filter((v) => v === "understood")
                      .length
                  }
                  . Повторить:{" "}
                  {
                    Object.values(p.reviewed).filter((v) => v === "repeat")
                      .length
                  }
                  . Без отметки:{" "}
                  {topic.practice.count - Object.keys(p.reviewed).length}.
                </Txt>
              </Card>
            </>
          )}
          {nextTopic && (
            <Button
              secondary
              icon="arrow-right"
              onPress={() => next(nextTopic)}
            >
              Следующая тема: {nextTopic.title}
            </Button>
          )}
        </>
      )}
      <Txt
        size={12}
        color={storage.error ? colors.red : colors.muted}
        accessibilityLiveRegion="polite"
      >
        {storage.error
          ? "Изменения не сохранены"
          : storage.saving
            ? "Сохраняем…"
            : storage.ready
              ? "Отметки и записи сохраняются на этом устройстве"
              : "Загружаем сохранённые отметки…"}
      </Txt>
      <Disclosure title="О конспекте и источниках" icon="info">
        <Txt size={13}>
          Математика, {topic.grade} класс · страницы {topic.startPage}–
          {topic.endPage} предоставленного PDF. Текст адаптирован для чтения в
          приложении; математические обозначения и чертежи сохранены.
        </Txt>
        <Txt size={13}>{topic.practice.source}</Txt>
        {Platform.OS === "web" && (
          <Button
            secondary
            icon="external-link"
            onPress={() => {
              setSourceError("");
              void Linking.openURL(
                Asset.fromModule(pdfAssets[topic.grade]).uri +
                  `#page=${topic.startPage}`,
              ).catch(() =>
                setSourceError("Не удалось открыть PDF. Повторите попытку."),
              );
            }}
          >
            Открыть оригинал PDF
          </Button>
        )}
        {!!sourceError && (
          <Txt accessibilityRole="alert" color={colors.red}>
            {sourceError}
          </Txt>
        )}
      </Disclosure>
    </>
  );
}
