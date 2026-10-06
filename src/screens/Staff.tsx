import { GroupEnrollment, ParentLinkEditor } from "./Family";
import { useUITheme } from "../components/ui";
import { CourseLibrary } from "../course/CourseLibrary";
import { LessonLibrary } from "../lessons/LessonLibrary";
import {
  GroupPicker,
  StudentPicker,
  GroupCodeAndSchedule,
} from "../components/Groups";
import { GroupHomework } from "./GroupHomework";
import { groupStudents, teachingGroups } from "../core/groups";
import { TeacherReports } from "./TeacherReports";
import { topicMastery } from "../core/reports";
import { errorMessage } from "../i18n/errors";
import { TopicTree } from "../components/TopicTree";
import { VideoLessons } from "../components/VideoLessons";
import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { Topic, Profile, Classroom } from "../core/types";
import { uid } from "../core/ids";
import {
  Icon,
  Button,
  Card,
  Txt,
  Pill,
  Field,
  SectionTitle,
  colors,
  styles,
  dateText,
  Choice,
} from "../components/ui";
import { Progress } from "./Student";
export function Staff({
  tab,
  onScreenChange,
}: {
  tab: string;
  onScreenChange: () => void;
}) {
  const { colors, styles } = useUITheme();
  const { state: s, actor } = useLearning();
  const students = s.profiles.filter((p) => p.role === "student" && p.active);
  const [classId, setClassId] = useState("");
  const group = teachingGroups(s, actor).find((c) => c.id === classId);
  const [studentId, setStudentId] = useState("");
  const selectedStudent = groupStudents(s, group?.id ?? "").find(
    (p) => p.id === studentId,
  );
  function changeGroup(id: string) {
    setClassId(id);
    setStudentId("");
    setDetail(false);
    setStudentTopic(null);
  }
  const [detail, setDetail] = useState(false);
  const [create, setCreate] = useState(false);
  const [studentTopic, setStudentTopic] = useState<string | null>(null);
  const [videoTopic, setVideoTopic] = useState<string | null>(null);
  const [showLessonLibrary, setShowLessonLibrary] = useState<
    "course" | "tests" | "legacy"
  >("course");
  const [topicEdit, setTopicEdit] = useState<Topic | null>(null);
  if (tab === "Assessments" || create)
    return (
      <TeacherReports
        onScreenChange={onScreenChange}
        classId={group?.id ?? ""}
        onGroupChange={changeGroup}
        startNew={create}
        back={create ? () => setCreate(false) : undefined}
      />
    );
  if (topicEdit)
    return <ContentEditor topic={topicEdit} close={() => setTopicEdit(null)} />;
  if (tab === "Manage") return <Management />;
  if (studentTopic) {
    const t = s.topics.find((t) => t.id === studentTopic)!;
    return (
      <View style={{ gap: 14 }}>
        <Button secondary onPress={() => setStudentTopic(null)}>
          Назад к прогрессу ученика
        </Button>
        <Txt size={26} weight="600">
          {t.title}
        </Txt>
        <VideoLessons topic={t} />
        {Boolean(t.lesson) && (
          <Card>
            <Txt>{t.lesson}</Txt>
            <Txt>{t.example}</Txt>
          </Card>
        )}
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <View>
        <Pill>
          {actor.role === "admin" ? "ADMINISTRATOR" : "TEACHER"} WORKSPACE
        </Pill>
        <Txt size={27} weight="600" style={{ marginTop: 10 }}>
          {tab === "Overview"
            ? "Кабинет учителя"
            : tab === "Assessments"
              ? "From paper to a clearer next step."
              : tab === "Students"
                ? "Группы и домашняя работа"
                : "Учебная программа"}
        </Txt>
        <Txt color={colors.muted}>
          {tab === "Overview"
            ? "Your classes, recent evidence and the next useful conversation."
            : "All changes connect to the same student learning records."}
        </Txt>
      </View>
      {tab === "Overview" && (
        <>
          <View style={styles.grid}>
            {[
              {
                title: "Assigned students",
                icon: "users" as const,
                value: students.length,
              },
              {
                title: "Published assessments",
                icon: "file-text" as const,
                value: (s.reports ?? []).filter((a) => a.status === "published")
                  .length,
              },
              {
                title: "Checks completed",
                icon: "check-circle" as const,
                value: s.attempts.length,
              },
            ].map((x) => (
              <Card key={x.title} style={{ flex: 1, minWidth: 145 }}>
                <View style={styles.row}>
                  <Icon name={x.icon} color={colors.green} />
                  <Txt size={25} weight="600">
                    {x.value}
                  </Txt>
                </View>
                <Txt color={colors.muted}>{x.title}</Txt>
              </Card>
            ))}
          </View>
          <View style={styles.grid}>
            <Card style={{ flex: 1, minWidth: 280 }}>
              <Txt size={21} weight="600">
                Your classes
              </Txt>
              {s.classes.map((c) => (
                <View key={c.id} style={{ gap: 8, paddingVertical: 10 }}>
                  <Txt weight="600">{c.name}</Txt>
                  <Txt color={colors.muted} size={13}>
                    {groupStudents(s, c.id).length} учеников · преподавателей:{" "}
                    {c.teacherIds.length}
                  </Txt>
                </View>
              ))}
              <Button onPress={() => setCreate(true)} icon="plus">
                Record an assessment
              </Button>
            </Card>
            <Card style={{ flex: 1, minWidth: 280 }}>
              <Txt size={21} weight="600">
                Useful teaching opportunities
              </Txt>
              <Txt size={13} color={colors.muted}>
                Common areas to revisit, without ranking students.
              </Txt>
              {s.topics
                .map((t) => ({
                  t,
                  count: students.filter((p) => {
                    const e = topicMastery(s, p.id, t.id);
                    return e.status === "Изучаю";
                  }).length,
                }))
                .filter((x) => x.count > 0)
                .map((x) => (
                  <Txt key={x.t.id} size={14}>
                    {x.t.title} · {x.count} learner(s) developing
                  </Txt>
                ))}
            </Card>
          </View>
          <SectionTitle title="Recent learning activity" />
          {s.attempts.length ? (
            s.attempts
              .slice()
              .reverse()
              .slice(0, 10)
              .map((a) => (
                <Card key={a.id}>
                  <Txt weight="600">
                    {s.profiles.find((p) => p.id === a.studentId)?.name}{" "}
                    completed {s.topics.find((t) => t.id === a.topicId)?.title}
                  </Txt>
                  <Txt size={13} color={colors.muted}>
                    {dateText(a.at)} · Independent check · visible in student
                    progress
                  </Txt>
                </Card>
              ))
          ) : (
            <Card>
              <Txt>Completed student checks will appear here.</Txt>
            </Card>
          )}
        </>
      )}
      {tab === "Students" && (
        <>
          <GroupPicker value={group?.id ?? ""} onChange={changeGroup} />
          {group && (
            <>
              <GroupCodeAndSchedule key={`code-${group.id}`} classId={group.id} />
              <GroupEnrollment key={`enroll-${group.id}`} classId={group.id} />
              <GroupHomework key={group.id} classId={group.id} />
              <StudentPicker
                key={group.id}
                classId={group.id}
                value={selectedStudent?.id ?? ""}
                onChange={(id) => {
                  setStudentId(id);
                  setDetail(false);
                }}
              />
              {selectedStudent && (
                <>
                  <ParentLinkEditor
                    key={selectedStudent.id}
                    studentId={selectedStudent.id}
                  />
                  <Button secondary onPress={() => setDetail(!detail)}>
                    {detail
                      ? "Скрыть прогресс ученика"
                      : "Посмотреть прогресс ученика"}
                  </Button>
                  {detail && (
                    <Progress
                      key={studentId}
                      studentId={studentId}
                      openTopic={setStudentTopic}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {tab === "Curriculum" && (
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          <Button
            secondary
            small
            icon="book"
            selected={showLessonLibrary === "course"}
            onPress={() => setShowLessonLibrary("course")}
          >
            Курс 5–11 классов
          </Button>
          <Button
            secondary
            small
            icon="book-open"
            selected={showLessonLibrary === "tests"}
            onPress={() => setShowLessonLibrary("tests")}
          >
            Уроки и тесты
          </Button>
          <Button
            secondary
            small
            icon="git-branch"
            selected={showLessonLibrary === "legacy"}
            onPress={() => setShowLessonLibrary("legacy")}
          >
            Дополнительные материалы
          </Button>
        </View>
      )}
      {tab === "Curriculum" &&
        (showLessonLibrary === "course" ? (
          <CourseLibrary />
        ) : showLessonLibrary === "tests" ? (
          <LessonLibrary />
        ) : videoTopic ? (
          (() => {
            const topic = s.topics.find((t) => t.id === videoTopic)!;
            return (
              <View style={{ gap: 16 }}>
                <Button secondary onPress={() => setVideoTopic(null)}>
                  Назад к темам
                </Button>
                <Txt size={26} weight="600">
                  {topic.title}
                </Txt>
                <VideoLessons key={topic.id} topic={topic} />
                {!!topic.lesson && (
                  <Card>
                    <Txt>{topic.lesson}</Txt>
                    {!!topic.example && <Txt>{topic.example}</Txt>}
                  </Card>
                )}
                {actor.role === "admin" && (
                  <Button
                    secondary
                    onPress={() =>
                      setTopicEdit(JSON.parse(JSON.stringify(topic)))
                    }
                  >
                    Редактировать материалы
                  </Button>
                )}
              </View>
            );
          })()
        ) : (
          <TopicTree openTopic={setVideoTopic} />
        ))}
    </View>
  );
}
function ContentEditor({ topic, close }: { topic: Topic; close: () => void }) {
  const { colors, styles } = useUITheme();
  const { dispatch, saving, state: s } = useLearning();
  const [t, setT] = useState(topic);
  const [error, setError] = useState("");
  const locked = s.attempts.some((a) => a.topicId === topic.id);
  return (
    <View style={{ gap: 14, maxWidth: 900 }}>
      <Button secondary onPress={close}>
        Back to curriculum
      </Button>
      <Txt size={26} weight="600">
        Edit {t.title}
      </Txt>
      <Card>
        <Field
          label="Topic title"
          value={t.title}
          onChangeText={(title) => setT({ ...t, title })}
        />
        <Field
          label="Learning objective"
          value={t.objective}
          onChangeText={(objective) => setT({ ...t, objective })}
        />
        <Field
          label="Lesson explanation"
          value={t.lesson}
          multiline
          onChangeText={(lesson) => setT({ ...t, lesson })}
        />
        <Field
          label="Worked example"
          value={t.example}
          multiline
          onChangeText={(example) => setT({ ...t, example })}
        />
      </Card>
      <Txt color={colors.muted}>
        {locked
          ? "These independent questions already have attempts and are locked to preserve scoring."
          : "Independent questions can be edited until the first student attempt."}
      </Txt>
      {!locked &&
        t.checks.map((q, i) => (
          <Card key={q.id}>
            <Field
              label={`Вопрос проверки ${i + 1}`}
              value={q.prompt}
              onChangeText={(prompt) =>
                setT({
                  ...t,
                  checks: t.checks.map((x) =>
                    x.id === q.id ? { ...x, prompt } : x,
                  ),
                })
              }
            />
            {q.choices.map((c, j) => (
              <Field
                key={j}
                label={`Вариант ${j + 1}${j === q.answer ? " · верный ответ" : ""}`}
                value={c}
                onChangeText={(value) =>
                  setT({
                    ...t,
                    checks: t.checks.map((x) =>
                      x.id === q.id
                        ? {
                            ...x,
                            choices: x.choices.map((v, k) =>
                              j === k ? value : v,
                            ),
                          }
                        : x,
                    ),
                  })
                }
              />
            ))}
            <Field
              label="Solution explanation"
              value={q.explanation}
              multiline
              onChangeText={(explanation) =>
                setT({
                  ...t,
                  checks: t.checks.map((x) =>
                    x.id === q.id ? { ...x, explanation } : x,
                  ),
                })
              }
            />
          </Card>
        ))}
      {Boolean(error) && <Txt color={colors.red}>{error}</Txt>}
      <Button
        disabled={saving}
        onPress={() =>
          void dispatch({ type: "saveTopic", topic: t })
            .then(close)
            .catch((e) => setError(errorMessage(e)))
        }
      >
        Save learning content
      </Button>
    </View>
  );
}
function Management() {
  const { colors, styles } = useUITheme();
  const { state: s, dispatch, saving, mode, actor } = useLearning();
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<Profile>({
    id: uid(),
    name: "",
    role: "student",
    active: true,
    code: "",
  });
  const [classroom, setClassroom] = useState<Classroom>({
    id: uid(),
    name: "",
    studentIds: [],
    teacherIds: [],
    joinCode: "",
    schedule: "",
  });
  const [erase, setErase] = useState<string | null>(null);
  async function act(command: Parameters<typeof dispatch>[0], message: string) {
    try {
      await dispatch(command);
      setNotice(message);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  return (
    <View style={{ gap: 16, maxWidth: 1000 }}>
      <Txt size={27} weight="600">
        Manage your learning community.
      </Txt>
      {Boolean(notice) && (
        <Card>
          <Txt accessibilityRole="alert">{notice}</Txt>
        </Card>
      )}
      <Card>
        <Txt size={21} weight="600">
          Accounts
        </Txt>
        {s.profiles.map((p) => (
          <View
            key={p.id}
            style={[styles.row, { justifyContent: "space-between" }]}
          >
            <View style={{ flex: 1 }}>
              <Txt weight="600">{p.name}</Txt>
              <Txt size={12} color={colors.muted}>
                {p.role} · {p.active ? "Active" : "Disabled"}
              </Txt>
            </View>
            {p.id !== actor.id && (
              <Button
                small
                secondary
                onPress={() =>
                  void act(
                    {
                      type: "saveProfile",
                      profile: { ...p, active: !p.active },
                    },
                    "Account access updated.",
                  )
                }
              >
                {p.active ? "Disable" : "Enable"}
              </Button>
            )}
          </View>
        ))}
        <Field
          label="New account display name"
          value={profile.name}
          onChangeText={(name) => setProfile({ ...profile, name })}
        />
        {mode === "supabase" && (
          <>
            <Txt size={13}>
              Create the authentication user in the Supabase dashboard first.
              Paste its UUID here; no passwords or privileged keys enter this
              console.
            </Txt>
            <Field
              label="Existing authentication user UUID"
              value={profile.id}
              onChangeText={(id) => setProfile({ ...profile, id })}
            />
          </>
        )}
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["student", "parent", "teacher", "admin"] as const).map((role) => (
            <Button
              key={role}
              small
              secondary={profile.role !== role}
              onPress={() => setProfile({ ...profile, role })}
            >
              {role}
            </Button>
          ))}
        </View>
        <Button
          disabled={saving || !profile.name.trim()}
          onPress={() =>
            void act(
              { type: "saveProfile", profile },
              "Account saved. Assign class membership below to grant access.",
            )
          }
        >
          Save account
        </Button>
      </Card>
      <Card>
        <Txt size={21} weight="600">
          Classes & membership
        </Txt>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {s.classes.map((c) => (
            <Button
              key={c.id}
              secondary={classroom.id !== c.id}
              small
              onPress={() => setClassroom(c)}
            >
              {c.name}
            </Button>
          ))}
          <Button
            secondary
            small
            onPress={() =>
              setClassroom({
                id: uid(),
                name: "",
                studentIds: [],
                teacherIds: [],
                joinCode: "",
                schedule: "",
              })
            }
          >
            New class
          </Button>
        </View>
        <Field
          label="Class name"
          value={classroom.name}
          onChangeText={(name) => setClassroom({ ...classroom, name })}
        />
        <Txt weight="600">Teachers</Txt>
        {s.profiles
          .filter((p) => p.role === "teacher")
          .map((p) => (
            <Choice
              multiple
              key={p.id}
              label={p.name}
              selected={classroom.teacherIds.includes(p.id)}
              onPress={() =>
                setClassroom({
                  ...classroom,
                  teacherIds: classroom.teacherIds.includes(p.id)
                    ? classroom.teacherIds.filter((id) => id !== p.id)
                    : [...classroom.teacherIds, p.id],
                })
              }
            />
          ))}
        <Txt weight="600">Students</Txt>
        {s.profiles
          .filter((p) => p.role === "student")
          .map((p) => (
            <Choice
              multiple
              key={p.id}
              label={p.name}
              selected={classroom.studentIds.includes(p.id)}
              onPress={() =>
                setClassroom({
                  ...classroom,
                  studentIds: classroom.studentIds.includes(p.id)
                    ? classroom.studentIds.filter((id) => id !== p.id)
                    : [...classroom.studentIds, p.id],
                })
              }
            />
          ))}
        <Button
          disabled={saving}
          onPress={() =>
            void act(
              { type: "saveClass", classroom },
              "Class membership saved.",
            )
          }
        >
          Save class
        </Button>
        {s.classes.some((c) => c.id === classroom.id) && (
          <GroupCodeAndSchedule key={classroom.id} classId={classroom.id} />
        )}
      </Card>
      <Card>
        <Txt size={21} weight="600">
          Deletion requests
        </Txt>
        <Txt size={13} color={colors.muted}>
          {mode === "demo"
            ? "Demo erasure removes this student and all related synthetic records."
            : "Review applicable retention obligations before erasing. This removes app records; an operator must also delete the authentication identity and address backups according to the retention policy."}
        </Txt>
        {s.deletionRequests.map((r) => (
          <View key={r.id} style={{ gap: 12 }}>
            <Txt>
              {s.profiles.find((p) => p.id === r.studentId)?.name} · requested{" "}
              {dateText(r.at)}
            </Txt>
            {erase === r.studentId ? (
              <>
                <Txt color={colors.red}>
                  Permanently erase these learning records? This cannot be
                  undone.
                </Txt>
                <View style={styles.row}>
                  <Button
                    disabled={saving}
                    onPress={() =>
                      void act(
                        { type: "eraseStudent", studentId: r.studentId },
                        "Student learning records erased.",
                      ).then(() => setErase(null))
                    }
                  >
                    Confirm erasure
                  </Button>
                  <Button secondary onPress={() => setErase(null)}>
                    Cancel
                  </Button>
                </View>
              </>
            ) : (
              <Button secondary onPress={() => setErase(r.studentId)}>
                Review erasure
              </Button>
            )}
          </View>
        ))}
        {!s.deletionRequests.length && (
          <Txt color={colors.muted}>No pending requests.</Txt>
        )}
      </Card>
    </View>
  );
}
