import { useGroupSummary } from "./useGroupSummary";
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Button, Card, Field, Icon, Txt, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";
import { groupLeagueEnabled, loadGroupSummary } from "./service";
export function GroupActivity({
  groupId,
  onSelect,
  active = true,
}: {
  groupId: string;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { actor, mode } = useLearning(),
    { colors } = useUITheme();
  const { data, error, loading, refresh } = useGroupSummary(
    actor.id,
    groupId,
    groupLeagueEnabled && active,
    loadGroupSummary,
  );
  const [query, setQuery] = useState("");
  if (!groupLeagueEnabled) return null;
  const teacher = ["teacher", "admin"].includes(actor.role);
  const rows =
    data?.rows.filter(
      (r) =>
        !teacher ||
        r.name
          .toLocaleLowerCase("ru")
          .includes(query.trim().toLocaleLowerCase("ru")),
    ) ?? [];
  return (
    <Card style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Icon name="award" color={colors.green} />
        <Txt size={24} weight="700" style={{ flex: 1 }}>
          {teacher ? "Активность группы" : "Лига моей группы"}
        </Txt>
        <Button
          small
          secondary
          disabled={loading}
          icon="refresh-cw"
          label="Обновить рейтинг"
          onPress={refresh}
        >
          Обновить
        </Button>
      </View>
      <Txt size={14} color={colors.muted}>
        Учебник · за всё время · +20 XP за каждый уникальный правильный ответ,
        проверенный сервером.{" "}
        {mode === "demo"
          ? "Здесь используются только демоданные."
          : "Учёт начинается после подключения лиги. Старые личные очки и видео остаются на устройстве."}
      </Txt>
      {loading ? (
        <Txt accessibilityRole="status">Загружаем группу…</Txt>
      ) : error ? (
        <Txt accessibilityRole="alert" color={colors.red}>
          {error}
        </Txt>
      ) : (
        data && (
          <>
            <Txt weight="600">{data.groupName}</Txt>
            {teacher && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
                <Txt>Учеников: {data.rows.length}</Txt>
                <Txt>
                  Уроков завершено:{" "}
                  {data.rows.reduce((s, r) => s + (r.completedLessons ?? 0), 0)}
                </Txt>
              </View>
            )}
            {teacher && data.rows.length > 0 && (
              <Field
                label="Найти ученика в рейтинге"
                value={query}
                onChangeText={setQuery}
              />
            )}
            {!data.rows.length ? (
              <Txt color={colors.muted}>В группе пока нет учеников.</Txt>
            ) : !rows.length ? (
              <Txt color={colors.muted}>Никого не нашли. Измените поиск.</Txt>
            ) : (
              <>
                {!data.rows.some((r) => r.xp > 0) && (
                  <Txt color={colors.muted}>
                    Первые места появятся после проверенных ответов.
                  </Txt>
                )}
                {rows.map((r, index) => (
                  <Pressable
                    key={r.studentId ?? `${r.name}:${index}`}
                    accessibilityRole={
                      teacher && onSelect ? "button" : undefined
                    }
                    accessibilityLabel={
                      teacher ? `Прогресс ученика: ${r.name}` : undefined
                    }
                    disabled={!teacher || !onSelect}
                    onPress={() => r.studentId && onSelect?.(r.studentId)}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: r.isCurrent ? colors.green : colors.line,
                      backgroundColor: r.isCurrent
                        ? colors.light
                        : colors.white,
                    }}
                  >
                    <View style={{ width: 30, alignItems: "center" }}>
                      {r.rank === 1 ? (
                        <Icon name="award" color={colors.green} />
                      ) : (
                        <Txt weight="700">{r.rank || "—"}</Txt>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Txt weight="700">
                        {r.name}
                        {r.isCurrent ? " · это вы" : ""}
                      </Txt>
                      {teacher && (
                        <>
                          <Txt size={13} color={colors.muted}>
                            Завершено уроков: {r.completedLessons ?? 0}
                          </Txt>
                          <Txt size={12} color={colors.muted}>
                            {r.lastActivity
                              ? `Последний ответ: ${new Date(r.lastActivity).toLocaleString("ru-RU")}`
                              : "Проверенных ответов пока нет"}
                          </Txt>
                        </>
                      )}
                    </View>
                    <Txt weight="700" color={colors.green}>
                      {r.xp} XP
                    </Txt>
                  </Pressable>
                ))}
              </>
            )}
          </>
        )
      )}
    </Card>
  );
}
export function StudentGroupLeague({ active = true }: { active?: boolean }) {
  const { actor, state } = useLearning();
  const [chosen, setChosen] = useState("");
  const groups = state.classes.filter((g) => g.studentIds.includes(actor.id));
  const current = groups.find((g) => g.id === chosen) ?? groups[0];
  if (!groupLeagueEnabled || actor.role !== "student") return null;
  if (!current)
    return (
      <Card>
        <Txt weight="700">Лига моей группы</Txt>
        <Txt>
          Когда учитель добавит вас в группу, здесь появится её рейтинг.
        </Txt>
      </Card>
    );
  return (
    <View style={{ gap: 12 }}>
      {groups.length > 1 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {groups.map((g) => (
            <Button
              key={g.id}
              small
              secondary
              selected={g.id === current.id}
              onPress={() => setChosen(g.id)}
            >
              {g.name}
            </Button>
          ))}
        </View>
      )}
      <GroupActivity key={current.id} groupId={current.id} active={active} />
    </View>
  );
}
