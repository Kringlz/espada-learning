import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Button, Disclosure, Field, Txt, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";
import { uid } from "../core/ids";
import { useClassroom } from "./useClassroom";
import { ClassSession, safeMeetingUrl, sessionDate } from "./service";
export function TeacherClassroom({ classId }: { classId: string }) {
  const { mode } = useLearning(),
    { colors } = useUITheme();
  const c = useClassroom(classId, mode === "supabase");
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<Partial<ClassSession>>();
  const [date, setDate] = useState("");
  const [formError, setFormError] = useState("");
  function open(item?: ClassSession) {
    setEdit(
      item ?? {
        id: uid(),
        revision: 0,
        topic: "",
        location: "",
        meeting_url: "",
        cancelled: false,
      },
    );
    const d = item ? new Date(item.starts_at) : null;
    setDate(
      d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : "",
    );
    setFormError("");
  }
  return (
    <View style={{ gap: 18 }}>
      <Disclosure title="Занятия группы" icon="calendar">
        {mode !== "supabase" ? (
          <Txt color={colors.muted}>Занятия доступны в учебном аккаунте.</Txt>
        ) : (
          <>
            {c.data?.sessions.map((s) => (
              <View key={s.id} style={{ gap: 8, paddingVertical: 12 }}>
                <Txt>
                  {sessionDate(s.starts_at)}
                  {s.cancelled
                    ? " · Отменено"
                    : s.previous_starts_at
                      ? " · Перенесено"
                      : ""}
                </Txt>
                {!!s.topic && <Txt>{s.topic}</Txt>}
                {!!s.location && <Txt color={colors.muted}>{s.location}</Txt>}
                {!!safeMeetingUrl(s.meeting_url) && (
                  <Button
                    small
                    secondary
                    onPress={() =>
                      void Linking.openURL(safeMeetingUrl(s.meeting_url)!)
                    }
                  >
                    Онлайн-занятие
                  </Button>
                )}
                <Button small secondary onPress={() => open(s)}>
                  Изменить
                </Button>
              </View>
            ))}
            {!c.loading && c.data && !c.data.sessions.length && (
              <Txt color={colors.muted}>Ближайших занятий нет.</Txt>
            )}
            {!edit ? (
              <Button secondary onPress={() => open()}>
                Добавить занятие
              </Button>
            ) : (
              <View style={{ gap: 12 }}>
                <Field
                  label="Дата и время"
                  placeholder="2026-11-02 18:00"
                  value={date}
                  onChangeText={setDate}
                />
                <Txt size={12} color={colors.muted}>
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </Txt>
                <Field
                  label="Тема"
                  value={edit.topic ?? ""}
                  onChangeText={(topic) => setEdit({ ...edit, topic })}
                />
                <Field
                  label="Место"
                  value={edit.location ?? ""}
                  onChangeText={(location) => setEdit({ ...edit, location })}
                />
                <Field
                  label="Ссылка на занятие"
                  value={edit.meeting_url ?? ""}
                  onChangeText={(meeting_url) =>
                    setEdit({ ...edit, meeting_url })
                  }
                />
                <Button
                  secondary
                  onPress={() =>
                    setEdit({ ...edit, cancelled: !edit.cancelled })
                  }
                >
                  {edit.cancelled ? "Восстановить занятие" : "Отменить занятие"}
                </Button>
                {!!formError && (
                  <Txt accessibilityRole="alert" color={colors.red}>
                    {formError}
                  </Txt>
                )}
                <Button
                  disabled={c.busy}
                  onPress={() => {
                    const parsed = new Date(date.replace(" ", "T"));
                    if (
                      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date) ||
                      !Number.isFinite(parsed.getTime()) ||
                      `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")} ${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}` !==
                        date
                    ) {
                      setFormError("Укажите дату и время.");
                      return;
                    }
                    if (edit.meeting_url && !safeMeetingUrl(edit.meeting_url)) {
                      setFormError("Укажите ссылку https://.");
                      return;
                    }
                    void c
                      .save({ ...edit, starts_at: parsed.toISOString() })
                      .then((ok) => {
                        if (ok) setEdit(undefined);
                      });
                  }}
                >
                  {c.busy ? "Сохраняем…" : "Сохранить занятие"}
                </Button>
                <Button secondary onPress={() => setEdit(undefined)}>
                  Закрыть
                </Button>
              </View>
            )}
          </>
        )}
      </Disclosure>
      <Disclosure title="Обсуждение группы" icon="message-circle">
        {mode !== "supabase" ? (
          <Txt color={colors.muted}>
            Обсуждение доступно в учебном аккаунте.
          </Txt>
        ) : (
          <>
            {c.hasOlder && (
              <Button
                small
                secondary
                disabled={c.loading}
                onPress={() => void c.refresh(true)}
              >
                Ранее
              </Button>
            )}
            {c.data?.messages.map((m) => (
              <View key={m.id} style={{ gap: 5, paddingVertical: 8 }}>
                <Txt size={12} color={colors.muted}>
                  {m.author_name} · {sessionDate(m.created_at)}
                </Txt>
                <Txt>{m.body}</Txt>
              </View>
            ))}
            {c.data && !c.data.messages.length && (
              <Txt color={colors.muted}>Сообщений пока нет.</Txt>
            )}
            <Field
              label="Сообщение"
              value={text}
              onChangeText={setText}
              multiline
            />
            <Button
              disabled={c.busy || !text.trim() || text.trim().length > 2000}
              onPress={() =>
                void c.send(text).then((ok) => {
                  if (ok) setText("");
                })
              }
            >
              {c.busy ? "Отправляем…" : "Отправить"}
            </Button>
          </>
        )}
      </Disclosure>
      {c.loading && !c.data && <Txt color={colors.muted}>Загрузка…</Txt>}
      {!!c.error && (
        <View style={{ gap: 8 }}>
          <Txt color={colors.red} accessibilityRole="alert">
            {c.error}
          </Txt>
          <Button small secondary onPress={() => void c.refresh()}>
            Повторить
          </Button>
        </View>
      )}
    </View>
  );
}
