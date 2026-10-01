import React, { useState, useEffect } from "react";
import { Linking, View } from "react-native";
import { useLearning } from "../services/context";
import {
  Button,
  Card,
  Disclosure,
  Field,
  Notice,
  Pill,
  Txt,
  useUITheme,
  dateText,
} from "../components/ui";
import { Progress } from "./Reports";
import { VideoLessons } from "../components/VideoLessons";
import { LessonText } from "../components/LessonText";
import { errorMessage } from "../i18n/errors";

export function Parent({ tab }: { tab: string }) {
  const { state: s, actor } = useLearning();
  const { colors, styles } = useUITheme();
  const children = s.profiles.filter(
    (p) =>
      p.role === "student" &&
      p.active &&
      s.parentLinks?.some(
        (l) => l.parentId === actor.id && l.studentId === p.id && l.verifiedAt,
      ),
  );
  const [selected, setSelected] = useState("");
  const child = children.find((p) => p.id === selected) ?? children[0];
  const [topicId, setTopicId] = useState<string | null>(null);
  useEffect(() => setTopicId(null), [tab]);
  const topic = s.topics.find((t) => t.id === topicId);
  const [message, setMessage] = useState("");
  if (!child)
    return (
      <Card>
        <Pill>Родитель</Pill>
        <Txt size={28} weight="600">
          Будьте рядом с его открытиями
        </Txt>
        <Txt color={colors.muted}>
          Передайте учителю код из своего профиля. После подтверждения связи
          здесь появятся результаты ребёнка.
        </Txt>
      </Card>
    );
  if (topic)
    return (
      <View style={{ gap: 16 }}>
        <Button secondary onPress={() => setTopicId(null)}>
          Назад к ребёнку
        </Button>
        <Txt size={27} weight="600">
          {topic.title}
        </Txt>
        <VideoLessons topic={topic} />
        <Card>
          <LessonText text={topic.lesson} />
          <LessonText text={topic.example} />
        </Card>
      </View>
    );
  const assignments = s.assignments
    .filter((a) => a.studentId === child.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const groups = s.classes.filter((c) => c.studentIds.includes(child.id));
  const teachers = s.profiles.filter(
    (p) =>
      p.role === "teacher" &&
      p.active &&
      groups.some((c) => c.teacherIds.includes(p.id)),
  );
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Pill>Кабинет родителя</Pill>
        <Txt size={30} weight="700">
          {child.name}
        </Txt>
        {children.length > 1 && (
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {children.map((p) => (
              <Button
                key={p.id}
                small
                secondary
                selected={p.id === child.id}
                onPress={() => {
                  setSelected(p.id);
                  setTopicId(null);
                }}
              >
                {p.name}
              </Button>
            ))}
          </View>
        )}
        <Txt color={colors.muted}>{groups.map((g) => g.name).join(" · ")}</Txt>
      </View>
      {tab === "FamilyProgress" && (
        <Progress key={child.id} studentId={child.id} openTopic={setTopicId} />
      )}
      {tab === "Homework" && (
        <>
          <Txt size={25} weight="600">
            Домашняя работа
          </Txt>
          {!assignments.length && (
            <Card>
              <Txt>Учитель пока не задал домашнюю работу.</Txt>
            </Card>
          )}
          {assignments.map((a) => (
            <Card key={a.id}>
              <Pill tone={a.completedAt ? "green" : "gold"}>
                {a.completedAt ? "Выполнено" : "Нужно выполнить"}
              </Pill>
              <Txt size={20} weight="600">
                {s.topics.find((t) => t.id === a.topicId)?.title}
              </Txt>
              <Txt>{a.reason}</Txt>
              <Txt size={12} color={colors.muted}>
                {dateText(a.at)} ·{" "}
                {s.profiles.find((p) => p.id === a.teacherId)?.name ??
                  "Учитель"}
              </Txt>
              <Button small secondary onPress={() => setTopicId(a.topicId)}>
                Посмотреть материал
              </Button>
            </Card>
          ))}
        </>
      )}
      {tab === "Contacts" && (
        <>
          <Txt size={25} weight="600">
            На связи с учителем
          </Txt>
          {message && <Notice tone="error">{message}</Notice>}
          {!teachers.length && (
            <Card>
              <Txt>Контакты появятся после добавления ребёнка в группу.</Txt>
            </Card>
          )}
          {teachers.map((p) => {
            const contact = s.teacherContacts?.find(
              (c) => c.teacherId === p.id,
            );
            const open = (url: string) => {
              void Linking.openURL(url).catch(() =>
                setMessage(
                  "Не удалось открыть приложение для связи. Контакт можно скопировать ниже.",
                ),
              );
            };
            return (
              <Card key={p.id}>
                <Pill>Учитель</Pill>
                <Txt size={23} weight="600">
                  {p.name}
                </Txt>
                {contact?.hours && (
                  <Txt color={colors.muted}>{contact.hours}</Txt>
                )}
                {contact?.email && (
                  <>
                    <Txt selectable>{contact.email}</Txt>
                    <Button
                      secondary
                      icon="mail"
                      onPress={() => open(`mailto:${contact.email}`)}
                    >
                      Написать
                    </Button>
                  </>
                )}
                {contact?.phone && (
                  <>
                    <Txt selectable>{contact.phone}</Txt>
                    <Button
                      secondary
                      icon="phone"
                      onPress={() =>
                        open(`tel:${contact.phone.replace(/[^+\d]/g, "")}`)
                      }
                    >
                      Позвонить
                    </Button>
                  </>
                )}
                {!contact?.phone && !contact?.email && (
                  <Txt color={colors.muted}>
                    Учитель пока не указал контакты. Попросите его добавить их в
                    профиле.
                  </Txt>
                )}
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

export function GroupEnrollment({ classId }: { classId: string }) {
  const { dispatch, saving, state: s } = useLearning();
  const { colors } = useUITheme();
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const group = s.classes.find((c) => c.id === classId);
  return (
    <Disclosure title="Добавить ученика" icon="user-plus">
      <Txt color={colors.muted}>
        Попросите ученика передать код из его профиля.
      </Txt>
      <Field
        label="Код ученика"
        value={studentId}
        onChangeText={setStudentId}
      />
      <Button
        disabled={saving || !studentId.trim()}
        onPress={() => {
          setMessage("");
          void dispatch({
            type: "enrollStudent",
            classId,
            studentId: studentId.trim(),
          })
            .then(() => {
              setFailed(false);
              setMessage(`Ученик добавлен в группу «${group?.name}».`);
              setStudentId("");
            })
            .catch((e) => {
              setFailed(true);
              setMessage(errorMessage(e));
            });
        }}
      >
        Добавить в группу
      </Button>
      {!!message && (
        <Notice tone={failed ? "error" : "success"}>{message}</Notice>
      )}
    </Disclosure>
  );
}

export function ParentLinkEditor({ studentId }: { studentId: string }) {
  const { dispatch, state: s, saving } = useLearning();
  const { colors } = useUITheme();
  const [parentId, setParentId] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const act = async (id: string, remove = false) => {
    try {
      await dispatch({
        type: "linkParent",
        parentId: id.trim(),
        studentId,
        remove,
      });
      setFailed(false);
      setMessage(
        remove ? "Доступ родителя закрыт." : "Родитель привязан к ученику.",
      );
      setParentId("");
      setVerified(false);
    } catch (e) {
      setFailed(true);
      setMessage(errorMessage(e));
    }
  };
  return (
    <Disclosure title="Доступ родителя" icon="heart">
      <Txt color={colors.muted}>
        Проверьте, что аккаунт принадлежит родителю этого ученика, и введите код
        из профиля родителя.
      </Txt>
      <Field
        label="Код родителя"
        value={parentId}
        onChangeText={(v) => {
          setParentId(v);
          setVerified(false);
        }}
      />
      <Button
        small
        secondary
        selected={verified}
        onPress={() => setVerified(!verified)}
      >
        {verified
          ? "✓ Связь с ребёнком подтверждена"
          : "Подтверждаю связь с ребёнком"}
      </Button>
      <Button
        disabled={saving || !verified || !parentId.trim()}
        onPress={() => void act(parentId)}
      >
        Открыть доступ родителю
      </Button>
      {(s.parentLinks ?? [])
        .filter((l) => l.studentId === studentId)
        .map((l) => (
          <View key={l.parentId} style={{ gap: 8 }}>
            <Txt>
              {s.profiles.find((p) => p.id === l.parentId)?.name ?? "Родитель"}
            </Txt>
            <Button
              small
              secondary
              disabled={saving}
              onPress={() => void act(l.parentId, true)}
            >
              Закрыть доступ
            </Button>
          </View>
        ))}
      {!!message && (
        <Notice tone={failed ? "error" : "success"}>{message}</Notice>
      )}
    </Disclosure>
  );
}

export function TeacherContactEditor() {
  const { actor, state: s, dispatch, saving } = useLearning();
  const { colors } = useUITheme();
  const [contact, setContact] = useState(
    s.teacherContacts?.find((c) => c.teacherId === actor.id) ?? {
      teacherId: actor.id,
      email: "",
      phone: "",
      hours: "",
    },
  );
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <Card>
      <Txt size={22} weight="600">
        Контакты для родителей
      </Txt>
      <Txt color={colors.muted}>Их увидят семьи учеников ваших групп.</Txt>
      <Field
        label="Email для связи"
        value={contact.email}
        onChangeText={(email) => setContact({ ...contact, email })}
        maxLength={160}
      />
      <Field
        label="Телефон"
        value={contact.phone}
        onChangeText={(phone) => setContact({ ...contact, phone })}
        maxLength={40}
      />
      <Field
        label="Когда можно связаться"
        value={contact.hours}
        onChangeText={(hours) => setContact({ ...contact, hours })}
        placeholder="Например: пн–пт, 10:00–18:00"
        maxLength={200}
      />
      <Button
        disabled={saving}
        onPress={() => {
          void dispatch({
            type: "saveTeacherContact",
            contact: {
              ...contact,
              email: contact.email.trim(),
              phone: contact.phone.trim(),
              hours: contact.hours.trim(),
            },
          })
            .then(() => {
              setFailed(false);
              setMessage("Контакты сохранены.");
            })
            .catch((e) => {
              setFailed(true);
              setMessage(errorMessage(e));
            });
        }}
      >
        Сохранить контакты
      </Button>
      {!!message && (
        <Notice tone={failed ? "error" : "success"}>{message}</Notice>
      )}
    </Card>
  );
}
