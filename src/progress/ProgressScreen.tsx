import { VideoLessonTheme } from "../theme/Theme";
import React, { useState, useRef } from "react";
import { View, Linking, useWindowDimensions } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import Svg, { Circle, Polyline } from "react-native-svg";
import {
  Button,
  Card,
  Disclosure,
  Field,
  Notice,
  Txt,
  useUITheme,
} from "../components/ui";
import { useLearning } from "../services/context";
import { teachingGroups, groupStudents } from "../core/groups";
import { uid } from "../core/ids";
import { course } from "../course/model";
import { useProgress } from "./useProgress";
import {
  activity,
  comparisonKey,
  dayKey,
  ExternalWork,
  Period,
  ProgressData,
  topicSummary,
  validateAttachment,
  validateWork,
} from "./model";
import {
  progressEnvironment,
  previewURL,
  sendProgress,
  uploadWorkFile,
  workFileURL,
} from "./service";
import { ProgressCommand } from "./outbox";
const title = (id: string) => course.find((t) => t.id === id)?.title ?? id;
const date = (at: string) =>
  new Date(at.length === 10 ? `${at}T12:00:00+06:00` : at).toLocaleDateString(
    "ru-RU",
    {
      timeZone: "Asia/Bishkek",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
function PeriodPicker({
  value,
  change,
}: {
  value: Period;
  change: (p: Period) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {(["week", "month"] as Period[]).map((p) => (
        <Button
          key={p}
          small
          secondary
          selected={value === p}
          onPress={() => change(p)}
        >
          {p === "week" ? "Неделя" : "Месяц"}
        </Button>
      ))}
    </View>
  );
}
function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <Card>
      <Txt>
        {loading ? "Загрузка прогресса…" : error || "Нет доступных данных."}
      </Txt>
      {!loading && (
        <Button secondary onPress={retry}>
          Повторить загрузку
        </Button>
      )}
    </Card>
  );
}
function StudentProgressContent({
  studentId,
  details,
}: {
  studentId: string;
  details?: React.ReactNode;
}) {
  const { actor } = useLearning(),
    { colors } = useUITheme();
  const { data, error, loading, refresh } = useProgress(actor.id, studentId);
  const [period, setPeriod] = useState<Period>("week"),
    [editing, setEditing] = useState<ExternalWork | "new" | null>(null),
    [goal, setGoal] = useState(false);
  if (!data)
    return <LoadState loading={loading} error={error} retry={refresh} />;
  const a = activity(data, period),
    topics = topicSummary(data.runs),
    attention = topics.find((t) => t.attention);
  const adult = actor.role !== "student";
  const section = { gap: 16, paddingVertical: 12 };
  return (
    <View testID="student-progress" style={{ gap: 28 }}>
      {!!error && (
        <Notice tone="error">{error} · Показаны сохранённые данные.</Notice>
      )}
      {!!previewURL && (
        <Txt size={12} color={colors.muted}>
          Тестовый аккаунт · локальная база
        </Txt>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <PeriodPicker value={period} change={setPeriod} />
        <Button small secondary onPress={refresh}>
          Обновить
        </Button>
      </View>
      <View style={section}>
        <Txt size={13} color={colors.muted}>
          {date(a.start)} — {date(a.end)}
        </Txt>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 24,
            paddingVertical: 12,
          }}
        >
          {[
            {
              value: data.observedSince
                ? `${a.days.length}${period === "week" && data.goal?.days ? ` / ${data.goal.days}` : ""}`
                : "—",
              label: "дней занятий",
            },
            {
              value: data.observedSince
                ? a.seconds > 0 && a.seconds < 60
                  ? "< 1"
                  : `≈ ${Math.round(a.seconds / 60)}`
                : "—",
              label: "минут",
            },
            {
              value: data.observedSince ? `${a.correct} / ${a.completed}` : "—",
              label: "верных ответов",
            },
          ].map((item) => (
            <View key={item.label} style={{ minWidth: 90, flex: 1, gap: 6 }}>
              <Txt size={36} weight="500" color={colors.green}>
                {item.value}
              </Txt>
              <Txt size={13} color={colors.muted}>
                {item.label}
              </Txt>
            </View>
          ))}
        </View>
        {!data.observedSince && (
          <Txt color={colors.muted}>
            Активность появится после первого занятия.
          </Txt>
        )}
        {data.observedSince && !a.fullHistory && (
          <Txt size={12} color={colors.muted}>
            История с {date(data.observedSince)}
          </Txt>
        )}
        {a.compare && (
          <Txt size={13} color={colors.muted}>
            За {a.compare.days} полных дней: {a.compare.current} дней занятий ·
            ранее {a.compare.previous}
          </Txt>
        )}
        {!!data.goal?.days && (
          <Txt size={13} color={colors.muted}>
            Цель · {data.goal.days} дней в неделю
          </Txt>
        )}
        {adult && (
          <Button small secondary onPress={() => setGoal(!goal)}>
            {goal ? "Закрыть" : "Цель на неделю"}
          </Button>
        )}
        {goal && (
          <GoalEditor
            studentId={studentId}
            data={data}
            done={() => {
              setGoal(false);
              refresh();
            }}
          />
        )}
        <Disclosure title="Об активности">
          <Txt size={13}>
            День занятий — ответ или от 30 секунд активности. Время
            приблизительное, без фонового простоя. Верные ответы учитываются в
            завершённых самостоятельных проверках. Даты — по времени Бишкека.
          </Txt>
          <Txt size={13}>
            Видео: ≈ {Math.round(a.videoSeconds / 60)} мин · решение: ≈{" "}
            {Math.round((a.seconds - a.videoSeconds) / 60)} мин.
          </Txt>
          {!!data.goal?.days && (
            <Txt size={13}>Цель установил(а): {data.goal.authorName}</Txt>
          )}
        </Disclosure>
      </View>
      <View style={section}>
        <Txt size={23} weight="500">
          Темы
        </Txt>
        {!topics.length && (
          <Txt color={colors.muted}>Пройденные проверки появятся здесь.</Txt>
        )}
        {topics.map((t) => (
          <View
            key={t.topicId}
            style={{
              gap: 8,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Txt size={18} weight="500">
                  {title(t.topicId)}
                </Txt>
                <Txt size={13} color={colors.muted}>
                  {t.status}
                </Txt>
              </View>
              <Txt size={26} weight="500" color={colors.green}>
                {t.last.correct}/{t.last.total}
              </Txt>
            </View>
            <Disclosure title={`Попытки · ${t.history.length}`}>
              {t.history.map((r) => (
                <View key={r.id} style={{ gap: 5, paddingVertical: 8 }}>
                  <Txt size={14}>
                    {date(r.run.finishedAt!)} · {r.correct}/{r.total} · набор v
                    {r.version}
                  </Txt>
                  <Txt size={12} color={colors.muted}>
                    {r.archived
                      ? "Из прежней истории · без данных об активности"
                      : "Сохранено"}{" "}
                    · тренировка: {Object.keys(r.run.practice).length} · с
                    подсказками:{" "}
                    {Object.values(r.run.hints).filter((n) => n > 0).length}
                  </Txt>
                  <Txt size={12} color={colors.muted}>
                    Первый ответ:{" "}
                    {r.run.initial ? r.run.initial.choice + 1 : "—"} ·
                    повторный:{" "}
                    {r.run.revisited ? r.run.revisited.choice + 1 : "—"}
                  </Txt>
                </View>
              ))}
              {!!t.overlap && (
                <Txt size={12} color={colors.muted}>
                  Знакомых заданий: {t.overlap}. Повтор набора не подтверждает
                  устойчивое освоение.
                </Txt>
              )}
            </Disclosure>
          </View>
        ))}
        {!!data.legacy.length && (
          <Disclosure title={`Прежние проверки · ${data.legacy.length}`}>
            {data.legacy.map((r) => (
              <Txt key={r.id} size={14}>
                {date(r.at)} · {r.title} · {r.correct}/{r.total}
              </Txt>
            ))}
          </Disclosure>
        )}
      </View>
      {(adult || data.works.length > 0) && (
        <View style={section}>
          <View
            style={{
              gap: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Txt size={23} weight="500">
              Школьные работы
            </Txt>
            {adult && (
              <Button small onPress={() => setEditing("new")}>
                Добавить
              </Button>
            )}
          </View>
          {editing && (
            <WorkEditor
              key={typeof editing === "string" ? "new" : editing.id}
              studentId={studentId}
              work={editing === "new" ? undefined : editing}
              close={() => setEditing(null)}
              done={() => {
                setEditing(null);
                refresh();
              }}
            />
          )}
          {!data.works.length && <Txt color={colors.muted}>Пока нет работ</Txt>}
          <WorkComparisons works={data.works} />
          {data.works.slice(0, 5).map((w) => (
            <WorkRow
              key={w.id}
              work={w}
              edit={() => setEditing(w)}
              refresh={refresh}
              data={data}
            />
          ))}
          {data.works.length > 5 && (
            <Disclosure title={`Все работы · ${data.works.length}`}>
              {data.works.slice(5).map((w) => (
                <WorkRow
                  key={w.id}
                  work={w}
                  edit={() => setEditing(w)}
                  refresh={refresh}
                  data={data}
                />
              ))}
            </Disclosure>
          )}
        </View>
      )}
      {attention && (
        <Txt size={14} color={colors.green}>
          Стоит повторить · {title(attention.topicId)}
        </Txt>
      )}
      {!!details && <Disclosure title="Отчёты учителя">{details}</Disclosure>}
    </View>
  );
}
function GoalEditor({
  studentId,
  data,
  done,
}: {
  studentId: string;
  data: ProgressData;
  done: () => void;
}) {
  const { actor } = useLearning();
  const [days, setDays] = useState(String(data.goal?.days ?? 4)),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const request = useRef(uid());
  async function save(remove = false) {
    setSaving(true);
    setError("");
    try {
      const n = remove ? null : Number(days);
      if (n !== null && (!Number.isInteger(n) || n < 1 || n > 7))
        throw Error("Укажите от 1 до 7 дней.");
      await sendProgress(actor.id, {
        type: "goal",
        studentId,
        requestId: request.current,
        item: { days: n },
        expectedRevision: data.goal?.revision ?? 0,
      });
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Field
        label="Дней в неделю, от 1 до 7"
        value={days}
        onChangeText={(v) => {
          setDays(v);
          request.current = uid();
        }}
      />
      {data.goal?.days && (
        <Txt size={13}>
          Новая цель заменит действующую цель от {data.goal.authorName}.
        </Txt>
      )}
      {!!error && <Notice tone="error">{error}</Notice>}
      <Button disabled={saving} onPress={() => void save()}>
        Сохранить цель
      </Button>
      <Button disabled={saving} secondary onPress={() => void save(true)}>
        Без цели
      </Button>
    </View>
  );
}
function WorkEditor({
  studentId,
  work,
  close,
  done,
}: {
  studentId: string;
  work?: ExternalWork;
  close: () => void;
  done: () => void;
}) {
  const { actor, state } = useLearning();
  const [id] = useState(work?.id ?? uid());
  const [fields, setFields] = useState({
    date: work?.date ?? dayKey(new Date()),
    title: work?.title ?? "",
    subject: work?.subject ?? "Математика",
    topics: work?.topics.join(", ") ?? "",
    kind: work?.kind ?? "Контрольная",
    score: work ? String(work.score) : "",
    maximum: work ? String(work.maximum) : "",
    minimum: work ? String(work.minimum) : "0",
    scale: work?.scale ?? "points",
    note: work?.note ?? "",
  });
  const [file, setFile] = useState<{
      uri: string;
      mimeType: string;
      size: number;
      name: string;
    } | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const uploaded = useRef<string | null>(work?.attachment ?? null),
    lastCommand = useRef<ProgressCommand | null>(null);
  const set = (k: string, v: string) => {
    setFields((s) => ({ ...s, [k]: v }));
    lastCommand.current = null;
  };
  async function pick() {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      const f = r.assets[0];
      validateAttachment(f.mimeType ?? "", f.size ?? 0);
      setFile({
        uri: f.uri,
        mimeType: f.mimeType!,
        size: f.size!,
        name: f.name,
      });
      uploaded.current = null;
      lastCommand.current = null;
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const item = {
        ...fields,
        id,
        studentId,
        topics: fields.topics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        score: Number(fields.score.replace(",", ".")),
        maximum: Number(fields.maximum.replace(",", ".")),
        minimum:
          fields.scale === "points"
            ? 0
            : Number(fields.minimum.replace(",", ".")),
        attachment: uploaded.current,
      };
      if (!fields.score.trim() || !fields.maximum.trim())
        throw Error("Укажите результат и максимум.");
      validateWork(item);
      if (file && !uploaded.current) {
        setStatus("Загрузка вложения…");
        const path = `${studentId}/${actor.id}/${id}/${uid()}`;
        await uploadWorkFile(actor.id, path, file);
        uploaded.current = path;
        item.attachment = path;
      }
      setStatus("Сохранение результата…");
      const command = lastCommand.current ?? {
        type: "work",
        studentId,
        requestId: uid(),
        item,
        expectedRevision: work?.revision ?? 0,
      };
      lastCommand.current = command;
      await sendProgress(actor.id, command);
      done();
    } catch (e) {
      setError(`Сохранение не подтверждено: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }
  return (
    <View testID="school-work-form" style={{ gap: 12, paddingVertical: 12 }}>
      <Txt size={20} weight="600">
        {work ? "Исправить результат" : "Новый результат"}
      </Txt>
      <Txt>{state.profiles.find((p) => p.id === studentId)?.name}</Txt>
      {(["date", "title", "subject", "kind", "topics"] as const).map((k) => (
        <Field
          key={k}
          label={
            {
              date: "Дата · ГГГГ-ММ-ДД",
              title: "Название работы",
              subject: "Предмет",
              kind: "Тип работы",
              topics: "Темы через запятую",
            }[k]
          }
          value={fields[k]}
          onChangeText={(v) => set(k, v)}
        />
      ))}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(["points", "grade"] as const).map((s) => (
          <Button
            key={s}
            small
            secondary
            selected={fields.scale === s}
            onPress={() => {
              set("scale", s);
              set("minimum", s === "points" ? "0" : "1");
            }}
          >
            {s === "points" ? "Баллы" : "Оценка"}
          </Button>
        ))}
      </View>
      <Field
        label={fields.scale === "points" ? "Набрано баллов" : "Оценка"}
        value={fields.score}
        onChangeText={(v) => set("score", v)}
      />
      {fields.scale === "grade" && (
        <Field
          label="Минимум шкалы"
          value={fields.minimum}
          onChangeText={(v) => set("minimum", v)}
        />
      )}
      <Field
        label={fields.scale === "points" ? "Максимум баллов" : "Максимум шкалы"}
        value={fields.maximum}
        onChangeText={(v) => set("maximum", v)}
      />
      <Field
        label="Примечание · необязательно"
        value={fields.note}
        onChangeText={(v) => set("note", v)}
        maxLength={500}
      />
      <Button disabled={busy} secondary onPress={() => void pick()}>
        {file
          ? file.name
          : work?.attachment
            ? "Заменить вложение"
            : "Прикрепить фото или PDF"}
      </Button>
      <Txt size={12}>
        Необязательно · JPG, PNG или PDF до 10 МБ · доступно только семье и
        преподавателям ученика
      </Txt>
      {!!error && <Notice tone="error">{error}</Notice>}
      {!!status && <Txt>{status}</Txt>}
      <Button disabled={busy} onPress={() => void save()}>
        {busy
          ? "Сохранение…"
          : error
            ? "Повторить сохранение"
            : "Сохранить результат"}
      </Button>
      <Button disabled={busy} secondary onPress={close}>
        Отмена
      </Button>
    </View>
  );
}
function WorkRow({
  work: w,
  edit,
  refresh,
  data,
}: {
  work: ExternalWork;
  edit: () => void;
  refresh: () => void;
  data: ProgressData;
}) {
  const { actor } = useLearning(),
    { colors } = useUITheme();
  const [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const request = useRef(uid());
  const editable = actor.id === w.authorId || actor.role === "admin";
  async function open() {
    setError("");
    try {
      const url = await workFileURL(actor.id, w.attachment!);
      await Linking.openURL(url);
      if (url.startsWith("blob:"))
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await sendProgress(actor.id, {
        type: "deleteWork",
        studentId: w.studentId,
        requestId: request.current,
        item: { id: w.id },
        expectedRevision: w.revision,
      });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      testID={`school-work-${w.id}`}
      style={{
        gap: 8,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Txt size={18} weight="600">
        {w.title} · {w.score}
        {w.scale === "points"
          ? `/${w.maximum} баллов`
          : ` (шкала ${w.minimum}–${w.maximum})`}
      </Txt>
      <Txt size={13}>
        {date(w.date)} · {w.subject} · {w.kind} · {w.topics.join(", ")}
      </Txt>
      <Txt size={13} color={colors.muted}>
        {w.source} · {w.authorName}
      </Txt>
      {!!w.note && <Txt size={14}>{w.note}</Txt>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {w.attachment && (
          <Button small secondary onPress={() => void open()}>
            Открыть вложение
          </Button>
        )}
        {editable && (
          <>
            <Button small secondary onPress={edit}>
              Исправить
            </Button>
            <Button small secondary onPress={() => setConfirm(!confirm)}>
              Удалить
            </Button>
          </>
        )}
      </View>
      {confirm && (
        <>
          <Txt>
            Удалить эту запись из списка работ? История изменений сохранится.
          </Txt>
          <Button disabled={busy} onPress={() => void remove()}>
            Подтвердить удаление
          </Button>
        </>
      )}
      {!!error && <Notice tone="error">{error}</Notice>}
      {w.revision > 1 && (
        <Disclosure title={`История изменений · версия ${w.revision}`}>
          {data.audit
            .filter((a) => a.entityId === w.id)
            .map((a, i) => (
              <Txt key={i} size={13}>
                {date(a.at)} · {a.actorName} ·{" "}
                {(a.before as ExternalWork | null)?.score ?? "—"} →{" "}
                {(a.after as ExternalWork)?.score} · шкала{" "}
                {(a.after as ExternalWork)?.minimum}–
                {(a.after as ExternalWork)?.maximum}
              </Txt>
            ))}
        </Disclosure>
      )}
    </View>
  );
}
function WorkComparisons({ works }: { works: ExternalWork[] }) {
  const { colors } = useUITheme();
  const groups = [...new Set(works.map(comparisonKey))]
    .map((k) =>
      works
        .filter((w) => comparisonKey(w) === k)
        .sort((a, b) => a.date.localeCompare(b.date)),
    )
    .filter((g) => g.length > 1);
  return (
    <>
      {groups.slice(0, 2).map((g, index) => {
        const shown = g.slice(-6),
          first = shown[0],
          span = Math.max(
            1,
            +new Date(shown.at(-1)!.date) - +new Date(first.date),
          );
        const points = shown.map((w) => ({
          x: 12 + (256 * (+new Date(w.date) - +new Date(first.date))) / span,
          y: 80 - (64 * (w.score - w.minimum)) / (w.maximum - w.minimum),
        }));
        return (
          <Disclosure
            key={index}
            title={`${first.subject} · ${first.kind} · ${first.topics.join(", ")}`}
          >
            <Svg
              width="100%"
              height={96}
              viewBox="0 0 280 96"
              accessibilityLabel="Динамика школьных работ; значения приведены ниже"
            >
              <Polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                stroke={colors.green}
                strokeWidth={2}
                fill="none"
              />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.green} />
              ))}
            </Svg>
            {shown.map((w) => (
              <Txt key={w.id} size={13}>
                {date(w.date)} · {w.score}
                {w.scale === "points"
                  ? `/${w.maximum} баллов`
                  : ` по шкале ${w.minimum}–${w.maximum}`}
              </Txt>
            ))}
            <Txt size={12}>
              Совпадают предмет, темы, тип и шкала. Сложность работ может
              различаться; оценки в проценты не переводятся.
            </Txt>
          </Disclosure>
        );
      })}
    </>
  );
}
function GroupProgressContent() {
  const { actor, state } = useLearning();
  const groups = teachingGroups(state, actor);
  const [groupId, setGroup] = useState(groups[0]?.id ?? ""),
    [student, setStudent] = useState(""),
    [period, setPeriod] = useState<Period>("week");
  const members = groupStudents(state, groupId);
  if (student)
    return (
      <View style={{ gap: 16 }}>
        <Button secondary onPress={() => setStudent("")}>
          К группе
        </Button>
        <Txt size={28} weight="700">
          {members.find((p) => p.id === student)?.name}
        </Txt>
        <StudentProgress key={student} studentId={student} />
      </View>
    );
  return (
    <View testID="group-progress" style={{ gap: 18 }}>
      <Txt size={30} weight="700">
        Прогресс группы
      </Txt>
      {!!previewURL && <Notice>{progressEnvironment}</Notice>}
      <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
        {groups.map((g) => (
          <Button
            key={g.id}
            small
            secondary
            selected={g.id === groupId}
            onPress={() => setGroup(g.id)}
          >
            {g.name}
          </Button>
        ))}
      </View>
      <PeriodPicker value={period} change={setPeriod} />
      {!members.length && (
        <Card>
          <Txt>В группе пока нет учеников.</Txt>
        </Card>
      )}
      {members.map((p) => (
        <GroupStudent
          key={p.id}
          studentId={p.id}
          name={p.name}
          period={period}
          open={() => setStudent(p.id)}
        />
      ))}
    </View>
  );
}
function GroupStudent({
  studentId,
  name,
  period,
  open,
}: {
  studentId: string;
  name: string;
  period: Period;
  open: () => void;
}) {
  const { actor } = useLearning(),
    { colors } = useUITheme();
  const { width } = useWindowDimensions();
  const { data, error, loading, refresh } = useProgress(actor.id, studentId);
  if (!data)
    return (
      <View>
        <Txt weight="600">{name}</Txt>
        <LoadState loading={loading} error={error} retry={refresh} />
      </View>
    );
  const a = activity(data, period),
    topics = topicSummary(data.runs),
    last = topics[0],
    attention = topics.find((t) => t.attention);
  return (
    <Card>
      {!!error && (
        <Notice tone="error">
          {error} Данные последней успешной загрузки.
        </Notice>
      )}
      <View
        style={{
          flexDirection: width >= 900 ? "row" : "column",
          gap: 16,
          alignItems: width >= 900 ? "center" : "stretch",
        }}
      >
        <View style={{ flex: 1 }}>
          <Button secondary onPress={open}>
            {name}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight="600">
            {data.observedSince
              ? `${a.days.length} ${a.days.length === 1 ? "день" : a.days.length >= 2 && a.days.length <= 4 ? "дня" : "дней"} занятий`
              : "Нет истории занятий"}
          </Txt>
          {data.observedSince && !a.fullHistory && (
            <Txt size={12}>Наблюдение с {date(data.observedSince)}</Txt>
          )}
        </View>
        <View style={{ flex: 2 }}>
          <Txt>
            {last
              ? `${title(last.topicId)} · ${last.last.correct}/${last.last.total}`
              : "Самостоятельных проверок пока нет"}
          </Txt>
          {last && (
            <Txt size={12} color={colors.muted}>
              {date(last.last.run.finishedAt!)}
            </Txt>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={14}>
            {attention
              ? `Повторить: ${title(attention.topicId)}`
              : "Нет подтверждённой темы для повторения"}
          </Txt>
        </View>
      </View>
    </Card>
  );
}

export function StudentProgress(props: {
  studentId: string;
  details?: React.ReactNode;
}) {
  const { actor } = useLearning();
  return (
    <VideoLessonTheme>
      <View
        style={{ width: "100%", maxWidth: 1040, alignSelf: "center", gap: 28 }}
      >
        {actor.role === "student" && (
          <Txt size={32} weight="500">
            Мой прогресс
          </Txt>
        )}
        <StudentProgressContent {...props} />
      </View>
    </VideoLessonTheme>
  );
}
export function GroupProgress() {
  return (
    <VideoLessonTheme>
      <GroupProgressContent />
    </VideoLessonTheme>
  );
}
