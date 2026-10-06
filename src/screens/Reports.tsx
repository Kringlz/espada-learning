import { topicCover } from "../components/TopicCover";
import { sectionIllustrations } from "../components/SectionIllustrations";
import { courseContent } from "../course/content";
import { LevelCard } from "../engagement/LevelCard";
import { SectionTabs } from "../components/SectionTabs";
import { SoftReveal } from "../components/Motion";
import { useUITheme } from "../components/ui";
import { TestProgress } from "../lessons/TestProgress";
import { CourseProgress } from "../course/CourseProgress";
import { course } from "../course/model";
import { useCourseProgress } from "../course/storage";
import { lessonStorageReady } from "../lessons/service";
import { useScreenScroll } from "../components/ScreenScroll";
import { CourseLibrary } from "../course/CourseLibrary";
import { LessonLibrary } from "../lessons/LessonLibrary";
import React, { useEffect, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { VisualCard } from "../components/VisualCard";
import { ResultRadar } from "../components/ResultRadar";
import { LatestReport } from "../components/LatestReport";
import { useLearning } from "../services/context";
import { TeacherReport, ReportTemplate, State } from "../core/types";
import {
  hasMaterial,
  percent,
  reportsFor,
  reportHistory,
  orderedReportTemplate,
  masteryPolicy,
  reviewSuggestions,
  topicMastery,
  MasteryStatus,
} from "../core/reports";
import { assessmentScore } from "../core/engine";
import {
  Disclosure,
  Icon,
  Button,
  Card,
  Txt,
  Pill,
  Field,
  SectionTitle,
  colors,
  styles,
  dateText,
} from "../components/ui";
import { TopicTree } from "../components/TopicTree";

const empty =
  "Пока нет результатов. Они появятся после проверки работы учителем";
const unseen = (s: State, r: TeacherReport) =>
  !(s.reportReads ?? []).some(
    (x) =>
      x.reportId === r.id &&
      x.studentId === r.studentId &&
      x.revision === r.revision,
  );
function Grade({
  report,
  template,
}: {
  report: TeacherReport;
  template: ReportTemplate;
}) {
  const { colors, styles } = useUITheme();
  return (
    <View style={{ gap: 2 }}>
      <Txt size={12} color={colors.muted}>
        Оценка
      </Txt>
      <Txt size={28} weight="700">
        {report.grade}
        <Txt size={14} color={colors.muted}>
          {" "}
          / {template.scale.max}
        </Txt>
      </Txt>
      <Txt size={12} color={colors.muted}>
        Шкала: {template.scale.min}–{template.scale.max}
      </Txt>
    </View>
  );
}
export function Suggestions({
  studentId,
  report,
  openTopic,
}: {
  studentId: string;
  report?: TeacherReport;
  openTopic: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s } = useLearning();
  const rows = reviewSuggestions(s, studentId, report);
  return (
    <View style={{ gap: 12 }}>
      {rows.length ? (
        rows.map((row) => {
          const t = s.topics.find((t) => t.id === row.topicId)!;
          return (
            <Card key={t.id} style={{ backgroundColor: colors.light }}>
              <Txt weight="600">{t.title}</Txt>
              <Txt size={14} color={colors.muted}>
                {row.reason}
              </Txt>
              <Button secondary onPress={() => openTopic(t.id)}>
                {t.lesson || t.videos?.length || t.video
                  ? "Смотреть урок"
                  : "Начать практику"}
              </Button>
            </Card>
          );
        })
      ) : (
        <Card>
          <Txt color={colors.muted}>
            Пока нет подходящих материалов для повторения по этим результатам.
            Можно выбрать любую тему в разделе «Учёба» или обсудить работу с
            учителем.
          </Txt>
        </Card>
      )}
    </View>
  );
}
export function Home({
  openTopic,
  navigate,
  openResult,
  openCourse,
}: {
  openTopic: (id: string) => void;
  navigate: (tab: string) => void;
  openResult: (id: string) => void;
  openCourse: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s, actor } = useLearning();
  const storage = useCourseProgress(actor.id);
  const latest = reportsFor(s, actor.id)[0];
  const template = s.reportTemplates?.find((t) => t.id === latest?.templateId);
  const homework = s.assignments
    .filter((a) => a.studentId === actor.id && !a.completedAt)
    .sort((a, b) => Number(b.override) - Number(a.override));
  const done = s.assignments.filter(
    (a) => a.studentId === actor.id && a.completedAt,
  );
  const activity = s.activities
    .filter(
      (a) =>
        a.studentId === actor.id &&
        a.stage !== "complete" &&
        s.topics.some((t) => t.id === a.topicId && hasMaterial(t)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const last = course
    .filter((t) => storage.progress[t.id]?.updatedAt)
    .sort((a, b) =>
      storage.progress[b.id].updatedAt.localeCompare(
        storage.progress[a.id].updatedAt,
      ),
    )[0];
  const useCourse =
    last &&
    (!activity || storage.progress[last.id].updatedAt >= activity.updatedAt);
  const first = homework[0];
  const title = first
    ? s.topics.find((t) => t.id === first.topicId)?.title
    : useCourse
      ? courseContent[last.id].pages[0].title
      : activity
        ? s.topics.find((t) => t.id === activity.topicId)?.title
        : "Начнём с небольшой темы?";
  const start = () =>
    first
      ? openTopic(first.topicId)
      : useCourse
        ? openCourse(last.id)
        : activity
          ? openTopic(activity.topicId)
          : navigate("Learn");
  const wide = useWindowDimensions().width >= 760;
  return (
    <View
      style={{ gap: 24, maxWidth: 1040, width: "100%", alignSelf: "center" }}
    >
      <View style={{ gap: 5 }}>
        <Txt size={wide ? 38 : 29} weight="700" style={{ letterSpacing: -0.9 }}>
          Привет, {actor.name.split(" ")[0]}!
        </Txt>
        <Txt size={16} color={colors.muted}>
          Чему научимся сегодня?
        </Txt>
      </View>
      <View
        style={{
          backgroundColor: "#304D3D",
          borderRadius: 32,
          overflow: "hidden",
          padding: wide ? 36 : 24,
        }}
      >
        <View
          style={{
            flexDirection: wide ? "row" : "column",
            alignItems: wide ? "center" : "stretch",
            gap: wide ? 20 : 0,
          }}
        >
          <View
            style={{
              flex: wide ? 1 : undefined,
              gap: wide ? 22 : 16,
              zIndex: 1,
            }}
          >
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#D9E5A8",
                }}
              />
              <Txt
                size={12}
                weight="700"
                color="#D9E5A8"
                style={{ letterSpacing: 1 }}
              >
                {first ? "ЗАДАНИЕ ОТ УЧИТЕЛЯ" : "ТВОЙ СЛЕДУЮЩИЙ ШАГ"}
              </Txt>
            </View>
            {!wide && (
              <Image
                source={
                  title
                    ? topicCover(title).image
                    : sectionIllustrations.learning.image
                }
                accessible={false}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 190,
                  backgroundColor: "#F7F4E9",
                  marginVertical: -3,
                  borderRadius: 20,
                }}
              />
            )}
            <Txt
              size={wide ? 40 : 28}
              weight="700"
              color="#FBF8E9"
              style={{ lineHeight: wide ? 46 : 33, letterSpacing: -0.8 }}
            >
              {last || activity || first
                ? title?.split(":")[0]
                : "Большие открытия.\nМаленькими шагами."}
            </Txt>
            {useCourse && !first && (
              <Txt size={14} color="#CCD6BD">
                Часть {(storage.progress[last.id]?.page ?? 0) + 1} из{" "}
                {last.pages.length}
              </Txt>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                first
                  ? "Начать задание"
                  : last || activity
                    ? "Продолжить урок"
                    : "Выбрать тему"
              }
              onPress={start}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                backgroundColor: colors.light,
                borderRadius: 18,
                paddingVertical: 17,
                paddingHorizontal: 22,
                alignSelf: wide ? "flex-start" : "stretch",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Txt size={17} weight="700" color={colors.ink}>
                {first
                  ? "Начать задание"
                  : last || activity
                    ? "Продолжить"
                    : "Начать учиться"}
              </Txt>
              <Icon name="arrow-right" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {wide && (
            <Image
              source={
                title
                  ? topicCover(title).image
                  : sectionIllustrations.learning.image
              }
              accessible={false}
              resizeMode="contain"
              style={{
                width: "43%",
                height: 310,
                borderRadius: 24,
                backgroundColor: "#F7F4E9",
              }}
            />
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: wide ? 20 : 12 }}>
        <VisualCard
          title="Все темы"
          caption="Выбери своё открытие"
          kind="numbers"
          compact={!wide}
          onPress={() => navigate("Learn")}
        />
        <VisualCard
          title="Мой прогресс"
          caption={
            latest && template
              ? `Последняя оценка: ${latest.grade} из ${template.scale.max}${latest.demo ? " · демо" : ""}`
              : "Твоя карта знаний"
          }
          kind="compass"
          compact={!wide}
          onPress={() => navigate("Progress")}
        />
      </View>
      {(homework.length > 0 || !!done.length) && (
        <Disclosure
          title={`Мои задания · ${homework.length + done.length}`}
          icon="check-square"
        >
          {homework.map((a) => (
            <View key={a.id} style={{ gap: 8 }}>
              <Txt weight="600">
                {s.topics.find((t) => t.id === a.topicId)?.title}
              </Txt>
              <Txt size={14} color={colors.muted}>
                {a.reason}
              </Txt>
              <Button small secondary onPress={() => openTopic(a.topicId)}>
                Открыть задание
              </Button>
            </View>
          ))}
          {done.map((a) => (
            <View key={a.id} style={{ gap: 8 }}>
              <Txt weight="600">
                ✓ {s.topics.find((t) => t.id === a.topicId)?.title}
              </Txt>
              <Button small secondary onPress={() => openTopic(a.topicId)}>
                Посмотреть
              </Button>
            </View>
          ))}
        </Disclosure>
      )}
      <Disclosure title="Что повторить" icon="refresh-cw">
        <Suggestions studentId={actor.id} openTopic={openTopic} />
      </Disclosure>
    </View>
  );
}

