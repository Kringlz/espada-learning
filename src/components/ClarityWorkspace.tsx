import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useLearning } from "../services/context";
import { teachingGroups, groupStudents } from "../core/groups";
import { latestReportInsights } from "../core/reportInsights";
import { topicMastery } from "../core/reports";
import { AtlasImage } from "./AtlasImage";
import { sectionIllustrations } from "./SectionIllustrations";
import { ResultRadar } from "./ResultRadar";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  dateText,
  useUITheme,
} from "./ui";

export function WorkspaceOverview({
  openGroup,
  newReport,
}: {
  openGroup: (id: string) => void;
  newReport: () => void;
}) {
  const { actor, state } = useLearning();
  const compact = useWindowDimensions().width < 600;
  const { colors } = useUITheme();
  const groups = teachingGroups(state, actor);
  const studentIds = new Set(
    groups.flatMap((g) => groupStudents(state, g.id).map((p) => p.id)),
  );
  const reports = (state.reports ?? []).filter(
    (r) => studentIds.has(r.studentId) && r.status === "published",
  );
  const attempts = state.attempts.filter((a) => studentIds.has(a.studentId));
  const review = state.topics
    .map((topic) => ({
      topic,
      count: [...studentIds].filter(
        (id) => topicMastery(state, id, topic.id).status === "Изучаю",
      ).length,
    }))
    .filter((t) => t.count > 0);
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Txt size={32} weight="700">
          Здравствуйте, {actor.name.split(" ")[0]}!
        </Txt>
        <Txt color={colors.muted}>Всё для новых открытий.</Txt>
      </View>
      <Card style={{ backgroundColor: colors.light, padding: 24, gap: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            flexWrap: "nowrap",
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 18 }}>
            <Txt size={compact ? 26 : 30} weight="700">
              Помогайте расти.
            </Txt>
            <Button icon="plus" onPress={newReport}>
              Добавить результат
            </Button>
          </View>
          <AtlasImage
            source={sectionIllustrations.learning.image}
            accessible={false}
            style={{
              width: compact ? 85 : 180,
              height: compact ? 110 : 150,
              borderRadius: 18,
            }}
          />
        </View>
      </Card>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Группы", value: groups.length, icon: "users" as const },
          { label: "Ученики", value: studentIds.size, icon: "user" as const },
          {
            label: "Работы",
            value: reports.length,
            icon: "check-circle" as const,
          },
        ].map((item) => (
          <Card key={item.label} style={{ flex: 1, minWidth: 100, gap: 8 }}>
            <Icon name={item.icon} color={colors.green} />
            <Txt size={30} weight="700">
              {item.value}
            </Txt>
            <Txt size={15} color={colors.muted}>
              {item.label}
            </Txt>
          </Card>
        ))}
      </View>
      <Txt size={24} weight="700">
        Мои группы
      </Txt>
      {groups.map((group) => (
        <Pressable
          key={group.id}
          accessibilityRole="button"
          accessibilityLabel={`Открыть группу ${group.name}`}
          onPress={() => openGroup(group.id)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            padding: 22,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 24,
            backgroundColor: colors.white,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon name="users" size={26} color={colors.green} />
          <View style={{ flex: 1, gap: 5 }}>
            <Txt size={22} weight="600">
              {group.name}
            </Txt>
            <Txt size={15} color={colors.muted}>
              {groupStudents(state, group.id).length} учеников
              {group.schedule ? ` · ${group.schedule}` : ""}
            </Txt>
          </View>
          <Icon name="arrow-right" />
        </Pressable>
      ))}
      {!groups.length && (
        <Card>
          <Txt color={colors.muted}>
            Создайте первую группу и пригласите учеников.
          </Txt>
          <Button icon="plus" onPress={() => openGroup("")}>
            К группам
          </Button>
        </Card>
      )}
      {!!review.length && (
        <Disclosure title="Что стоит повторить" icon="compass">
          {review.map(({ topic, count }) => (
            <View
              key={topic.id}
              style={{
                flexDirection: "row",
                gap: 16,
                justifyContent: "space-between",
              }}
            >
              <Txt style={{ flex: 1 }}>{topic.title}</Txt>
              <Txt color={colors.muted}>{count} уч.</Txt>
            </View>
          ))}
        </Disclosure>
      )}
      {!!attempts.length && (
        <Disclosure title="Последние занятия" icon="clock">
          {attempts
            .slice()
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 5)
            .map((a) => (
              <View key={a.id} style={{ gap: 4, paddingVertical: 8 }}>
                <Txt weight="600">
                  {state.profiles.find((p) => p.id === a.studentId)?.name}
                </Txt>
                <Txt size={16} color={colors.muted}>
                  {state.topics.find((t) => t.id === a.topicId)?.title} ·{" "}
                  {dateText(a.at)}
                </Txt>
              </View>
            ))}
        </Disclosure>
      )}
    </View>
  );
}

/** Only the selected child's server records: never the parent's local course progress. */
export function LearnerSnapshot({
  studentId,
  details,
}: {
  studentId: string;
  details: React.ReactNode;
}) {
  const { state } = useLearning();
  const { colors } = useUITheme();
  const data = latestReportInsights(state, studentId);
  const assignments = state.assignments.filter(
    (a) => a.studentId === studentId,
  );
  const done = assignments.filter((a) => a.completedAt).length;
  const reports = (state.reports ?? []).filter(
    (r) => r.studentId === studentId && r.status === "published",
  ).length;
  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 120 }}>
          <Icon name="check-circle" color={colors.green} />
          <Txt size={32} weight="700">
            {done}
            <Txt size={18} color={colors.muted}>
              {" "}
              / {assignments.length}
            </Txt>
          </Txt>
          <Txt size={16} color={colors.muted}>
            Задания
          </Txt>
        </Card>
        <Card style={{ flex: 1, minWidth: 120 }}>
          <Icon name="clipboard" color={colors.green} />
          <Txt size={32} weight="700">
            {reports}
          </Txt>
          <Txt size={16} color={colors.muted}>
            Работы
          </Txt>
        </Card>
      </View>
      <Card style={{ gap: 20 }}>
        <Txt size={24} weight="700">
          Карта знаний
        </Txt>
        {data ? (
          <>
            <Txt size={15} color={colors.muted}>
              {dateText(data.report.date)}
              {data.report.demo ? " · учебный пример" : ""}
            </Txt>
            <View style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>
              <ResultRadar template={data.template} report={data.report} />
            </View>
          </>
        ) : (
          <>
            <AtlasImage
              source={sectionIllustrations.progress.image}
              accessible={false}
              style={{ height: 160, width: 200, alignSelf: "center" }}
            />
            <Txt color={colors.muted}>
              Появится после первой работы с учителем.
            </Txt>
          </>
        )}
      </Card>
      <Disclosure title="Все результаты" icon="bar-chart-2">
        {details}
      </Disclosure>
    </View>
  );
}
