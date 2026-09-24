import { errorMessage } from "../i18n/errors";
import React, { useState } from "react";
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
  startNew = false,
  back,
}: {
  startNew?: boolean;
  back?: () => void;
}) {
  const { state: s } = useLearning();
  const students = s.profiles.filter((p) => p.role === "student" && p.active);
  const templates = s.reportTemplates ?? [];
  const [student, setStudent] = useState(students[0]?.id ?? "");
  const [edit, setEdit] = useState<TeacherReport | null>(null);
  const [creating, setCreating] = useState(startNew);
  const [templateEdit, setTemplateEdit] = useState<
    ReportTemplate | null | undefined
  >(undefined);
  const [query, setQuery] = useState("");
  if (templateEdit !== undefined)
    return (
      <TemplateEditor
        source={templateEdit}
        close={() => setTemplateEdit(undefined)}
      />
    );
  if (edit || creating)
    return (
      <ReportEditor
        existing={edit}
        studentId={student}
        close={() => {
          setEdit(null);
          setCreating(false);
          back?.();
        }}
      />
    );
  return (
    <View style={{ gap: 20 }}>
      <Txt size={30} weight="600">
        Работы учеников
      </Txt>
      <Txt color={colors.muted}>
        Оценка учителя и число правильных ответов по разделам. Ответы на
        отдельные задания не требуются.
      </Txt>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button onPress={() => setCreating(true)}>Добавить результат</Button>
        <Button secondary onPress={() => setTemplateEdit(null)}>
          Новый шаблон
        </Button>
      </View>
      <Card>
        <Txt weight="600">Ученик</Txt>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {students.map((p) => (
            <Button
              small
              key={p.id}
              secondary={student !== p.id}
              onPress={() => setStudent(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </View>
        {!students.length && <Txt>Пока нет учеников в ваших группах.</Txt>}
      </Card>
      <Field
        label="Найти работу"
        value={query}
        onChangeText={setQuery}
        placeholder="Название или дата"
      />
      {(s.reports ?? [])
        .filter(
          (r) =>
            r.studentId === student &&
            `${templates.find((t) => t.id === r.templateId)?.name} ${r.date}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => (
          <Card key={r.id}>
            <Txt weight="600">
              {templates.find((t) => t.id === r.templateId)?.name}
            </Txt>
            <Txt>
              {dateText(r.date)} · Оценка: {r.grade}
            </Txt>
            <Pill>
              {r.status === "published" ? "Опубликовано" : "Черновик"}
            </Pill>
            <Button secondary onPress={() => setEdit(r)}>
              Изменить результат
            </Button>
          </Card>
        ))}
      {!(s.reports ?? []).some((r) => r.studentId === student) && (
        <Card>
          <Txt>У ученика пока нет записей в новом формате.</Txt>
        </Card>
      )}
      <Card>
        <Txt size={22} weight="600">
          История изменений
        </Txt>
        {s.audit
          .filter(
            (a) =>
              a.action === "report.saved" &&
              (a.after as TeacherReport)?.studentId === student,
          )
          .slice()
          .reverse()
          .slice(0, 20)
          .map((a) => (
            <View key={a.id} style={{ gap: 5 }}>
              <Txt size={14}>
                {dateText(a.at)} ·{" "}
                {
                  templates.find(
                    (t) => t.id === (a.after as TeacherReport).templateId,
                  )?.name
                }
              </Txt>
              <Txt size={13}>
                Оценка: {(a.before as TeacherReport | null)?.grade ?? "—"} →{" "}
                {(a.after as TeacherReport).grade} · версия записи{" "}
                {(a.after as TeacherReport).revision}
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
            (a.after as TeacherReport)?.studentId === student,
        ) && (
          <Txt size={13} color={colors.muted}>
            Новые публикации и исправления появятся здесь.
          </Txt>
        )}
      </Card>
      <Card>
        <Txt size={22} weight="600">
          Шаблоны работ
        </Txt>
        <Txt size={13} color={colors.muted}>
          Сохранённые версии не меняются. Для следующей работы можно создать
          новую версию; прежние результаты сохранятся.
        </Txt>
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
                Новая версия
              </Button>
            </View>
          ))}
        {!templates.length && (
          <Txt>
            Сначала создайте шаблон и свяжите его разделы с темами программы.
          </Txt>
        )}
      </Card>
    </View>
  );
}
function ReportEditor({
  existing,
  studentId,
  close,
}: {
  existing: TeacherReport | null;
  studentId: string;
  close: () => void;
}) {
  const { state: s, actor, dispatch, saving } = useLearning();
  const templates = s.reportTemplates ?? [];
  const [tid, setTid] = useState(
    existing?.templateId ?? templates[0]?.id ?? "",
  );
  const t = templates.find((t) => t.id === tid);
  const [sid, setSid] = useState(existing?.studentId ?? studentId);
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
  async function save(status: "draft" | "published") {
    try {
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
      await dispatch({
        type: "saveReport",
        report: r,
        expectedRevision: existing?.revision ?? 0,
        reason,
      });
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
        {existing ? "Изменить результат" : "Добавить результат"}
      </Txt>
      {Boolean(notice) && (
        <Txt color={colors.red} accessibilityRole="alert">
          {notice}
        </Txt>
      )}
      {!existing && (
        <Card>
          <Txt weight="600">Ученик</Txt>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {s.profiles
              .filter((p) => p.role === "student" && p.active)
              .map((p) => (
                <Button
                  small
                  key={p.id}
                  secondary={sid !== p.id}
                  onPress={() => setSid(p.id)}
                >
                  {p.name}
                </Button>
              ))}
          </View>
          <Txt weight="600">Шаблон</Txt>
          {templates.map((t) => (
            <Choice
              key={t.id}
              label={`${t.name} · версия ${t.version}`}
              selected={tid === t.id}
              onPress={() => {
                setTid(t.id);
                setValues({});
                setGrade("");
              }}
            />
          ))}
        </Card>
      )}
      {t ? (
        <>
          <Card>
            <Txt weight="600">
              {t.name} · версия {t.version}
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
              Правильные ответы
            </Txt>
            <Txt size={14} color={colors.muted}>
              Нет данных — оставьте оба поля пустыми. Ноль правильных ответов —
              укажите 0 и общее число вопросов. Не складываем разные разделы:
              вопросы могут пересекаться.
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
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            <Button
              disabled={saving || !sid}
              onPress={() => void save("published")}
            >
              {existing?.status === "published"
                ? "Сохранить исправление"
                : "Опубликовать результат"}
            </Button>
            {existing?.status !== "published" && (
              <Button
                secondary
                disabled={saving || !sid}
                onPress={() => void save("draft")}
              >
                Сохранить черновик
              </Button>
            )}
          </View>
        </>
      ) : (
        <Card>
          <Txt>Шаблонов пока нет. Вернитесь к работам и создайте шаблон.</Txt>
        </Card>
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