export function Learn({
  openTopic,
  courseRequest,
  active = true,
}: {
  openTopic: (id: string) => void;
  courseRequest?: { id: string; key: number };
  active?: boolean;
}) {
  const [reading, setReading] = useState(false);
  const [section, setSection] = useState<
    "course" | "videos" | "practice" | "tests"
  >("course");
  useEffect(() => {
    setSection("course");
  }, [courseRequest]);
  useScreenScroll(`learn:${section}`);
  return (
    <View
      style={{ gap: 20, maxWidth: 1040, width: "100%", alignSelf: "center" }}
    >
      {!reading && (
        <>
          <Txt size={32} weight="700" style={{ letterSpacing: -0.8 }}>
            Учиться
          </Txt>
          <SectionTabs
            value={section}
            onChange={setSection}
            options={[
              { value: "course", label: "Учебник", icon: "book-open" },
              { value: "videos", label: "Видео", icon: "play-circle" },
              { value: "practice", label: "Практика", icon: "edit-3" },
              ...(lessonStorageReady
                ? [
                    {
                      value: "tests" as const,
                      label: "Тесты",
                      icon: "check-circle" as const,
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
      <SoftReveal changeKey={section} active={active}>
        <SoftReveal
          active={section === "course" || section === "videos"}
          style={{
            display:
              section === "course" || section === "videos" ? "flex" : "none",
          }}
        >
          <CourseLibrary
            onTopicChange={setReading}
            request={courseRequest}
            mode={section === "videos" ? "videos" : "course"}
          />
        </SoftReveal>
        {section === "practice" && <TopicTree openTopic={openTopic} />}
        {section === "tests" && <LessonLibrary />}
      </SoftReveal>
    </View>
  );
}

export function ReportDetail({
  id,
  back,
  openTopic,
}: {
  id: string;
  back: () => void;
  openTopic: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s, actor, dispatch } = useLearning();
  const r = s.reports?.find((r) => r.id === id);
  const storedTemplate = s.reportTemplates?.find((t) => t.id === r?.templateId);
  const t = storedTemplate
    ? orderedReportTemplate(s, storedTemplate)
    : undefined;
  const history = r ? reportHistory(s, r) : [];
  const earlierRows = r
    ? history.slice(history.findIndex((x) => x.id === r.id) + 1)
    : [];
  const [showHistory, setShowHistory] = useState(false);
  const [comparison, setComparison] = useState(earlierRows[0]?.id ?? "");
  const earlier = earlierRows.find((x) => x.id === comparison);
  useEffect(() => {
    if (r && actor.id === r.studentId && unseen(s, r))
      void dispatch({
        type: "readReport",
        reportId: r.id,
        revision: r.revision,
      }).catch(() => {});
  }, [id, r?.revision, actor.id]);
  if (!r || !t)
    return (
      <Card>
        <Txt>Результат не найден.</Txt>
        <Button onPress={back}>Назад</Button>
      </Card>
    );
  return (
    <View style={{ gap: 16 }}>
      <Button secondary small onPress={back} icon="arrow-left">
        Назад
      </Button>
      <Card style={{ padding: 20 }}>
        <View
          style={[styles.row, { alignItems: "flex-start", flexWrap: "wrap" }]}
        >
          <View style={{ flex: 1, minWidth: 170, gap: 10 }}>
            <Txt size={22} weight="600">
              {t.name}
            </Txt>
            <Txt size={13} color={colors.muted}>
              {dateText(r.date)}
            </Txt>
          </View>
          <Grade report={r} template={t} />
        </View>
        {r.demo && <Pill tone="gold">Учебный пример · вымышленные данные</Pill>}
      </Card>
      <Card>
        <Txt size={22} weight="600">
          Результаты по разделам
        </Txt>
        <Txt size={13} color={colors.muted}>
          Доля правильных ответов в этой работе. Состояния тем показаны отдельно
          в «Изучении тем».
        </Txt>
        {t.areas.map((a, i) => {
          const row = r.results.find((x) => x.areaId === a.id);
          const p = percent(row);
          return (
            <View
              key={a.id}
              style={{
                gap: 5,
                borderTopWidth: 1,
                borderColor: colors.line,
                paddingTop: 14,
              }}
            >
              <Txt weight="600">
                {i + 1}. {a.label}
              </Txt>
              <Txt>
                {p === null
                  ? "Нет данных"
                  : `Правильно: ${row!.correct} из ${row!.total} · ${p}%`}
              </Txt>
            </View>
          );
        })}
      </Card>
      <Disclosure title="Сравнить с прошлыми работами" icon="bar-chart-2">
        <ResultRadar template={t} report={r} earlier={earlier} />
        {earlierRows.length ? (
          <>
            <Txt weight="600">Сравнить с работой</Txt>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {earlierRows.map((x) => (
                <Button
                  small
                  secondary={x.id !== comparison}
                  key={x.id}
                  onPress={() => setComparison(x.id)}
                >
                  {dateText(x.date)}
                </Button>
              ))}
            </View>
            {earlier &&
              t.areas.map((a) => {
                const row = r.results.find((x) => x.areaId === a.id);
                const old = earlier.results.find((x) => x.areaId === a.id);
                const now = percent(row),
                  prev = percent(old);
                return (
                  <View key={a.id} style={{ gap: 3 }}>
                    <Txt weight="600">{a.label}</Txt>
                    <Txt size={14}>
                      {now === null || prev === null
                        ? "Недостаточно данных для сравнения"
                        : `Было ${prev}% → стало ${now}%`}
                    </Txt>
                    <Txt size={12} color={colors.muted}>
                      {prev === null
                        ? "Раньше: нет данных"
                        : `Раньше: ${old!.correct} из ${old!.total}`}{" "}
                      ·{" "}
                      {now === null
                        ? "Сейчас: нет данных"
                        : `Сейчас: ${row!.correct} из ${row!.total}`}
                    </Txt>
                  </View>
                );
              })}
          </>
        ) : (
          <Txt color={colors.muted}>
            Пока нет более ранних сопоставимых работ. Здесь появится сравнение
            после следующей проверки.
          </Txt>
        )}
        <Txt size={13} color={colors.muted}>
          Сравниваем только одинаковые разделы и шкалы. Сложность работ может
          отличаться: изменение результата не измеряет точный рост способностей.
        </Txt>
      </Disclosure>
      {history.length > 1 && (
        <Button secondary onPress={() => setShowHistory(!showHistory)}>
          {showHistory
            ? "Скрыть историю по разделам"
            : `Вся история по разделам · ${history.length} работ`}
        </Button>
      )}
      {history.length > 1 && showHistory && (
        <Card>
          <Txt size={22} weight="600">
            История по разделам
          </Txt>
          <Txt size={13} color={colors.muted}>
            От ранней работы к последней · только сопоставимые версии.
          </Txt>
          {t.areas.map((a) => (
            <View key={a.id} style={{ gap: 9 }}>
              <Txt weight="600">{a.label}</Txt>
              {[...history].reverse().map((x) => {
                const row = x.results.find((y) => y.areaId === a.id);
                const p = percent(row);
                return (
                  <View key={x.id} style={{ gap: 5 }}>
                    <Txt size={13}>
                      {dateText(x.date)} ·{" "}
                      {p === null
                        ? "Нет данных"
                        : `${row!.correct} из ${row!.total} · ${p}%`}
                    </Txt>
                    {p !== null && (
                      <View
                        accessibilityLabel={`${p}% из 100%`}
                        style={{
                          height: 7,
                          backgroundColor: colors.light,
                          borderRadius: 4,
                        }}
                      >
                        <View
                          style={{
                            height: 7,
                            width: `${p}%`,
                            backgroundColor: colors.green,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </Card>
      )}
      <View>
        <SectionTitle title="Что повторить" />
        <Suggestions studentId={r.studentId} report={r} openTopic={openTopic} />
      </View>
    </View>
  );
}
function ProgressHistory({
  view,
  initiallyOpen,
  children,
}: {
  view: "reports" | "topics";
  initiallyOpen: boolean;
  children: React.ReactNode;
}) {
  return view === "topics" ? (
    <View style={{ gap: 16 }}>{children}</View>
  ) : (
    <Disclosure title="Все работы" icon="clock" initiallyOpen={initiallyOpen}>
      {children}
    </Disclosure>
  );
}

export function Progress({
  studentId,
  openCourse,
  openResult,
  openTopic = () => {},
  active = true,
  initialView = "reports",
  showHistoryRequest = 0,
}: {
  studentId?: string;
  openCourse?: (id: string) => void;
  openResult?: (id: string) => void;
  openTopic?: (id: string) => void;
  active?: boolean;
  initialView?: "reports" | "topics";
  showHistoryRequest?: number;
}) {
  const { colors, styles } = useUITheme();
  const { state: s, actor } = useLearning();
  const id = studentId ?? actor.id;
  const personal = actor.role === "student" && !studentId;
  const [view, setView] = useState<"activity" | "reports" | "topics">(
    personal && initialView !== "topics" ? "activity" : initialView,
  );
  const [testAttempt, setTestAttempt] = useState<string | null>(null);
  useScreenScroll(`progress:${testAttempt ?? "overview"}`);
  useEffect(() => {
    if (showHistoryRequest) setView("reports");
  }, [showHistoryRequest]);
  const [query, setQuery] = useState("");
  const [showAllReports, setShowAllReports] = useState(false);
  const [family, setFamily] = useState("");
  const [localDetail, setLocalDetail] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [masteryFilter, setMasteryFilter] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const rows = reportsFor(s, id);
  const templates = s.reportTemplates ?? [];
  const curriculum = s.topics
    .filter((t) => t.sectionId)
    .sort((a, b) => a.order! - b.order!);
  const stats = curriculum.map((t) => ({
    ...t,
    mastery: topicMastery(s, id, t.id),
  }));
  const labels: MasteryStatus[] = [
    "Ещё не проверяли",
    "Изучаю",
    "Получается",
    "Освоено",
  ];
  if (testAttempt)
    return (
      <LessonLibrary
        key={testAttempt}
        initialAttemptId={testAttempt}
        back={() => setTestAttempt(null)}
      />
    );
  if (localDetail)
    return (
      <ReportDetail
        key={localDetail}
        id={localDetail}
        back={() => setLocalDetail(null)}
        openTopic={openTopic}
      />
    );
  return (
    <View
      style={{ gap: 22, maxWidth: 1040, width: "100%", alignSelf: "center" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Txt size={32} weight="700" style={{ letterSpacing: -0.8, flex: 1 }}>
          {actor.role === "student" ? "Мой прогресс" : "Прогресс ученика"}
        </Txt>
        <Image
          source={sectionIllustrations.progress.image}
          accessible={false}
          resizeMode="contain"
          style={{ width: 88, height: 88, borderRadius: 16 }}
        />
      </View>
      <SectionTabs
        value={view}
        onChange={setView}
        options={[
          ...(personal
            ? [
                {
                  value: "activity" as const,
                  label: "Занятия",
                  icon: "sun" as const,
                },
              ]
            : []),
          { value: "reports", label: "Оценки", icon: "bar-chart-2" },
          { value: "topics", label: "Темы", icon: "grid" },
        ]}
      />
      <SoftReveal changeKey={view} active={active}>
        <View style={{ gap: 20 }}>
          {view === "activity" && (
            <>
              <LevelCard />
              {openCourse && <CourseProgress openCourse={openCourse} />}
              {lessonStorageReady && (
                <Disclosure title="Результаты тестов" icon="check-circle">
                  <TestProgress active={active} open={setTestAttempt} />
                </Disclosure>
              )}
            </>
          )}
          {view === "reports" && (
            <LatestReport
              studentId={id}
              openResult={openResult ?? setLocalDetail}
              openTopic={openTopic}
            />
          )}
          {view !== "activity" && (
            <ProgressHistory
              key={`${view}-${showHistoryRequest}`}
              view={view}
              initiallyOpen={
                view === "topics" || !!studentId || !!showHistoryRequest
              }
            >
              {view === "reports" ? (
                <>
                  {rows.length > 5 && (
                    <Disclosure title="Найти прошлую работу" icon="search">
                      <Field
                        label="Найти работу"
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Название или дата ГГГГ-ММ-ДД"
                      />
                      <View style={[styles.row, { flexWrap: "wrap" }]}>
                        <Button
                          small
                          secondary={family !== ""}
                          onPress={() => setFamily("")}
                        >
                          Все шаблоны
                        </Button>
                        {[
                          ...new Set(
                            rows.map(
                              (r) =>
                                templates.find((t) => t.id === r.templateId)!
                                  .familyId,
                            ),
                          ),
                        ].map((fid) => (
                          <Button
                            small
                            secondary={family !== fid}
                            key={fid}
                            onPress={() => setFamily(fid)}
                          >
                            {templates.find((t) => t.familyId === fid)!.name}
                          </Button>
                        ))}
                      </View>
                    </Disclosure>
                  )}
                  {!rows.length && (
                    <Card>
                      <Txt>{empty}</Txt>
                    </Card>
                  )}
                  {rows
                    .filter((r) => {
                      const t = templates.find((t) => t.id === r.templateId)!;
                      return (
                        (!family || family === t.familyId) &&
                        `${t.name} ${r.date}`
                          .toLowerCase()
                          .includes(query.toLowerCase())
                      );
                    })
                    .slice(0, showAllReports || query || family ? undefined : 3)
                    .map((r) => {
                      const t = templates.find((t) => t.id === r.templateId)!;
                      return (
                        <Card key={r.id}>
                          <View
                            style={[
                              styles.row,
                              {
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                              },
                            ]}
                          >
                            <View style={{ flex: 1, minWidth: 140, gap: 7 }}>
                              <Txt size={16} weight="600">
                                {t.name}
                              </Txt>
                              <Txt size={13} color={colors.muted}>
                                {dateText(r.date)}
                              </Txt>
                              {unseen(s, r) && (
                                <Pill tone="gold" icon="bell">
                                  Новый результат
                                </Pill>
                              )}
                              {r.demo && (
                                <Txt size={12} color={colors.muted}>
                                  Учебный пример
                                </Txt>
                              )}
                            </View>
                            <Grade report={r} template={t} />
                            <Button
                              small
                              icon="arrow-right"
                              secondary
                              onPress={() =>
                                openResult
                                  ? openResult(r.id)
                                  : setLocalDetail(r.id)
                              }
                            >
                              Посмотреть результаты
                            </Button>
                          </View>
                        </Card>
                      );
                    })}
                  {rows.length > 3 && !query && !family && (
                    <Button
                      secondary
                      onPress={() => setShowAllReports((value) => !value)}
                    >
                      {showAllReports
                        ? "Свернуть историю"
                        : `Все работы · ${rows.length}`}
                    </Button>
                  )}
                  {rows.length > 0 &&
                    !rows.some((r) => {
                      const t = templates.find((t) => t.id === r.templateId)!;
                      return (
                        (!family || family === t.familyId) &&
                        `${t.name} ${r.date}`
                          .toLowerCase()
                          .includes(query.toLowerCase())
                      );
                    }) && (
                      <Txt>
                        Работы не найдены. Измените поиск или выберите все
                        шаблоны.
                      </Txt>
                    )}
                  {s.assessments.some(
                    (a) => a.studentId === id && a.status === "published",
                  ) && (
                    <Card>
                      <Button secondary onPress={() => setLegacy(!legacy)}>
                        {legacy
                          ? "Скрыть архив"
                          : "Архив прежних работ с баллами"}
                      </Button>
                      {legacy && (
                        <>
                          <Txt size={13} color={colors.muted}>
                            В старых записях сохранены баллы за задания. Оценка
                            учителя и число правильных ответов неизвестны,
                            поэтому эти записи не смешиваются с новыми работами.
                          </Txt>
                          {s.assessments
                            .filter(
                              (a) =>
                                a.studentId === id && a.status === "published",
                            )
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((a) => {
                              const t = s.templates.find(
                                (t) => t.id === a.templateId,
                              )!;
                              const score = assessmentScore(s, a);
                              return (
                                <View key={a.id} style={{ gap: 7 }}>
                                  <Txt weight="600">
                                    {t.name} · {dateText(a.date)}
                                  </Txt>
                                  <Txt>
                                    Баллы: {score.earned} из {score.max}
                                  </Txt>
                                  {t.questions.map((q) => {
                                    const m = a.marks.find(
                                      (m) => m.questionId === q.id,
                                    );
                                    return (
                                      <Txt
                                        size={12}
                                        color={colors.muted}
                                        key={q.id}
                                      >
                                        {q.label}:{" "}
                                        {m?.earned == null
                                          ? "Нет данных"
                                          : `${m.earned} из ${q.max} баллов`}
                                      </Txt>
                                    );
                                  })}
                                </View>
                              );
                            })}
                        </>
                      )}
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Card style={{ backgroundColor: colors.light }}>
                    <Txt size={25} weight="600">
                      Освоено{" "}
                      {
                        stats.filter((t) => t.mastery.status === "Освоено")
                          .length
                      }{" "}
                      из {stats.length} тем
                    </Txt>
                    <Txt size={13} color={colors.muted}>
                      По самостоятельным проверкам
                    </Txt>
                  </Card>
                  <Disclosure title="Что значат отметки?" icon="info">
                    <Txt size={14}>
                      Ещё не проверяли — нет самостоятельных ответов по теме.
                      Изучаю — ответы уже есть, но подтверждений пока мало.
                      Получается — успешно пройдена самостоятельная проверка.
                      Освоено — успех подтверждён повторно спустя время.
                    </Txt>
                    <Txt size={13} color={colors.muted}>
                      Просмотр урока — отдельная активность. Общий балл за
                      раздел не подтверждает каждую связанную тему.
                    </Txt>
                    <Button
                      small
                      secondary
                      onPress={() => setShowRules(!showRules)}
                    >
                      {showRules
                        ? "Скрыть правила"
                        : "Как определяем состояние темы"}
                    </Button>
                    {showRules && (
                      <Txt size={13} color={colors.muted}>
                        Правила первой версии: минимум{" "}
                        {masteryPolicy.minQuestions} новых самостоятельных
                        вопросов; «Получается» — от{" "}
                        {masteryPolicy.proficientRatio * 100}% правильных.
                        «Освоено» — {masteryPolicy.confirmations} проверки от{" "}
                        {masteryPolicy.masteredRatio * 100}% с интервалом от{" "}
                        {masteryPolicy.spacingDays} дней. Последняя проверка
                        тоже должна быть успешной. Это ориентир приложения.
                      </Txt>
                    )}
                  </Disclosure>
                  <View style={[styles.row, { flexWrap: "wrap" }]}>
                    <Button
                      small
                      secondary={masteryFilter !== ""}
                      onPress={() => setMasteryFilter("")}
                    >
                      Все темы
                    </Button>
                    {labels.map((label) => (
                      <Button
                        small
                        key={label}
                        secondary={masteryFilter !== label}
                        onPress={() => setMasteryFilter(label)}
                      >
                        {label} ·{" "}
                        {stats.filter((t) => t.mastery.status === label).length}
                      </Button>
                    ))}
                  </View>
                  {stats
                    .filter(
                      (t) =>
                        !masteryFilter || t.mastery.status === masteryFilter,
                    )
                    .slice(0, showAllTopics ? undefined : 6)
                    .map((t) => (
                      <Pressable
                        key={t.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${t.title}. ${t.mastery.status}. Открыть тему`}
                        onPress={() => openTopic(t.id)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          gap: 14,
                          alignItems: "center",
                          paddingVertical: 16,
                          borderBottomWidth: 1,
                          borderColor: colors.line,
                          opacity: pressed ? 0.65 : 1,
                        })}
                      >
                        <Icon
                          name={
                            t.mastery.status === "Освоено"
                              ? "check-circle"
                              : t.mastery.status === "Получается"
                                ? "trending-up"
                                : t.mastery.status === "Изучаю"
                                  ? "clock"
                                  : "circle"
                          }
                          color={colors.green}
                        />
                        <View style={{ flex: 1, gap: 5 }}>
                          <Txt weight="600">{t.title}</Txt>
                          <Txt size={12} color={colors.muted}>
                            {t.mastery.status}
                          </Txt>
                        </View>
                        <Icon name="chevron-right" size={17} />
                      </Pressable>
                    ))}
                  {stats.filter(
                    (t) => !masteryFilter || t.mastery.status === masteryFilter,
                  ).length > 6 && (
                    <Button
                      secondary
                      small
                      onPress={() => setShowAllTopics(!showAllTopics)}
                    >
                      {showAllTopics ? "Свернуть" : "Показать все темы"}
                    </Button>
                  )}
                  {!stats.some(
                    (t) => !masteryFilter || t.mastery.status === masteryFilter,
                  ) && (
                    <Card>
                      <Txt>
                        Тем с таким состоянием пока нет. Все темы доступны в
                        разделе «Учёба».
                      </Txt>
                    </Card>
                  )}
                </>
              )}
            </ProgressHistory>
          )}
        </View>
      </SoftReveal>
    </View>
  );
}
