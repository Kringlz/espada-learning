import { useUITheme } from "./ui";
import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { groupStudents, teachingGroups } from "../core/groups";
import { uid } from "../core/ids";
import { errorMessage } from "../i18n/errors";
import {
  Button,
  Card,
  Disclosure,
  Field,
  Notice,
  Txt,
  Icon,
  colors,
  styles,
} from "./ui";

export function GroupPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s, actor, dispatch, saving } = useLearning();
  const groups = teachingGroups(s, actor);
  const group = groups.find((c) => c.id === value);
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Card>
      {group ? (
        <View style={[styles.row, { flexWrap: "wrap", gap: 10 }]}>
          <Icon name="users" color={colors.green} />
          <View style={{ flex: 1, minWidth: 150, gap: 3 }}>
            <Txt size={12} color={colors.muted}>
              Группа · учеников: {groupStudents(s, group.id).length}
            </Txt>
            <Txt size={16} weight="600">
              {group.name}
            </Txt>
          </View>
          <Button secondary small icon="repeat" onPress={() => onChange("")}>
            Сменить
          </Button>
        </View>
      ) : (
        <>
          <Txt size={18} weight="600">
            Выберите группу
          </Txt>

          {groups.map((c) => (
            <Button
              key={c.id}
              icon="users"
              secondary
              onPress={() => onChange(c.id)}
            >
              {c.name}
            </Button>
          ))}
          {!groups.length && (
            <Txt>
              {actor.role === "admin"
                ? "У вас пока нет групп. Создайте группу в разделе управления."
                : "У вас пока нет групп. Создайте свою первую группу ниже."}
            </Txt>
          )}
          {actor.role === "teacher" && (
            <Disclosure title="Новая группа" icon="plus">
              <Field
                label="Название группы"
                value={name}
                onChangeText={setName}
              />
              <Field
                label="Расписание"
                value={schedule}
                onChangeText={setSchedule}
                placeholder="Например: Пн, Ср 18:00"
              />
              <Button
                disabled={saving || !name.trim()}
                onPress={() => {
                  setMessage("");
                  void dispatch({
                    type: "createGroup",
                    id: uid(),
                    name: name.trim(),
                    schedule: schedule.trim(),
                  })
                    .then(() => {
                      setName("");
                      setSchedule("");
                    })
                    .catch((e) => setMessage(errorMessage(e)));
                }}
              >
                Создать группу
              </Button>
              {!!message && <Notice tone="error">{message}</Notice>}
            </Disclosure>
          )}
        </>
      )}
    </Card>
  );
}

export function GroupCodeAndSchedule({ classId }: { classId: string }) {
  const { state: s, dispatch, saving } = useLearning();
  const { colors } = useUITheme();
  const group = s.classes.find((c) => c.id === classId);
  const [schedule, setSchedule] = useState(group?.schedule ?? "");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  if (!group) return null;
  return (
    <Disclosure title="Код группы и расписание" icon="calendar">
      <Txt color={colors.muted}>
        Этот код даёт ученику возможность самостоятельно вступить в группу при
        регистрации.
      </Txt>
      <Txt selectable size={20} weight="700">
        {group.joinCode}
      </Txt>
      <Button
        small
        secondary
        disabled={saving}
        onPress={() => {
          setMessage("");
          void dispatch({ type: "regenerateGroupCode", classId })
            .then(() =>
              setMessage("Код обновлён. Старый код больше не действует."),
            )
            .catch((e) => {
              setFailed(true);
              setMessage(errorMessage(e));
            });
        }}
      >
        Получить новый код
      </Button>
      <Field
        label="Расписание"
        value={schedule}
        onChangeText={setSchedule}
        placeholder="Например: Пн, Ср 18:00"
      />
      <Button
        disabled={saving || schedule === group.schedule}
        onPress={() => {
          setMessage("");
          void dispatch({
            type: "updateGroupSchedule",
            classId,
            schedule: schedule.trim(),
          })
            .then(() => {
              setFailed(false);
              setMessage("Расписание сохранено.");
            })
            .catch((e) => {
              setFailed(true);
              setMessage(errorMessage(e));
            });
        }}
      >
        Сохранить расписание
      </Button>
      {!!message && (
        <Notice tone={failed ? "error" : "success"}>{message}</Notice>
      )}
    </Disclosure>
  );
}

export function StudentPicker({
  classId,
  value,
  onChange,
}: {
  classId: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s } = useLearning();
  const [query, setQuery] = useState("");
  const students = groupStudents(s, classId);
  const selected = students.find((p) => p.id === value);
  const matches = students.filter((p) =>
    p.name
      .toLocaleLowerCase("ru")
      .includes(query.trim().toLocaleLowerCase("ru")),
  );
  return (
    <Card>
      {selected ? (
        <View style={[styles.row, { flexWrap: "wrap", gap: 10 }]}>
          <Icon name="user-check" color={colors.green} />
          <View style={{ flex: 1, minWidth: 140, gap: 3 }}>
            <Txt size={12} color={colors.muted}>
              Ученик
            </Txt>
            <Txt size={16} weight="600">
              {selected.name}
            </Txt>
          </View>
          <Button
            secondary
            small
            icon="repeat"
            label="Сменить ученика"
            onPress={() => {
              setQuery("");
              onChange("");
            }}
          >
            Сменить
          </Button>
        </View>
      ) : (
        <>
          <Txt size={18} weight="600">
            Выберите ученика
          </Txt>
          {!!students.length && (
            <Field
              label="Поиск ученика в группе"
              value={query}
              onChangeText={setQuery}
              placeholder="Имя или фамилия"
            />
          )}
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {matches.map((p) => (
              <Button
                key={p.id}
                icon="user"
                secondary
                onPress={() => onChange(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </View>
          {!students.length ? (
            <Txt>В этой группе пока нет активных учеников.</Txt>
          ) : (
            !matches.length && <Txt>В этой группе ученик не найден.</Txt>
          )}
        </>
      )}
    </Card>
  );
}

export function MyGroups() {
  const { colors, styles } = useUITheme();
  const { state: s, actor } = useLearning();
  const groups = s.classes.filter((c) => c.studentIds.includes(actor.id));
  return (
    <Card style={{ backgroundColor: colors.light }}>
      <View style={[styles.row, { alignItems: "flex-start", gap: 9 }]}>
        <Icon name="users" size={18} color={colors.green} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={12} color={colors.muted}>
            {groups.length > 1 ? "Мои группы" : "Моя группа"}
          </Txt>
          {groups.map((c) => (
            <View key={c.id}>
              <Txt size={15} weight="600">
                {c.name}
              </Txt>
              {!!c.schedule && (
                <Txt size={12} color={colors.muted}>
                  {c.schedule}
                </Txt>
              )}
            </View>
          ))}
        </View>
      </View>
      {!groups.length && (
        <Txt>Вы пока не добавлены в группу. Обратитесь к преподавателю.</Txt>
      )}
    </Card>
  );
}
