import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { groupStudents, teachingGroups } from "../core/groups";
import { Button, Card, Field, Txt, colors, styles } from "./ui";

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
      <Txt size={20} weight="600">
        {group ? "Выбранная группа" : "1. Выберите группу"}
      </Txt>
      {group ? (
        <>
          <Txt size={22} weight="600">
            {group.name}
          </Txt>
          <Txt color={colors.muted}>
            Активных учеников: {groupStudents(s, group.id).length}
          </Txt>
          <Button secondary small onPress={() => onChange("")}>
            Сменить группу
          </Button>
        </>
      ) : (
        <>
          <Txt color={colors.muted}>
            Сначала выберите группу. Затем появятся только её ученики.
          </Txt>
          {groups.map((c) => (
            <Button key={c.id} secondary onPress={() => onChange(c.id)}>
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
      <Txt size={20} weight="600">
        {selected ? "Выбранный ученик" : "2. Выберите ученика"}
      </Txt>
      {selected ? (
        <>
          <Txt size={22} weight="600">
            {selected.name}
          </Txt>
          <Button
            secondary
            small
            onPress={() => {
              setQuery("");
              onChange("");
            }}
          >
            Сменить ученика
          </Button>
        </>
      ) : (
        <>
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
              <Button key={p.id} secondary onPress={() => onChange(p.id)}>
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
      <Txt size={20} weight="600">
        {groups.length > 1 ? "Мои группы" : "Моя группа"}
      </Txt>
      {groups.map((c) => (
        <Txt key={c.id} size={20} weight="600">
          {c.name}
        </Txt>
      ))}
      {!groups.length && (
        <Txt>Вы пока не добавлены в группу. Обратитесь к преподавателю.</Txt>
      )}
    </Card>
  );
}
