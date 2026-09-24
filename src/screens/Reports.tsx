import { MyGroups } from "../components/Groups";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
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
  return (
    <View style={{ gap: 2 }}>
      <Txt size={12} color={colors.muted}>
        Оценка
      </Txt>
      <Txt size={36} weight="700">
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
  const { state: s } = useLearning();
  const rows = reviewSuggestions(s, studentId, report);
  return (
    <View style={{ gap: 12 }}>
      {rows.length ? (
        rows.map((row) => {
          const t = s.topics.find((t) => t.id === row.topicId)!;
          return (
            <Card key={t.id} style={{ backgroundColor: "#F7F8F3" }}>
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
}: {
  openTopic: (id: string) => void;
  navigate: (tab: string) => void;
  openResult: (id: string) => void;
}) {
  const { state: s, actor } = useLearning();
  const latest = reportsFor(s, actor.id)[0];
  const template = s.reportTemplates?.find((t) => t.id === latest?.templateId);
  const homework = s.assignments.filter(
    (a) => a.studentId === actor.id && !a.completedAt,
  );
  const activity = s.activities
    .filter(
      (a) =>
        a.studentId === actor.id &&
        a.stage !== "complete" &&
        s.topics.some((t) => t.id === a.topicId && hasMaterial(t)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Txt size={30} weight="600">
          Главная
        </Txt>
        <Txt color={colors.muted}>
          Радуемся каждому шагу, {actor.name.split(" ")[0]}.
        </Txt>
      </View>
      <MyGroups />
      <View>
        <SectionTitle title="Домашнее задание" />
        <Card
          style={{
            padding: 18,
            gap: 10,
            borderColor: "#B5C7AD",
            backgroundColor: "#F0F4E9",
          }}
        >
          {homework.length ? (
            <>
              <Pill>Задано учителем · {homework.length}</Pill>
              {homework.map((a) => (
                <View key={a.id} style={{ gap: 9 }}>
                  <Txt weight="600">
                    {s.topics.find((t) => t.id === a.topicId)?.title}
                  </Txt>
                  <Txt size={13} color={colors.muted}>
                    {a.classId
                      ? `Для группы: ${s.classes.find((c) => c.id === a.classId)?.name ?? a.className ?? "Группа"}`
                      : "Ранее выданное задание"}
                  </Txt>
                  <Txt size={14}>{a.reason}</Txt>
                  <Button onPress={() => openTopic(a.topicId)}>
                    Открыть задание
                  </Button>
                </View>
              ))}
            </>
          ) : (
            <Txt>
              На сегодня заданий нет. Можно продолжить учёбу в своём темпе.
            </Txt>
          )}
        </Card>
      </View>
      <View>
        <SectionTitle
          title="Последняя работа"
          action="Все работы"
          onPress={() => navigate("Progress")}
        />
        <Card>
          {latest && template ? (
            <>
              <View
                style={[
                  styles.row,
                  {
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View style={{ flex: 1, minWidth: 160, gap: 8 }}>
                  <Txt size={20} weight="600">
                    {template.name}
                  </Txt>
                  <Txt size={13} color={colors.muted}>
                    {dateText(latest.date)}
                  </Txt>
                  {unseen(s, latest) && (
                    <Pill tone="gold">Новый результат</Pill>
                  )}
                  {latest.demo && (
                    <Txt size={12} color={colors.muted}>
                      Учебный пример
                    </Txt>
                  )}
                </View>
                <Grade report={latest} template={template} />
              </View>
              <Button onPress={() => openResult(latest.id)}>
                Посмотреть результаты
              </Button>
            </>
          ) : (
            <Txt>{empty}</Txt>
          )}
        </Card>
      </View>
      <View>
        <SectionTitle title="Продолжить учёбу" />
        <Card>
          {activity ? (
            <>
              <Txt weight="600">
                {s.topics.find((t) => t.id === activity.topicId)?.title}
              </Txt>
              <Txt size={14} color={colors.muted}>
                Вернитесь к уроку и продолжите с сохранённого места.
              </Txt>
              <Button onPress={() => openTopic(activity.topicId)}>
                Продолжить
              </Button>
            </>
          ) : (
            <>
              <Txt>Выберите тему: уроки и практика доступны всем.</Txt>
              <Button onPress={() => navigate("Learn")}>
                Уроки и практика
              </Button>
            </>
          )}
        </Card>
      </View>
      <View>
        <SectionTitle title="Что повторить" />
        <Txt size={13} color={colors.muted} style={{ marginBottom: 12 }}>
          По желанию · подсказки по результатам, а не домашнее задание.
        </Txt>
        <Suggestions studentId={actor.id} openTopic={openTopic} />
      </View>
    </View>
  );
}
export const Learn = ({ openTopic }: { openTopic: (id: string) => void }) => (
  <TopicTree openTopic={openTopic} />
);

function ResultRadar({
  template,
  report,
  earlier,
}: {
  template: ReportTemplate;
  report: TeacherReport;
  earlier?: TeacherReport;
}) {
  const n = template.areas.length;
  const point = (i: number, value: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return [
      160 + Math.cos(angle) * value * 1.12,
      150 + Math.sin(angle) * value * 1.12,
    ];
  };
  const shape = (r: TeacherReport) =>
    template.areas.map((a, i) => {
      const value = percent(r.results.find((x) => x.areaId === a.id));
      return value === null ? null : point(i, value);
    });
  const enough = report.results.filter((x) => percent(x) !== null).length >= 3;
  if (!enough)
    return (
      <Txt size={14} color={colors.muted}>
        Для диаграммы нужны результаты хотя бы по трём разделам. Все доступные
        результаты показаны выше.
      </Txt>
    );
  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <Svg
        width="100%"
        height={300}
        viewBox="0 0 320 300"
        accessibilityLabel="Результаты по разделам, шкала от 0 до 100 процентов. Номера соответствуют списку выше. Зелёный — выбранная работа, пунктир — предыдущая. Значения доступны текстом."
      >
        {[25, 50, 75, 100].map((v) => (
          <Polygon
            key={v}
            points={template.areas
              .map((_, i) => point(i, v).join(","))
              .join(" ")}
            stroke="#CCD5C5"
            strokeWidth={1}
            fill="none"
          />
        ))}
        {template.areas.map((a, i) => {
          const [x, y] = point(i, 100);
          const [tx, ty] = point(i, 118);
          return (
            <React.Fragment key={a.id}>
              <Line x1={160} y1={150} x2={x} y2={y} stroke="#DFE5DA" />
              <SvgText
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                fill={colors.ink}
                fontSize={12}
              >
                {i + 1}
              </SvgText>
            </React.Fragment>
          );
        })}
        {[...(earlier ? [earlier] : []), report].map((r, j) => {
          const points = shape(r);
          const current = r.id === report.id;
          return (
            <React.Fragment key={r.id}>
              {points.every(Boolean) && (
                <Polygon
                  points={points.map((p) => p!.join(",")).join(" ")}
                  stroke={current ? colors.green : "#A66E3D"}
                  strokeWidth={2}
                  strokeDasharray={current ? undefined : "5 4"}
                  fill={current ? "#355B461A" : "none"}
                />
              )}
              {points.map(
                (p, i) =>
                  p && (
                    <Circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={current ? 4 : 3}
                      fill={current ? colors.green : "#A66E3D"}
                    />
                  ),
              )}
            </React.Fragment>
          );
        })}
        <SvgText x={164} y={146} fontSize={10} fill={colors.muted}>
          0
        </SvgText>
        <SvgText x={165} y={35} fontSize={10} fill={colors.muted}>
          100%
        </SvgText>
      </Svg>
      <Txt size={12} color={colors.muted}>
        Шкала 0–100% · номера разделов — в списке выше.
        {earlier
          ? " Сплошная линия — эта работа, пунктир — выбранная ранняя."
          : ""}{" "}
        Пропуски не соединяются и не считаются нулём.
      </Txt>
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
    <View style={{ gap: 24 }}>
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
              {dateText(r.date)} · версия {t.version}
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
      <Card>
        <Txt size={22} weight="600">
          Сравнение работ
        </Txt>
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
      </Card>
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
                          backgroundColor: "#EEF1E8",
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
export function Progress({
  studentId,
  openResult,
  openTopic = () => {},
  initialView = "reports",
  showHistoryRequest = 0,
}: {
  studentId?: string;
  openResult?: (id: string) => void;
  openTopic?: (id: string) => void;
  initialView?: "reports" | "topics";
  showHistoryRequest?: number;
}) {
  const { state: s, actor } = useLearning();
  const id = studentId ?? actor.id;
  const [view, setView] = useState(initialView);
  useEffect(() => {
    if (showHistoryRequest) setView("reports");
  }, [showHistoryRequest]);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [localDetail, setLocalDetail] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [masteryFilter, setMasteryFilter] = useState("");
  const [showRules, setShowRules] = useState(false);
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
    <View style={{ gap: 24 }}>
      <Txt size={30} weight="600">
        Прогресс
      </Txt>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          selected={view === "reports"}
          secondary={view !== "reports"}
          onPress={() => setView("reports")}
        >
          Результаты работ
        </Button>
        <Button
          selected={view === "topics"}
          secondary={view !== "topics"}
          onPress={() => setView("topics")}
        >
          Изучение тем
        </Button>
      </View>
      {view === "reports" ? (
        <>
          <Txt color={colors.muted}>
            Оценки учителя и правильные ответы по разделам каждой работы.
          </Txt>
          {rows.length > 5 && (
            <Card>
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
                        templates.find((t) => t.id === r.templateId)!.familyId,
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
            </Card>
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
                      <Txt size={19} weight="600">
                        {t.name}
                      </Txt>
                      <Txt size={13} color={colors.muted}>
                        {dateText(r.date)} · версия {t.version}
                      </Txt>
                      {unseen(s, r) && <Pill tone="gold">Новый результат</Pill>}
                      {r.demo && (
                        <Txt size={12} color={colors.muted}>
                          Учебный пример
                        </Txt>
                      )}
                    </View>
                    <Grade report={r} template={t} />
                  </View>
                  <Button
                    secondary
                    onPress={() =>
                      openResult ? openResult(r.id) : setLocalDetail(r.id)
                    }
                  >
                    Посмотреть результаты
                  </Button>
                </Card>
              );
            })}
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
                Работы не найдены. Измените поиск или выберите все шаблоны.
              </Txt>
            )}
          {s.assessments.some(
            (a) => a.studentId === id && a.status === "published",
          ) && (
            <Card>
              <Button secondary onPress={() => setLegacy(!legacy)}>
                {legacy ? "Скрыть архив" : "Архив прежних работ с баллами"}
              </Button>
              {legacy && (
                <>
                  <Txt size={13} color={colors.muted}>
                    В старых записях сохранены баллы за задания. Оценка учителя
                    и число правильных ответов неизвестны, поэтому эти записи не
                    смешиваются с новыми работами.
                  </Txt>
                  {s.assessments
                    .filter(
                      (a) => a.studentId === id && a.status === "published",
                    )
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((a) => {
                      const t = s.templates.find((t) => t.id === a.templateId)!;
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
                              <Txt size={12} color={colors.muted} key={q.id}>
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
              {stats.filter((t) => t.mastery.status === "Освоено").length} из{" "}
              {stats.length} тем
            </Txt>
            <Txt size={14}>
              Это охват основной программы, а не оценка математических
              способностей. Дополнительная практика в этот счётчик не входит.
            </Txt>
          </Card>
          <Card>
            <Txt weight="600">Как читать состояния</Txt>
            <Txt size={14}>
              Ещё не проверяли — нет самостоятельных ответов по теме. Изучаю —
              ответы уже есть, но подтверждений пока мало. Получается — успешно
              пройдена самостоятельная проверка. Освоено — успех подтверждён
              повторно спустя время.
            </Txt>
            <Txt size={13} color={colors.muted}>
              Просмотр урока — отдельная активность. Общий балл за раздел не
              подтверждает каждую связанную тему.
            </Txt>
            <Button small secondary onPress={() => setShowRules(!showRules)}>
              {showRules ? "Скрыть правила" : "Как определяем состояние темы"}
            </Button>
            {showRules && (
              <Txt size={13} color={colors.muted}>
                Правила первой версии: минимум {masteryPolicy.minQuestions}{" "}
                новых самостоятельных вопросов; «Получается» — от{" "}
                {masteryPolicy.proficientRatio * 100}% правильных. «Освоено» —{" "}
                {masteryPolicy.confirmations} проверки от{" "}
                {masteryPolicy.masteredRatio * 100}% с интервалом от{" "}
                {masteryPolicy.spacingDays} дней. Последняя проверка тоже должна
                быть успешной. Это ориентир приложения.
              </Txt>
            )}
          </Card>
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
            .filter((t) => !masteryFilter || t.mastery.status === masteryFilter)
            .map((t) => (
              <Card key={t.id}>
                <Txt weight="600">
                  {t.order}. {t.title}
                </Txt>
                <Pill
                  tone={
                    t.mastery.status === "Ещё не проверяли"
                      ? "neutral"
                      : "green"
                  }
                >
                  {t.mastery.status}
                </Pill>
                <Txt size={13} color={colors.muted}>
                  {t.mastery.count
                    ? `Ответов по теме: ${t.mastery.count}`
                    : t.mastery.visited
                      ? "Урок открывали · проверку ещё не проходили"
                      : "Самостоятельных ответов пока нет"}
                </Txt>
                <Button secondary small onPress={() => openTopic(t.id)}>
                  Открыть тему
                </Button>
              </Card>
            ))}
          {!stats.some(
            (t) => !masteryFilter || t.mastery.status === masteryFilter,
          ) && (
            <Card>
              <Txt>
                Тем с таким состоянием пока нет. Все темы доступны в разделе
                «Учёба».
              </Txt>
            </Card>
          )}
        </>
      )}
    </View>
  );
}
