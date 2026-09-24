import { GroupPicker, StudentPicker } from "../components/Groups";
import { groupStudents, teachingGroups } from "../core/groups";
import { errorMessage } from "../i18n/errors";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { ReportTemplate, TeacherReport, ReportArea } from "../core/types";
import { uid } from "../core/ids";
import { validateReport, validateReportTemplate } from "../core/reports";
import {
  Button,
  Card,
  Choice,
  Field,
  Pill,
  Txt,
  colors,
  styles,
  dateText,
} from "../components/ui";

export function TeacherReports({
  classId,
  onScreenChange,
  onGroupChange,
  startNew = false,
  back,
}: {
  onScreenChange: () => void;
  classId: string;
  onGroupChange: (id: string) => void;
  startNew?: boolean;
  back?: () => void;
}) {
  const { state: s, actor } = useLearning();
  const group = teachingGroups(s, actor).find((c) => c.id === classId);
  const [selection, setSelection] = useState({ classId: "", studentId: "" });
  const student =
    selection.classId === classId
      ? groupStudents(s, classId).find((p) => p.id === selection.studentId)
      : undefined;
  const templates = s.reportTemplates ?? [];
  const [edit, setEdit] = useState<TeacherReport | null>(null);
  const [creating, setCreating] = useState(startNew);
  const [templateEdit, setTemplateEdit] = useState<
    ReportTemplate | null | undefined
  >(undefined);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(onScreenChange);
    return () => cancelAnimationFrame(frame);
  }, [onScreenChange, edit, creating, templateEdit, classId, student?.id]);
  const reports = (s.reports ?? [])
    .filter((r) => r.studentId === student?.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const matches = reports.filter((r) =>
    `${templates.find((t) => t.id === r.templateId)?.name} ${r.date} ${dateText(r.date)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  function chooseGroup(id: string) {
    onGroupChange(id);
    setSelection({ classId: id, studentId: "" });
    setEdit(null);
    setCreating(false);
    setShowHistory(false);
    setQuery("");
    setNotice("");
  }
  if (templateEdit !== undefined)
    return (
      <TemplateEditor
        source={templateEdit}
        close={() => setTemplateEdit(undefined)}
      />
    );
  if (group && student && (edit || creating))
    return (
      <ReportEditor
        key={edit?.id ?? `new:${student.id}`}
        onScreenChange={onScreenChange}
        existing={edit}
        studentId={student.id}
        className={group.name}
        close={(saved) => {
          setEdit(null);
          setCreating(false);
          if (saved)
            setNotice(
              "Результат сохранён. Опубликованная работа доступна ученику, черновик — только преподавателям.",
            );
        }}
      />
    );
  return (
    <View style={{ gap: 20 }}>
      {back && (
        <Button secondary onPress={back}>
          Назад к обзору
        </Button>
      )}
      <Txt size={30} weight="600">
        Результаты тестов
      </Txt>
      <Txt color={colors.muted}>
        Выберите группу и ученика. Затем добавьте результат или откройте нужную
        работу для исправления.
      </Txt>
      <GroupPicker value={group?.id ?? ""} onChange={chooseGroup} />
      {group && (
        <StudentPicker
          key={group.id}
          classId={group.id}
          value={student?.id ?? ""}
          onChange={(studentId) => {
            setSelection({ classId, studentId });
            setEdit(null);
            setQuery("");
            setShowHistory(false);
            setNotice("");
          }}
        />
      )}
      {student && (
        <>
          {!!notice && <Txt accessibilityRole="alert">{notice}</Txt>}
          <Txt size={22} weight="600">
            3. Работы · {student.name}
          </Txt>
          <Button onPress={() => setCreating(true)}>
            Добавить результат теста
          </Button>
          {!!reports.length && (
            <Field
              label="Найти работу ученика"
              value={query}
              onChangeText={setQuery}
              placeholder="Название или дата"
            />
          )}
          {matches.map((r) => (
            <Card key={r.id}>
              <Txt size={20} weight="600">
                {templates.find((t) => t.id === r.templateId)?.name}
              </Txt>
              <Txt>
                {dateText(r.date)} · Оценка: {r.grade}
              </Txt>
              <Pill>
                {r.status === "published"
                  ? "Виден ученику"
                  : "Черновик · ученик не видит"}
              </Pill>
              <Button secondary onPress={() => setEdit(r)}>
                {r.status === "published"
                  ? "Исправить результат"
                  : "Продолжить черновик"}
              </Button>
            </Card>
          ))}
          {!matches.length && (
            <Card>
              <Txt>
                {reports.length
                  ? "Работы не найдены. Измените запрос."
                  : "У этого ученика пока нет результатов тестов."}
              </Txt>
            </Card>
          )}
          <Button secondary small onPress={() => setShowHistory(!showHistory)}>
            {showHistory
              ? "Скрыть историю изменений"
              : "История изменений ученика"}
          </Button>
          {showHistory && (
            <Card>
              <Txt size={20} weight="600">
                История изменений
              </Txt>
              {s.audit
                .filter(
                  (a) =>
                    a.action === "report.saved" &&
                    (a.after as TeacherReport)?.studentId === student.id,
                )
                .slice()
                .reverse()
                .slice(0, 20)
                .map((a) => (
                  <View key={a.id} style={{ gap: 5 }}>
                    <Txt>
                      {dateText(a.at)} ·{" "}
                      {
                        templates.find(
                          (t) => t.id === (a.after as TeacherReport).templateId,
                        )?.name
                      }
                    </Txt>
                    <Txt size={13}>
                      Оценка: {(a.before as TeacherReport | null)?.grade ?? "—"}{" "}
                      → {(a.after as TeacherReport).grade}
                    </Txt>
                    <Txt size={13} color={colors.muted}>
                      {a.reason ||
                        ((a.after as TeacherReport).status === "draft"
                          ? "Сохранён черновик"
                          : "Добавлен результат")}
                    </Txt>
                  </View>
                ))}
              {!s.audit.some(
                (a) =>
                  a.action === "report.saved" &&
                  (a.after as TeacherReport)?.studentId === student.id,
              ) && <Txt>Изменений пока нет.</Txt>}
            </Card>
          )}
        </>
      )}
      <Button secondary small onPress={() => setShowTemplates(!showTemplates)}>
        {showTemplates
          ? "Скрыть настройки шаблонов"
          : "Настроить шаблоны тестов"}
      </Button>
      {showTemplates && (
        <Card>
          <Txt size={22} weight="600">
            Шаблоны тестов
          </Txt>
          <Txt color={colors.muted}>
            Шаблон задаёт разделы теста и шкалу оценки. Для обычного внесения
            результатов используйте уже готовый шаблон.
          </Txt>
          <Button secondary onPress={() => setTemplateEdit(null)}>
            Создать шаблон теста
          </Button>
          {templates
            .filter(
              (t) =>
                !templates.some(
                  (x) => x.familyId === t.familyId && x.version > t.version,
                ),
            )
            .map((t) => (
              <View key={t.id} style={{ gap: 8 }}>
                <Txt weight="600">
                  {t.name} · версия {t.version}
                </Txt>
                <Txt size={13}>
                  Разделов: {t.areas.length} · шкала {t.scale.min}–{t.scale.max}
                </Txt>
                <Button secondary small onPress={() => setTemplateEdit(t)}>
                  Создать новую версию
                </Button>
              </View>
            ))}
          {!templates.length && (
            <Txt>Добавьте первый шаблон, чтобы вносить результаты.</Txt>
          )}
        </Card>
      )}
    </View>
  );
}
function ReportEditor({
  onScreenChange,
  existing,
  studentId,
  className,
  close,
}: {
  onScreenChange: () => void;
  existing: TeacherReport | null;
  studentId: string;
  className: string;
  close: (saved?: boolean) => void;
}) {
  const { state: s, actor, dispatch, saving } = useLearning();
  const templates = s.reportTemplates ?? [];
  const [tid, setTid] = useState(existing?.templateId ?? "");
  const t = templates.find((t) => t.id === tid);
  const sid = existing?.studentId ?? studentId;
  const [review, setReview] = useState(false);
  const [allVersions, setAllVersions] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(onScreenChange);
    return () => cancelAnimationFrame(frame);
  }, [review, onScreenChange]);
  const [date, setDate] = useState(
    existing?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [grade, setGrade] = useState(existing ? String(existing.grade) : "");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [values, setValues] = useState<
    Record<string, { correct: string; total: string }>
  >(() =>
    Object.fromEntries(
      existing?.results.map((r) => [
        r.areaId,
        {
          correct: r.correct === null ? "" : String(r.correct),
          total: r.total === null ? "" : String(r.total),
        },
      ]) ?? [],
    ),
  );
  const [recordId] = useState(existing?.id ?? uid());
  function buildReport(status: "draft" | "published") {
    if (!t) throw Error("Сначала создайте шаблон работы.");
    if (!grade.trim()) throw Error("Укажите оценку учителя.");
    const r: TeacherReport = {
      id: recordId,
      studentId: sid,
      templateId: t.id,
      date,
      grade: Number(grade.replace(",", ".")),
      results: t.areas.map((a) => ({
        areaId: a.id,
        correct: values[a.id]?.correct.trim()
          ? Number(values[a.id].correct)
          : null,
        total: values[a.id]?.total.trim() ? Number(values[a.id].total) : null,
      })),
      status,
      revision: existing?.revision ?? 0,
      authorId: actor.id,
      updatedAt: new Date().toISOString(),
    };
    validateReport(r, t);
    return r;
  }
  function preview() {
    try {
      buildReport("published");
      if (existing?.status === "published" && !reason.trim())
        throw Error("Напишите причину исправления.");
      setNotice("");
      setReview(true);
    } catch (e) {
      setNotice(errorMessage(e));
      onScreenChange();
    }
  }
  async function save(status: "draft" | "published") {
    try {
      const r = buildReport(status);
      await dispatch({
        type: "saveReport",
        report: r,
        expectedRevision: existing?.revision ?? 0,
        reason,
      });
      close(true);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  return (
    <View style={{ gap: 20 }}>
      <Button secondary disabled={saving} onPress={() => close()}>
        Назад к работам
      </Button>
      <Txt size={28} weight="600">
        {review
          ? "Проверьте перед сохранением"
          : existing
            ? "Исправление результата"
            : "Новый результат теста"}
      </Txt>
      {Boolean(notice) && (
        <Txt color={colors.red} accessibilityRole="alert">
          {notice}
        </Txt>
      )}
      <Card style={{ backgroundColor: colors.light }}>
        <Txt size={13} color={colors.muted}>
          {className}
        </Txt>
        <Txt size={24} weight="600">
          {s.profiles.find((p) => p.id === sid)?.name}
        </Txt>
        <Txt size={13}>
          {existing
            ? `Работа от ${dateText(existing.date)} · ${existing.status === "published" ? "опубликована" : "черновик"}`
            : "Результат будет сохранён этому ученику."}
        </Txt>
      </Card>
      {review && t ? (
        <>
          <Card>
            <Txt size={22} weight="600">
              {t.name}
            </Txt>
            <Txt>Дата: {dateText(date)}</Txt>
            <Txt size={22} weight="600">
              Оценка: {grade} из {t.scale.max}
            </Txt>
            {existing && (
              <Txt color={colors.muted}>До изменения: {existing.grade}</Txt>
            )}
            {t.areas.map((a) => (
              <Txt key={a.id}>
                {a.label}:{" "}
                {values[a.id]?.correct.trim()
                  ? `${values[a.id].correct} из ${values[a.id].total}`
                  : "нет данных"}
              </Txt>
            ))}
            {!!reason.trim() && <Txt>Причина: {reason}</Txt>}
            <Txt color={colors.muted}>
              После публикации ученик увидит результат в разделе «Прогресс».
            </Txt>
          </Card>
          <Button disabled={saving} onPress={() => void save("published")}>
            {saving
              ? "Сохраняем…"
              : existing?.status === "published"
                ? "Сохранить исправление"
                : "Опубликовать результат"}
          </Button>
          {existing?.status !== "published" && (
            <Button
              secondary
              disabled={saving}
              onPress={() => void save("draft")}
            >
              Сохранить как черновик
            </Button>
          )}
          <Button secondary disabled={saving} onPress={() => setReview(false)}>
            Вернуться к редактированию
          </Button>
        </>
      ) : (
        <>
          {!existing && (
            <Card>
              <Txt size={22} weight="600">
                1. Выберите тест
              </Txt>
              {templates
                .filter(
                  (candidate) =>
                    allVersions ||
                    !templates.some(
                      (x) =>
                        x.familyId === candidate.familyId &&
                        x.version > candidate.version,
                    ),
                )
                .map((candidate) => (
                  <Choice
                    key={candidate.id}
                    label={`${candidate.name} · шкала ${candidate.scale.min}–${candidate.scale.max} · версия ${candidate.version}`}
                    selected={tid === candidate.id}
                    onPress={() => {
                      setTid(candidate.id);
                      setValues({});
                      setGrade("");
                    }}
                  />
                ))}
              {templates.some((candidate) =>
                templates.some(
                  (x) =>
                    x.familyId === candidate.familyId &&
                    x.version > candidate.version,
                ),
              ) && (
                <Button
                  secondary
                  small
                  onPress={() => setAllVersions(!allVersions)}
                >
                  {allVersions
                    ? "Скрыть прежние версии"
                    : "Выбрать прежнюю версию теста"}
                </Button>
              )}
              {!templates.length && (
                <Txt>
                  Шаблонов пока нет. Вернитесь к работам и откройте «Настроить
                  шаблоны тестов».
                </Txt>
              )}
            </Card>
          )}
          {t ? (
            <>
              <Card>
                <Txt weight="600">
                  {existing ? "1. Дата и оценка" : "2. Дата и оценка"} ·{" "}
                  {t.name}
                </Txt>
                <Field
                  label="Дата работы (ГГГГ-ММ-ДД)"
                  value={date}
                  onChangeText={setDate}
                />
                <Field
                  label={`Оценка учителя (${t.scale.min}–${t.scale.max}, шаг ${t.scale.step})`}
                  value={grade}
                  numeric
                  onChangeText={setGrade}
                />
              </Card>
              <Card>
                <Txt size={22} weight="600">
                  {existing ? "2. Ответы по разделам" : "3. Ответы по разделам"}
                </Txt>
                <Txt size={14} color={colors.muted}>
                  Нет данных — оставьте оба поля пустыми. Ноль правильных
                  ответов — укажите 0 и общее число вопросов. Не складываем
                  разные разделы: вопросы могут пересекаться.
                </Txt>
                {t.areas.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      gap: 10,
                      borderTopWidth: 1,
                      borderColor: colors.line,
                      paddingTop: 16,
                    }}
                  >
                    <Txt weight="600">{a.label}</Txt>
                    {existing && (
                      <Txt size={13} color={colors.muted}>
                        Было:{" "}
                        {existing.results.find((r) => r.areaId === a.id)
                          ?.correct ?? "—"}{" "}
                        из{" "}
                        {existing.results.find((r) => r.areaId === a.id)
                          ?.total ?? "—"}
                      </Txt>
                    )}
                    <Txt size={13} color={colors.muted}>
                      {a.definition}
                    </Txt>
                    <View
                      style={[
                        styles.row,
                        { alignItems: "flex-start", flexWrap: "wrap" },
                      ]}
                    >
                      {(["correct", "total"] as const).map((k) => (
                        <View style={{ flex: 1, minWidth: 120 }} key={k}>
                          <Field
                            label={`${k === "correct" ? "Правильно" : "Всего вопросов"} · ${a.label}`}
                            numeric
                            value={values[a.id]?.[k] ?? ""}
                            onChangeText={(v) =>
                              setValues({
                                ...values,
                                [a.id]: {
                                  correct: values[a.id]?.correct ?? "",
                                  total: values[a.id]?.total ?? "",
                                  [k]: v,
                                },
                              })
                            }
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </Card>
              {existing?.status === "published" && (
                <Field
                  label="Причина исправления"
                  value={reason}
                  onChangeText={setReason}
                />
              )}
              <Button disabled={saving || !sid} onPress={preview}>
                Проверить и сохранить
              </Button>
            </>
          ) : (
            <Card>
              <Txt>
                Выберите тест выше, чтобы заполнить дату, оценку и ответы по
                разделам.
              </Txt>
            </Card>
          )}
        </>
      )}
    </View>
  );
}
function TemplateEditor({
  source,
  close,
}: {
  source: ReportTemplate | null;
  close: () => void;
}) {
  const { state: s, dispatch, saving } = useLearning();
  const [id] = useState(uid());
  const [name, setName] = useState(source?.name ?? "");
  const [min, setMin] = useState(String(source?.scale.min ?? 1));
  const [max, setMax] = useState(String(source?.scale.max ?? 5));
  const [step, setStep] = useState(String(source?.scale.step ?? 1));
  const [areas, setAreas] = useState<ReportArea[]>(
    source ? JSON.parse(JSON.stringify(source.areas)) : [],
  );
  const [notice, setNotice] = useState("");
  const patch = (index: number, patch: Partial<ReportArea>) =>
    setAreas(areas.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  async function save() {
    try {
      const t: ReportTemplate = {
        id,
        familyId: source?.familyId ?? id,
        name,
        version: source
          ? Math.max(
              ...(s.reportTemplates ?? [])
                .filter((t) => t.familyId === source.familyId)
                .map((t) => t.version),
            ) + 1
          : 1,
        scale: { min: Number(min), max: Number(max), step: Number(step) },
        areas,
      };
      if (!min.trim() || !max.trim() || !step.trim())
        throw Error("Заполните шкалу оценки.");
      validateReportTemplate(t, s.topics);
      await dispatch({ type: "saveReportTemplate", template: t });
      close();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  return (
    <View style={{ gap: 20 }}>
      <Button secondary onPress={close}>
        Назад к работам
      </Button>
      <Txt size={28} weight="600">
        {source ? "Новая версия шаблона" : "Новый шаблон"}
      </Txt>
      <Txt color={colors.muted}>
        Опишите, что проверяется в каждом разделе. При изменении содержания,
        названий, связей или шкалы новая версия будет иметь отдельную историю
        сравнения.
      </Txt>
      {Boolean(notice) && (
        <Txt color={colors.red} accessibilityRole="alert">
          {notice}
        </Txt>
      )}
      <Card>
        <Field label="Название работы" value={name} onChangeText={setName} />
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {[
            { label: "Минимум оценки", value: min, set: setMin },
            { label: "Максимум оценки", value: max, set: setMax },
            { label: "Шаг оценки", value: step, set: setStep },
          ].map((x) => (
            <View key={x.label} style={{ flex: 1, minWidth: 130 }}>
              <Field
                label={x.label}
                value={x.value}
                onChangeText={x.set}
                numeric
              />
            </View>
          ))}
        </View>
      </Card>
      {areas.map((a, i) => (
        <Card key={a.id}>
          <Txt size={20} weight="600">
            Раздел {i + 1}
          </Txt>
          <Field
            label={`Название раздела ${i + 1}`}
            value={a.label}
            onChangeText={(label) => patch(i, { label })}
          />
          <Field
            label={`Что проверяет раздел ${i + 1}`}
            value={a.definition}
            onChangeText={(definition) => patch(i, { definition })}
            multiline
          />
          <TopicPicker
            selected={a.topicIds}
            onChange={(topicIds) =>
              patch(i, { topicIds, scope: "area", coverageConfirmed: false })
            }
          />
          <Choice
            label="Результат относится к разделу, без вывода по каждой теме"
            selected={a.scope === "area"}
            onPress={() =>
              patch(i, { scope: "area", coverageConfirmed: false })
            }
          />
          {a.topicIds.length === 1 && (
            <Choice
              label="Подтверждаю: самостоятельная работа полностью проверяет именно эту одну тему"
              selected={a.scope === "topic"}
              onPress={() =>
                patch(i, { scope: "topic", coverageConfirmed: true })
              }
            />
          )}
          <Button
            secondary
            small
            onPress={() => setAreas(areas.filter((_, j) => i !== j))}
          >
            Удалить раздел
          </Button>
        </Card>
      ))}
      <Button
        secondary
        disabled={areas.length >= 20}
        onPress={() =>
          setAreas([
            ...areas,
            {
              id: uid(),
              label: "",
              definition: "",
              topicIds: [],
              scope: "area",
              coverageConfirmed: false,
            },
          ])
        }
      >
        Добавить раздел
      </Button>
      <Button disabled={saving} onPress={() => void save()}>
        Сохранить шаблон
      </Button>
    </View>
  );
}
function TopicPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { state: s } = useLearning();
  const [query, setQuery] = useState("");
  const matches = s.topics.filter((t) =>
    `${t.order ?? ""} ${t.title}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View style={{ gap: 9 }}>
      <Txt weight="600">Связанные темы</Txt>
      {selected.map((id) => (
        <Button
          secondary
          small
          key={id}
          onPress={() => onChange(selected.filter((x) => x !== id))}
        >
          {s.topics.find((t) => t.id === id)?.title} ×
        </Button>
      ))}
      <Field
        label="Поиск темы для раздела"
        value={query}
        onChangeText={setQuery}
        placeholder="Номер или название"
      />
      {matches
        .filter((t) => !selected.includes(t.id))
        .slice(0, 6)
        .map((t) => (
          <Button
            secondary
            small
            key={t.id}
            onPress={() => onChange([...selected, t.id])}
          >
            + {t.order ? `${t.order}. ` : ""}
            {t.title}
          </Button>
        ))}
      {matches.length > 6 && (
        <Txt size={12} color={colors.muted}>
          Уточните поиск, чтобы увидеть другие темы.
        </Txt>
      )}
    </View>
  );
}
