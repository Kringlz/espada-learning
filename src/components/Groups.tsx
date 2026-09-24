import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { groupStudents, teachingGroups } from "../core/groups";
import { Button, Card, Field, Txt, Icon, colors, styles } from "./ui";

export function GroupPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { state: s, actor } = useLearning();
  const groups = teachingGroups(s, actor);
  const group = groups.find((c) => c.id === value);
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
          <Txt size={13} color={colors.muted}>
            Сначала выберите группу. Затем появятся только её ученики.
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
              У вас пока нет групп. Попросите администратора добавить вас в
              группу.
            </Txt>
          )}
        </>
      )}
    </Card>
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
            <Txt key={c.id} size={15} weight="600">
              {c.name}
            </Txt>
          ))}
        </View>
      </View>
      {!groups.length && (
        <Txt>Вы пока не добавлены в группу. Обратитесь к преподавателю.</Txt>
      )}
    </Card>
  );
}
