import {
  WorkspaceOverview,
  LearnerSnapshot,
} from "../components/ClarityWorkspace";
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
import { errorMessage } from "../i18n/errors";
import { TopicTree } from "../components/TopicTree";
import { VideoLessons } from "../components/VideoLessons";
import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { Topic, Profile, Classroom } from "../core/types";
import { uid } from "../core/ids";
import {
  Button,
  Card,
  Txt,
  Field,
  dateText,
  Choice,
  Disclosure,
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
  const [groupView, setGroupView] = useState(false);
  const [classId, setClassId] = useState("");
  const group = teachingGroups(s, actor).find((c) => c.id === classId);
  const [studentId, setStudentId] = useState("");
  const selectedStudent = groupStudents(s, group?.id ?? "").find(
    (p) => p.id === studentId,
  );
  function changeGroup(id: string) {
    setClassId(id);
    setStudentId("");
    setStudentTopic(null);
  }
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
      {tab === "Overview" && !groupView ? (
        <WorkspaceOverview
          newReport={() => setCreate(true)}
          openGroup={(id) => {
            changeGroup(id);
            setGroupView(true);
            onScreenChange();
          }}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {groupView && (
            <Button
              secondary
              small
              icon="arrow-left"
              onPress={() => setGroupView(false)}
            >
              К обзору
            </Button>
          )}
          <Txt size={32} weight="700">
            {tab === "Students" || groupView
              ? "Мои группы"
              : "Учебная программа"}
          </Txt>
        </View>
      )}
      {(tab === "Students" || groupView) && (
        <>
          <GroupPicker value={group?.id ?? ""} onChange={changeGroup} />
          {group && (
            <>
              <GroupCodeAndSchedule
                key={`code-${group.id}`}
                classId={group.id}
              />
              <GroupEnrollment key={`enroll-${group.id}`} classId={group.id} />
              <GroupHomework key={group.id} classId={group.id} />
              <StudentPicker
                key={group.id}
                classId={group.id}
                value={selectedStudent?.id ?? ""}
                onChange={(id) => {
                  setStudentId(id);
                }}
              />
              {selectedStudent && (
                <>
                  <LearnerSnapshot
                    studentId={selectedStudent.id}
                    details={
                      <Progress
                        key={studentId}
                        studentId={studentId}
                        openTopic={setStudentTopic}
                      />
                    }
                  />
                  <ParentLinkEditor
                    key={selectedStudent.id}
                    studentId={selectedStudent.id}
                  />
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
        Управление
      </Txt>
      {Boolean(notice) && (
        <Card>
          <Txt accessibilityRole="alert">{notice}</Txt>
        </Card>
      )}
      <Disclosure title="Аккаунты" icon="users">
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
        <Disclosure title="Добавить аккаунт вручную" icon="user-plus">
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
            {(["student", "parent", "teacher", "admin"] as const).map(
              (role) => (
                <Button
                  key={role}
                  small
                  secondary={profile.role !== role}
                  onPress={() => setProfile({ ...profile, role })}
                >
                  {role}
                </Button>
              ),
            )}
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
        </Disclosure>
      </Disclosure>
      <Disclosure title="Группы" icon="grid">
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
        <Txt weight="600">Ученики</Txt>
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
          disabled={saving || !classroom.name.trim()}
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
      </Disclosure>
      <Disclosure title="Запросы на удаление" icon="archive">
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
      </Disclosure>
    </View>
  );
}
