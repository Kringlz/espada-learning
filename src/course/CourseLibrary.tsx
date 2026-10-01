import { useUITheme } from "../components/ui";
import { CourseVideos } from "./CourseVideos";
import { TopicCover, topicCover } from "../components/TopicCover";
import { CoursePractice } from "./CoursePractice";
import React, { useEffect, useState } from "react";
import { Linking, Platform, View, useWindowDimensions } from "react-native";
import { Asset } from "expo-asset";
import { pdfAssets } from "./pdfAssets";
import {
  Button,
  Icon,
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
  courseSubject,
} from "./model";
import { useCourseProgress } from "./storage";
import { CourseContent } from "./CourseContent";
import { courseContent } from "./content";
import { VisualCard } from "../components/VisualCard";
import { topicArt } from "../components/LearningArt";

export function CourseLibrary({
  request,
  extras,
}: {
  request?: { id: string; key: number };
  extras?: React.ReactNode;
}) {
  const { colors, styles } = useUITheme();
  const { actor } = useLearning();
  return (
    <CourseBrowser
      key={actor.id}
      actorId={actor.id}
      request={request}
      extras={extras}
    />
  );
}
function CourseBrowser({
  actorId,
  request,
  extras,
}: {
  actorId: string;
  request?: { id: string; key: number };
  extras?: React.ReactNode;
}) {
  const { colors, styles } = useUITheme();
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridWidth >= 780 ? 3 : gridWidth >= 420 ? 2 : 1;
  const gridGap = width >= 760 ? 18 : 12;
  const [grade, setGrade] = useState<number | null>(5);
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CourseTopic | null>(null);
  const storage = useCourseProgress(actorId);
  function selectTopic(topic: CourseTopic) {
    setSelected(topic);
    storage.update(topic.id, { page: storage.progress[topic.id]?.page ?? 0 });
  }
  useEffect(() => {
    const topic = request && course.find((t) => t.id === request.id);
    if (topic) selectTopic(topic);
  }, [request, storage.ready]);
  useEffect(() => {
    if (storage.ready) {
      const last = course
        .filter((t) => storage.progress[t.id]?.updatedAt)
        .sort((a, b) =>
          storage.progress[b.id].updatedAt.localeCompare(
            storage.progress[a.id].updatedAt,
          ),
        )[0];
      if (last) setGrade(last.grade);
    }
  }, [storage.ready]);
  useScreenScroll(selected?.id ?? "math-course-catalog");
  const filtered = searchCourse(query, grade, subject);
  return (
    <View
      style={{
        gap: 22,
        maxWidth: selected ? 760 : 1040,
        width: "100%",
        alignSelf: "center",
      }}
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
          next={selectTopic}
        />
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Txt
              size={width >= 760 ? 38 : 30}
              weight="700"
              style={{ letterSpacing: -0.8 }}
            >
              Мир математики
            </Txt>
            <Txt size={16} color={colors.muted}>
              Выбери, что интересно.
            </Txt>
          </View>
          <Disclosure
            key={`grade-${grade}`}
            title={
              grade ? `${grade} класс · изменить` : "Все классы · изменить"
            }
            icon="book-open"
          >
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {grades.map((g) => (
                <Button
                  key={g}
                  secondary
                  small
                  selected={grade === g}
                  onPress={() => {
                    setGrade(g);
                    setSubject("all");
                  }}
                >
                  {g} класс
                </Button>
              ))}
              <Button
                secondary
                small
                selected={grade === null}
                onPress={() => setGrade(null)}
              >
                Все классы
              </Button>
            </View>
          </Disclosure>
          <Field
            label=""
            placeholder="Найти тему…"
            value={query}
            onChangeText={setQuery}
          />
          {grade !== null && grade <= 6 ? (
            <Txt size={14} weight="700" color={colors.green}>
              Математика
            </Txt>
          ) : (
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {[
                ["all", "Все темы"],
                ...(grade === null
                  ? [["math", "Математика · 5–6 классы"]]
                  : []),
                ["algebra", "Алгебра"],
                [
                  "geometry",
                  grade && grade >= 10 ? "Стереометрия" : "Геометрия",
                ],
              ].map(([id, title]) => (
                <Button
                  key={id}
                  secondary
                  small
                  selected={subject === id}
                  onPress={() => setSubject(id)}
                >
                  {title}
                </Button>
              ))}
            </View>
          )}
          {!filtered.length && (
            <Card>
              <Txt>
                Пока ничего не нашли. Попробуй другое название или другой класс.
              </Txt>
              <Button
                secondary
                onPress={() => {
                  setGrade(null);
                  setSubject("all");
                  setQuery("");
                }}
              >
                Искать во всех классах
              </Button>
            </Card>
          )}
          <View
            onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
            style={{ flexDirection: "row", flexWrap: "wrap", gap: gridGap }}
          >
            {filtered.map((t) => {
              const p = storage.progress[t.id];
              const title = courseContent[t.id].pages[0].title;
              return (
                <View
                  key={t.id}
                  style={{
                    width: gridWidth
                      ? (gridWidth - gridGap * (columns - 1)) / columns
                      : "48%",
                  }}
                >
                  <VisualCard
                    title={title}
                    kind={topicArt(t.title, t.subject)}
                    cover={topicCover(t.title, t.subject)}
                    compact={width < 580}
                    horizontal={columns === 1}
                    caption={`${coursePartsLabel(t.pages.length)}${p?.updatedAt ? " · продолжить" : ""}`}
                    progress={
                      (100 * (p?.readPages.length ?? 0)) / t.pages.length
                    }
                    label={`${p?.updatedAt ? "Продолжить" : "Начать"}: ${title}, ${t.grade} класс`}
                    onPress={() => selectTopic(t)}
                  />
                </View>
              );
            })}
          </View>
          {extras}
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
  const { colors, styles } = useUITheme();
  const p = storage.progress[topic.id] ?? emptyProgress();
  const [page, setPage] = useState(p.page);
  const [tab, setTab] = useState<"theory" | "practice">("theory");
  const [sourceError, setSourceError] = useState("");
  useEffect(() => {
    if (storage.ready) setPage(p.page);
  }, [storage.ready]);
  const content = courseContent[topic.id];
  const currentContent = content.pages[page];
  const following = course.filter(
    (t) => t.grade === topic.grade && courseSubject(t) === courseSubject(topic),
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
        Все темы
      </Button>
      {tab === "practice" && (
        <Txt size={26} weight="700">
          {content.pages[0].title}
        </Txt>
      )}
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          secondary
          selected={tab === "theory"}
          icon="book-open"
          onPress={() => setTab("theory")}
        >
          Урок
        </Button>
        <Button
          secondary
          selected={tab === "practice"}
          icon="check-square"
          onPress={() => setTab("practice")}
        >
          Тест
        </Button>
      </View>
      {tab === "theory" ? (
        <>
          <TopicCover
            title={currentContent.title}
            themeTitle={topic.title}
            subject={topic.subject}
            eyebrow={`${topic.grade} КЛАСС · ЧАСТЬ ${page + 1} ИЗ ${topic.pages.length}`}
          />
          <CourseVideos
            key={`videos-${topic.id}-${page}`}
            topicId={topic.id}
            page={page}
          />
          <Card
            style={{
              width: "100%",
              maxWidth: 760,
              alignSelf: "center",
              padding: 22,
              gap: 28,
            }}
          >
            <View style={{ gap: 10 }}>
              <View
                style={{
                  height: 5,
                  backgroundColor: colors.light,
                  borderRadius: 5,
                }}
              >
                <View
                  style={{
                    height: 5,
                    borderRadius: 5,
                    backgroundColor: colors.green,
                    width: `${(100 * (page + 1)) / topic.pages.length}%`,
                  }}
                />
              </View>
            </View>
            <CourseContent
              key={`${topic.id}-${page}`}
              blocks={currentContent.blocks.filter(
                (block, index) =>
                  !(
                    index === 0 &&
                    block.kind === "heading" &&
                    block.runs
                      .map((run) => run.text)
                      .join("")
                      .replace(/\s+/g, " ")
                      .trim() ===
                      currentContent.title.replace(/\s+/g, " ").trim()
                  ),
              )}
            />
          </Card>
          <Button disabled={!storage.ready} icon="check" onPress={markRead}>
            {page === topic.pages.length - 1
              ? "Всё прочитал — попробую сам"
              : "Понятно, идём дальше"}
          </Button>
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
        </>
      ) : (
        <CoursePractice
          key={topic.id}
          topic={topic}
          storage={storage}
          back={() => setTab("theory")}
          next={nextTopic ? () => next(nextTopic) : undefined}
        />
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
              ? "Сохранено на устройстве"
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
