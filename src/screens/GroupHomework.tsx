import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { uid } from "../core/ids";
import { groupStudents } from "../core/groups";
import { errorMessage } from "../i18n/errors";
import {
  Pill,
  Notice,
  Button,
  Card,
  Choice,
  Field,
  Txt,
  colors,
  dateText,
} from "../components/ui";

export function GroupHomework({ classId }: { classId: string }) {
  const { state: s, dispatch, saving } = useLearning();
  const group = s.classes.find((c) => c.id === classId)!;
  const members = groupStudents(s, classId);
  const [open, setOpen] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [requestId, setRequestId] = useState(uid);
  const assignments = s.assignments.filter(
    (a) => a.classId === classId && a.groupAssignmentId,
  );
  const batches = [...new Set(assignments.map((a) => a.groupAssignmentId!))]
    .map((id) => assignments.filter((a) => a.groupAssignmentId === id))
    .sort((a, b) => b[0].at.localeCompare(a[0].at));
  async function send() {
    try {
      setNoticeError(false);
      await dispatch({
        type: "assignGroup",
        id: requestId,
        classId,
        topicId,
        reason,
        override: priority,
      });
      setNotice(
        `Задание выдано группе «${group.name}». Ученики увидят его на главной странице.`,
      );
      setRequestId(uid());
      setReason("");
      setTopicId("");
      setQuery("");
      setPriority(false);
      setOpen(false);
    } catch (e) {
      setNoticeError(true);
      setNotice(errorMessage(e));
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Txt size={22} weight="600">
          Домашняя работа для группы
        </Txt>
        <Txt color={colors.muted}>
          Одно задание — всем активным ученикам группы. Каждый выполняет его
          самостоятельно.
        </Txt>
        {!!notice && (
          <Notice tone={noticeError ? "error" : "success"}>{notice}</Notice>
        )}
        {!open ? (
          <Button
            icon="plus-circle"
            disabled={!members.length}
            onPress={() => {
              setNotice("");
              setOpen(true);
            }}
          >
            Задать домашнюю работу группе
          </Button>
        ) : (
          <>
            <Txt weight="600">
              Получатели: {group.name} · учеников: {members.length}
            </Txt>
            <Txt size={13} color={colors.muted}>
              Задание получит текущий состав группы. Для учеников, добавленных
              позднее, выдайте новое задание.
            </Txt>
            <Field
              label="Поиск темы задания"
              value={query}
              onChangeText={setQuery}
            />
            {topicId ? (
              <>
                <Txt weight="600">
                  Тема: {s.topics.find((t) => t.id === topicId)?.title}
                </Txt>
                <Button secondary small onPress={() => setTopicId("")}>
                  Выбрать другую тему
                </Button>
              </>
            ) : (
              <>
                {s.topics
                  .filter((t) =>
                    t.title.toLowerCase().includes(query.trim().toLowerCase()),
                  )
                  .slice(0, 8)
                  .map((t) => (
                    <Choice
                      key={t.id}
                      label={t.title}
                      selected={false}
                      onPress={() => setTopicId(t.id)}
                    />
                  ))}
                {!s.topics.some((t) =>
                  t.title.toLowerCase().includes(query.trim().toLowerCase()),
                ) && <Txt>Темы не найдены. Измените запрос.</Txt>}
              </>
            )}
            <Field
              label="Что нужно сделать"
              value={reason}
              onChangeText={setReason}
              placeholder="Например: изучить урок и пройти самостоятельную проверку"
              multiline
            />
            <Choice
              multiple
              label="Приоритетное задание"
              selected={priority}
              onPress={() => setPriority(!priority)}
            />
            <Button
              disabled={saving || !topicId || !reason.trim() || !members.length}
              icon="send"
              onPress={() => void send()}
            >
              {saving ? "Отправляем…" : "Выдать задание всей группе"}
            </Button>
            <Button secondary disabled={saving} onPress={() => setOpen(false)}>
              Отмена
            </Button>
          </>
        )}
      </Card>
      {!!batches.length && (
        <Card>
          <Txt size={20} weight="600">
            Задания этой группы
          </Txt>
          {batches.map((batch) => (
            <View
              key={batch[0].groupAssignmentId}
              style={{
                gap: 6,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Txt weight="600">
                {s.topics.find((t) => t.id === batch[0].topicId)?.title}
              </Txt>
              <Txt>{batch[0].reason}</Txt>
              <Pill
                icon={
                  batch.every((a) => a.completedAt) ? "check-circle" : "clock"
                }
                tone={batch.every((a) => a.completedAt) ? "green" : "gold"}
              >
                {batch.every((a) => a.completedAt)
                  ? "Выполнено всей группой"
                  : "В работе"}
              </Pill>
              <Txt size={13} color={colors.muted}>
                {dateText(batch[0].at)} · Выполнили:{" "}
                {batch.filter((a) => a.completedAt).length} из {batch.length}
              </Txt>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
